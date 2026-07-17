"""
generate_weekly_report.py
─────────────────────────
Directive: directives/generate_weekly_report.md

Pulls Firestore call logs for all agents for a given week and writes a
performance summary to Google Sheets.

Usage:
    python execution/generate_weekly_report.py [--week-offset -1]

Args:
    --week-offset   Integer. 0 = current week, -1 = last week (default: -1)

Env vars required (see .env):
    FIREBASE_SERVICE_ACCOUNT_JSON   - path to Firebase Admin SDK service account JSON
    REPORT_SHEET_ID                 - Google Sheets spreadsheet ID for reports
"""

import os
import sys
import argparse
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

FIREBASE_SA_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
REPORT_SHEET_ID  = os.getenv("REPORT_SHEET_ID")


def week_range(offset: int):
    """Return (monday, sunday) date strings for the target week."""
    today   = datetime.now().date()
    monday  = today - timedelta(days=today.weekday()) + timedelta(weeks=offset)
    sunday  = monday + timedelta(days=6)
    return str(monday), str(sunday)


def get_firestore_client():
    import firebase_admin
    from firebase_admin import credentials, firestore

    if not FIREBASE_SA_JSON:
        sys.exit("[ERROR] FIREBASE_SERVICE_ACCOUNT_JSON not set in .env")
    sa_path = Path(FIREBASE_SA_JSON)
    if not sa_path.exists():
        sys.exit(f"[ERROR] Service account file not found: {sa_path}")
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(str(sa_path)))
    return firestore.client()


def compute_stats(db, week_start: str, week_end: str) -> list[dict]:
    """Aggregate per-agent stats for the given week date range."""
    stats: dict[str, dict] = {}

    for lead_doc in db.collection("leads").stream():
        lead = lead_doc.to_dict()
        for log in lead.get("callLogs", []):
            log_date = (log.get("date") or log.get("timestamp", ""))[:10]
            if not (week_start <= log_date <= week_end):
                continue
            agent = log.get("agent", "Unknown")
            if agent not in stats:
                stats[agent] = {
                    "Agent":         agent,
                    "Total Calls":   0,
                    "Connected":     0,
                    "Follow-Ups Set": 0,
                    "Bookings":      0,
                }
            s = stats[agent]
            s["Total Calls"] += 1
            if log.get("picked"):
                s["Connected"] += 1
            if log.get("followUpDate") or lead.get("followUpDate"):
                s["Follow-Ups Set"] += 1
            if log.get("status") in ("booked", "reserved"):
                s["Bookings"] += 1

    # Add connect rate
    for s in stats.values():
        total = s["Total Calls"]
        s["Connect %"] = f"{round(s['Connected'] / total * 100)}%" if total else "0%"

    return list(stats.values())


def get_sheets_service():
    """Return an authenticated Google Sheets service object using the service account."""
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    if not FIREBASE_SA_JSON:
        sys.exit("[ERROR] FIREBASE_SERVICE_ACCOUNT_JSON not set in .env")
    sa_path = Path(FIREBASE_SA_JSON)
    if not sa_path.exists():
        sys.exit(f"[ERROR] Service account file not found: {sa_path}")

    SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
    creds = service_account.Credentials.from_service_account_file(
        str(sa_path), scopes=SCOPES
    )
    return build("sheets", "v4", credentials=creds)


def write_report(service, sheet_id: str, tab_name: str, rows: list[dict]):
    sheets = service.spreadsheets()
    meta   = sheets.get(spreadsheetId=sheet_id).execute()
    tabs   = [s["properties"]["title"] for s in meta["sheets"]]
    if tab_name not in tabs:
        sheets.batchUpdate(
            spreadsheetId=sheet_id,
            body={"requests": [{"addSheet": {"properties": {"title": tab_name}}}]},
        ).execute()

    sheets.values().clear(spreadsheetId=sheet_id, range=f"'{tab_name}'").execute()

    if not rows:
        print("  [WARNING] No call data found for this week.")
        return

    headers = ["Agent", "Total Calls", "Connected", "Connect %", "Follow-Ups Set", "Bookings"]
    values  = [headers] + [[str(row.get(h, "")) for h in headers] for row in rows]

    sheets.values().update(
        spreadsheetId=sheet_id,
        range=f"'{tab_name}'!A1",
        valueInputOption="RAW",
        body={"values": values},
    ).execute()
    print(f"  [OK] {len(rows)} agents written to '{tab_name}'")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--week-offset", type=int, default=-1,
                        help="0 = current week, -1 = last week")
    args = parser.parse_args()

    if not REPORT_SHEET_ID:
        sys.exit("[ERROR] REPORT_SHEET_ID not set in .env")

    week_start, week_end = week_range(args.week_offset)
    tab_name = f"Week {week_start}"
    print(f"[Report] Reporting week: {week_start} -> {week_end}")

    print("[Firestore] Connecting...")
    db = get_firestore_client()

    print("[Firestore] Computing agent stats...")
    rows = compute_stats(db, week_start, week_end)
    print(f"   {len(rows)} agents found with calls this week.")

    print("[Sheets] Writing to Google Sheets...")
    service = get_sheets_service()
    write_report(service, REPORT_SHEET_ID, tab_name, rows)

    print(f"\n[DONE] Report ready -> https://docs.google.com/spreadsheets/d/{REPORT_SHEET_ID}")


if __name__ == "__main__":
    main()
