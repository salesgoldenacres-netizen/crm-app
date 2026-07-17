"""
import_leads_csv.py
───────────────────
Directive: directives/import_leads_csv.md

Imports a CSV of raw leads into Firebase Firestore.
Deduplicates by phone number. Writes a result summary to .tmp/.

Usage:
    python execution/import_leads_csv.py --csv .tmp/leads_import.csv --project-id <id> [--agent-id <id>]

Env vars required (see .env):
    FIREBASE_SERVICE_ACCOUNT_JSON   - path to Firebase Admin SDK service account JSON
"""

import os
import sys
import csv
import json
import uuid
import argparse
import re
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

FIREBASE_SA_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

REQUIRED_COLS = {"name", "phone"}
TMP_DIR       = Path(__file__).parent.parent / ".tmp"


def normalise_phone(raw: str) -> str | None:
    """Strip non-digits; return E.164 Indian number (e.g. +919876543210) or None."""
    if not raw:
        return None
    digits = re.sub(r"\D", "", raw)
    
    if len(digits) == 10:
        return f"+91{digits}"
    elif len(digits) == 11 and digits.startswith("0"):
        return f"+91{digits[1:]}"
    elif len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    elif len(digits) > 10:
        return f"+{digits}"
    return None


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


def load_existing_phones(db) -> set[str]:
    """Return the set of phone numbers already in Firestore."""
    phones = set()
    for doc in db.collection("leads").stream():
        p = normalise_phone(doc.to_dict().get("phone", ""))
        if p:
            phones.add(p)
    return phones


def batch_write(db, lead_docs: list[dict]):
    """Write lead_docs in batches of 500."""
    from google.cloud.firestore_v1 import WriteBatch
    i = 0
    while i < len(lead_docs):
        batch = db.batch()
        chunk = lead_docs[i:i + 500]
        for doc in chunk:
            ref = db.collection("leads").document(doc["id"])
            batch.set(ref, doc)
        batch.commit()
        i += 500


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv",        required=True, help="Path to input CSV file")
    parser.add_argument("--project-id", required=True, help="Firestore project ID to assign leads to")
    parser.add_argument("--agent-id",   default="",    help="Agent user ID to assign leads to (optional)")
    args = parser.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.exists():
        sys.exit(f"[ERROR] CSV file not found: {csv_path}")

    TMP_DIR.mkdir(exist_ok=True)

    print("[Firestore] Connecting...")
    db = get_firestore_client()

    # Verify project exists
    proj_ref = db.collection("projects").document(args.project_id).get()
    if not proj_ref.exists:
        sys.exit(f"[ERROR] Project '{args.project_id}' not found in Firestore. Aborting.")

    print("[Firestore] Loading existing phone numbers...")
    existing_phones = load_existing_phones(db)
    print(f"   {len(existing_phones)} existing leads found.")

    print(f"[CSV] Reading CSV: {csv_path}")
    rows_to_import = []
    errors = []

    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        cols   = {c.strip().lower() for c in (reader.fieldnames or [])}
        missing = REQUIRED_COLS - cols
        if missing:
            sys.exit(f"[ERROR] CSV is missing required columns: {missing}")

        now_iso = datetime.utcnow().isoformat()

        for i, row in enumerate(reader, start=2):  # row 1 = headers
            raw_phone = row.get("phone", "").strip()
            phone = normalise_phone(raw_phone)
            if not phone:
                errors.append({"row": i, "reason": "Invalid phone", "data": dict(row)})
                continue
            if phone in existing_phones:
                errors.append({"row": i, "reason": "Duplicate phone", "data": dict(row)})
                continue

            doc_id = str(uuid.uuid4())
            rows_to_import.append({
                "id":            doc_id,
                "name":          row.get("name", "").strip(),
                "phone":         phone,
                "email":         row.get("email", "").strip(),
                "leadSource":    row.get("lead_source", "CSV Import").strip(),
                "leadMedium":    row.get("lead_medium", "").strip(),
                "notes":         row.get("notes", "").strip(),
                "status":        "raw",
                "priority":      "warm",
                "projectId":     args.project_id,
                "assignedTo":    args.agent_id,
                "assignedToName": "",
                "createdAt":     now_iso,
                "createdBy":     "import_leads_csv.py",
                "callLogs": [{
                    "note":   "[Bulk Import] Lead imported via CSV.",
                    "status": "raw",
                    "agent":  "system",
                    "date":   now_iso[:10],
                }],
            })
            existing_phones.add(phone)  # prevent intra-batch dupes

    print(f"\n  Valid rows:     {len(rows_to_import)}")
    print(f"  Skipped rows:   {len(errors)}")

    if rows_to_import:
        print(f"[Firestore] Writing {len(rows_to_import)} leads to Firestore...")
        batch_write(db, rows_to_import)

    # Save results
    result = {
        "timestamp":  datetime.utcnow().isoformat(),
        "imported":   len(rows_to_import),
        "skipped":    len(errors),
        "errors":     errors,
    }
    result_path = TMP_DIR / f"import_result_{datetime.utcnow().strftime('%Y-%m-%d_%H%M%S')}.json"
    result_path.write_text(json.dumps(result, indent=2))

    if errors:
        err_path = TMP_DIR / "import_errors.csv"
        with open(err_path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["row", "reason", "data"])
            writer.writeheader()
            for e in errors:
                writer.writerow({"row": e["row"], "reason": e["reason"], "data": json.dumps(e["data"])})
        print(f"  [WARNING] Error log written to {err_path}")

    print(f"\n[DONE] — result saved to {result_path}")


if __name__ == "__main__":
    main()
