"""
export_leads_to_sheets.py
─────────────────────────
Directive: directives/export_leads_to_sheets.md

Reads all leads from Firebase Firestore and writes them to a Google Sheet.

Usage:
    python execution/export_leads_to_sheets.py

Env vars required (see .env):
    FIREBASE_SERVICE_ACCOUNT_JSON   - path to Firebase Admin SDK service account JSON
    LEADS_SHEET_ID                  - Google Sheets spreadsheet ID to write to
"""

import os
import sys
import json
import argparse
from datetime import datetime
from pathlib import Path

# ── Env loading ────────────────────────────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

FIREBASE_SA_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
LEADS_SHEET_ID   = os.getenv("LEADS_SHEET_ID")
SHEET_TAB_NAME   = "Leads Export"


def get_firestore_client():
    """Initialise Firebase Admin SDK and return Firestore client."""
    import firebase_admin
    from firebase_admin import credentials, firestore

    if not FIREBASE_SA_JSON:
        sys.exit("[ERROR] FIREBASE_SERVICE_ACCOUNT_JSON not set in .env")

    sa_path = Path(FIREBASE_SA_JSON)
    if not sa_path.exists():
        sys.exit(f"[ERROR] Service account file not found: {sa_path}")

    if not firebase_admin._apps:
        cred = credentials.Certificate(str(sa_path))
        firebase_admin.initialize_app(cred)

    return firestore.client()


def fetch_all_leads(db) -> list[dict]:
    """Paginate through the leads collection and return flat dicts."""
    leads = []
    docs = db.collection("leads").stream()
    for doc in docs:
        data = doc.to_dict()
        call_logs = data.get("callLogs", [])
        leads.append({
            "Lead Number":   data.get("leadNumber", ""),
            "Name":          data.get("name", ""),
            "Phone":         data.get("phone", ""),
            "Email":         data.get("email", ""),
            "Status":        data.get("status", ""),
            "Priority":      data.get("priority", ""),
            "Project":       data.get("projectId", ""),
            "Plot":          data.get("plotId", ""),
            "Lead Source":   data.get("leadSource", ""),
            "Assigned To":   data.get("assignedToName", ""),
            "Follow-Up Date": data.get("followUpDate") or data.get("followUpOn", ""),
            "Call Count":    len(call_logs),
            "Last Note":     call_logs[-1].get("note", "") if call_logs else "",
            "Created At":    data.get("createdAt", ""),
            "Doc ID":        doc.id,
        })
    return leads


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


def write_to_sheet(service, sheet_id: str, tab_name: str, rows: list[dict]):
    """Clear and rewrite a tab with the given rows."""
    sheets = service.spreadsheets()

    # Ensure the tab exists; create if missing
    meta = sheets.get(spreadsheetId=sheet_id).execute()
    existing_tabs = [s["properties"]["title"] for s in meta["sheets"]]
    if tab_name not in existing_tabs:
        sheets.batchUpdate(
            spreadsheetId=sheet_id,
            body={"requests": [{"addSheet": {"properties": {"title": tab_name}}}]},
        ).execute()
        print(f"  [+] Created tab '{tab_name}'")

    # Clear existing content
    sheets.values().clear(
        spreadsheetId=sheet_id, range=f"'{tab_name}'"
    ).execute()

    if not rows:
        print("  [WARNING] No leads found — sheet cleared but left empty.")
        return

    headers = list(rows[0].keys())
    values  = [headers] + [[str(row.get(h, "")) for h in headers] for row in rows]

    sheets.values().update(
        spreadsheetId=sheet_id,
        range=f"'{tab_name}'!A1",
        valueInputOption="RAW",
        body={"values": values},
    ).execute()

    print(f"  [OK] {len(rows)} leads written to '{tab_name}'")


def main():
    if not LEADS_SHEET_ID:
        sys.exit("[ERROR] LEADS_SHEET_ID not set in .env")

    print("[Firestore] Connecting...")
    db = get_firestore_client()

    print("[Firestore] Fetching leads...")
    leads = fetch_all_leads(db)
    print(f"   Found {len(leads)} leads.")

    print("[Sheets] Connecting...")
    service = get_sheets_service()

    print(f"[Sheets] Writing to sheet {LEADS_SHEET_ID}...")
    write_to_sheet(service, LEADS_SHEET_ID, SHEET_TAB_NAME, leads)

    print(f"\n[DONE] — https://docs.google.com/spreadsheets/d/{LEADS_SHEET_ID}")


if __name__ == "__main__":
    main()
