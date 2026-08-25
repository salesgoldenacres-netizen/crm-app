"""
sync_google_sheets_bookings.py
─────────────────────────────────────────
Ingests live plot booking data from Google Sheets into Firebase Firestore collections:
  - project_plots
  - deals
  - leads
  - system_settings/google_sheets_sync

Spreadsheet ID: 1x6lYoLss9CjuZoGJkX9tlPp_i2yO8Ia0FJxo7yivgv4
GID: 1890011657

Usage:
    python execution/sync_google_sheets_bookings.py [--sheet-id <id>] [--gid <gid>]
"""

import os
import sys
import csv
import io
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from firebase_admin import credentials, firestore

FIREBASE_SA_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
DEFAULT_SHEET_ID = "1x6lYoLss9CjuZoGJkX9tlPp_i2yO8Ia0FJxo7yivgv4"
DEFAULT_GID = "1890011657"


def get_firestore_client():
    """Initialize Firebase Admin SDK and return Firestore client."""
    import firebase_admin
    from firebase_admin import credentials, firestore

    if not FIREBASE_SA_JSON:
        sys.exit("[ERROR] FIREBASE_SERVICE_ACCOUNT_JSON environment variable not set in .env")

    sa_path = Path(FIREBASE_SA_JSON)
    if not sa_path.exists():
        sys.exit(f"[ERROR] Service account file not found: {sa_path}")

    if not firebase_admin._apps:
        cred = credentials.Certificate(str(sa_path))
        firebase_admin.initialize_app(cred)

    return firestore.client()


def parse_clean_num(val: str) -> float:
    """Strip currency symbols, commas, and whitespace into numeric float."""
    if not val:
        return 0.0
    cleaned = re.sub(r"[^\d.]", "", val)
    try:
        return float(cleaned) if cleaned else 0.0
    except ValueError:
        return 0.0


def fetch_sheet_rows(sheet_id: str, gid: str) -> list[dict]:
    """Fetch CSV data from public Google Sheet URL and parse into list of dicts."""
    url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})

    try:
        with urllib.request.urlopen(req) as response:
            content = response.read().decode("utf-8")
            reader = csv.reader(io.StringIO(content))
            rows = list(reader)
            if not rows:
                return []

            headers = [h.strip() for h in rows[0]]
            data_rows = []
            for row in rows[1:]:
                if not row or not any(row):
                    continue
                row_dict = {}
                for idx, header in enumerate(headers):
                    val = row[idx].strip() if idx < len(row) else ""
                    row_dict[header] = val
                data_rows.append(row_dict)

            return data_rows
    except Exception as e:
        print(f"[ERROR] Failed to fetch CSV from Google Sheets: {e}")
        return []


def sync_bookings_to_firestore(db, rows: list[dict]):
    """Digests Google Sheets rows into project_plots, deals, and leads collections."""
    plots_count = 0
    booked_count = 0
    deals_count = 0
    leads_count = 0
    batch = db.batch()
    batch_op_count = 0

    print(f"[*] Digesting {len(rows)} plot booking records into Firestore...")

    for row in rows:
        raw_plot_no = row.get("Plot.no", "").strip()
        if not raw_plot_no:
            continue

        plot_no = raw_plot_no
        sqft = parse_clean_num(row.get("Sq.Ft", ""))
        price_sqft = parse_clean_num(row.get("Price", ""))
        total_price = parse_clean_num(row.get("Total Price", ""))
        discount = parse_clean_num(row.get("Discount", ""))
        final_price = parse_clean_num(row.get("Final Price", "")) or total_price
        raw_status = row.get("Status", "").strip().capitalize() or "Vacant"

        # Normalize status
        if "book" in raw_status.lower():
            status = "Booked"
        elif "reserv" in raw_status.lower() or "hold" in raw_status.lower():
            status = "Reserved"
        elif "blocked" in raw_status.lower():
            status = "Blocked"
        else:
            status = "Vacant"

        sales_rep = row.get("Sales", "").strip()
        telecaller = row.get("Tellecaller", "").strip()
        sales_mgr = row.get("S.M", "").strip()
        customer_name = row.get("customer name ", "").strip() or row.get("customer name", "").strip()
        advance_date = row.get("Advance Paid Date", "").strip()
        advance_amount = parse_clean_num(row.get("Advance Amount", ""))
        payment_mode = row.get("Mode of Payment", "").strip()

        plot_id = f"plot_{plot_no}"
        plot_doc_ref = db.collection("project_plots").document(plot_id)

        plot_payload = {
            "plotNumber": plot_no,
            "sqft": sqft,
            "pricePerSqFt": price_sqft,
            "totalPrice": total_price,
            "discount": discount,
            "finalPrice": final_price,
            "status": status,
            "salesRep": sales_rep,
            "telecaller": telecaller,
            "salesManager": sales_mgr,
            "customerName": customer_name,
            "advancePaidDate": advance_date,
            "advanceAmount": advance_amount,
            "paymentMode": payment_mode,
            "lastSyncedAt": firestore.SERVER_TIMESTAMP,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }

        batch.set(plot_doc_ref, plot_payload, merge=True)
        batch_op_count += 1
        plots_count += 1

        if status in ["Booked", "Reserved"] and customer_name:
            booked_count += 1

            # Sync to deals collection
            deal_id = f"deal_sheet_plot_{plot_no}"
            deal_ref = db.collection("deals").document(deal_id)
            deal_payload = {
                "title": f"Plot #{plot_no} - {customer_name}",
                "leadName": customer_name,
                "phone": "",
                "plotNumber": plot_no,
                "value": final_price or total_price,
                "stage": "closed_won" if status == "Booked" else "plot_reserved",
                "assignedToName": sales_rep or sales_mgr or "Unassigned",
                "expectedCloseDate": advance_date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "advanceAmount": advance_amount,
                "paymentMode": payment_mode,
                "notes": f"Synced from Google Sheets GID 1890011657. Telecaller: {telecaller}",
                "updatedAt": datetime.now(timezone.utc).isoformat(),
            }
            batch.set(deal_ref, deal_payload, merge=True)
            batch_op_count += 1
            deals_count += 1

            # Sync to leads collection
            lead_id = f"sheet_lead_plot_{plot_no}"
            lead_ref = db.collection("leads").document(lead_id)
            lead_payload = {
                "name": customer_name,
                "status": "Booked" if status == "Booked" else "Interested",
                "plotNumber": plot_no,
                "assignedToName": sales_rep or "Unassigned",
                "telecallerName": telecaller,
                "advancePaidDate": advance_date,
                "advanceAmount": advance_amount,
                "paymentMode": payment_mode,
                "source": "Google Sheets Import",
                "updatedAt": datetime.now(timezone.utc).isoformat(),
            }
            batch.set(lead_ref, lead_payload, merge=True)
            batch_op_count += 1
            leads_count += 1

        if batch_op_count >= 400:
            batch.commit()
            batch = db.batch()
            batch_op_count = 0

    if batch_op_count > 0:
        batch.commit()

    # Record sync telemetry
    sync_meta_ref = db.collection("system_settings").document("google_sheets_sync")
    sync_meta_ref.set({
        "lastSyncedAt": datetime.now(timezone.utc).isoformat(),
        "totalRowsProcessed": len(rows),
        "plotsSynced": plots_count,
        "bookedPlotsCount": booked_count,
        "dealsSynced": deals_count,
        "leadsSynced": leads_count,
        "spreadsheetId": DEFAULT_SHEET_ID,
        "gid": DEFAULT_GID,
        "status": "success"
    }, merge=True)

    print("\n=============================================")
    print("Google Sheets Sync Completed Successfully!")
    print(f"Total Rows Processed : {len(rows)}")
    print(f"Plots Synced         : {plots_count}")
    print(f"Booked Plots         : {booked_count}")
    print(f"Deals Synced         : {deals_count}")
    print(f"Leads Synced         : {leads_count}")
    print("=============================================\n")


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Sync Google Sheets booking data into Firestore.")
    parser.add_argument("--sheet-id", default=DEFAULT_SHEET_ID, help="Google Sheets ID")
    parser.add_argument("--gid", default=DEFAULT_GID, help="Sheet Tab GID")
    args = parser.parse_args()

    db = get_firestore_client()
    rows = fetch_sheet_rows(args.sheet_id, args.gid)

    if not rows:
        print("[WARN] No rows returned from Google Sheets.")
        sys.exit(1)

    sync_bookings_to_firestore(db, rows)


if __name__ == "__main__":
    main()
