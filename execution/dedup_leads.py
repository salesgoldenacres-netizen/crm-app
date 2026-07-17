import os
import sys
import re
import argparse
import copy
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
PROJECT_ROOT = Path(__file__).parent.parent
load_dotenv(PROJECT_ROOT / ".env")

FIREBASE_SA_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

def get_firestore_client():
    import firebase_admin
    from firebase_admin import credentials, firestore
    
    if not FIREBASE_SA_JSON:
        sys.exit("Error: FIREBASE_SERVICE_ACCOUNT_JSON not set in .env")
        
    sa_path = Path(FIREBASE_SA_JSON)
    if not sa_path.is_absolute():
        sa_path = PROJECT_ROOT / sa_path
        
    if not sa_path.exists():
        sys.exit(f"Error: Service account file not found at {sa_path}")
        
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(sa_path))
        firebase_admin.initialize_app(cred)
        
    return firestore.client()

def normalize_phone(phone_str: str) -> str:
    if not phone_str:
        return ""
    # Strip everything except digits
    digits = re.sub(r"\D", "", phone_str)
    
    if len(digits) == 10:
        return f"+91{digits}"
    elif len(digits) == 11 and digits.startswith("0"):
        return f"+91{digits[1:]}"
    elif len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    elif len(digits) > 0:
        return f"+{digits}"
    return ""

def parse_iso_date(date_str):
    if not date_str:
        return datetime.min.replace(tzinfo=timezone.utc)
    try:
        # Strip trailing Z and parse
        clean_str = date_str.replace("Z", "+00:00")
        return datetime.fromisoformat(clean_str)
    except Exception:
        return datetime.min.replace(tzinfo=timezone.utc)

def main():
    parser = argparse.ArgumentParser(description="Firestore Lead Deduplication and Merging Tool.")
    parser.add_argument(
        "--action",
        choices=["dry-run", "merge"],
        default="dry-run",
        help="Action to perform (default: dry-run).",
    )
    parser.add_argument("--collections", default="leads", help="Firestore collection to de-duplicate.")
    parser.add_argument(
        "--confirm",
        default="",
        help='For --action merge, must be exactly "MERGE".',
    )
    parser.add_argument(
        "--backup-ack",
        action="store_true",
        help="Acknowledge a Firestore backup exists before merge.",
    )
    args = parser.parse_args()

    if args.action == "merge":
        if args.confirm != "MERGE":
            sys.exit(
                'Refusing merge without --confirm MERGE '
                "(and --backup-ack after backup_firestore.py)."
            )
        if not args.backup_ack:
            sys.exit(
                "Refusing merge without --backup-ack. "
                "Run: python execution/backup_firestore.py first."
            )

    db = get_firestore_client()
    leads_ref = db.collection(args.collections)
    
    print(f"Fetching leads from database... (action={args.action})")
    leads = list(leads_ref.stream())
    print(f"Retrieved {len(leads)} leads. Analyzing for duplicates...")
    
    # Group leads by normalized phone
    grouped_leads = {}
    for doc in leads:
        lead_id = doc.id
        data = doc.to_dict()
        phone = data.get("phone", "")
        normalized = normalize_phone(phone)
        
        if not normalized:
            continue
            
        if normalized not in grouped_leads:
            grouped_leads[normalized] = []
        grouped_leads[normalized].append({
            "id": lead_id,
            "data": data
        })
        
    # Filter duplicate groups (len > 1)
    duplicate_groups = {k: v for k, v in grouped_leads.items() if len(v) > 1}
    
    print(f"\nFound {len(duplicate_groups)} groups of duplicate phone numbers.")
    
    total_deletes = 0
    total_updates = 0
    
    batch = db.batch()
    batch_size = 0
    
    for phone, group in duplicate_groups.items():
        print(f"\n=======================================================")
        print(f"Duplicate Group for Phone: {phone} ({len(group)} leads)")
        
        # Heuristics score to select primary lead:
        # Score based on call logs length, notes presence, and completeness of fields
        scored_group = []
        for lead in group:
            data = lead["data"]
            call_logs = data.get("callLogs", [])
            notes = data.get("notes", "")
            
            score = len(call_logs) * 10
            if notes:
                score += 5
            if data.get("email"):
                score += 2
            if data.get("projectId"):
                score += 2
            if data.get("assignedTo"):
                score += 3
                
            created_at_str = data.get("createdAt") or data.get("createdTime") or ""
            created_dt = parse_iso_date(created_at_str)
            
            scored_group.append({
                "lead": lead,
                "score": score,
                "created_dt": created_dt
            })
            
        # Sort group by score descending, then by creation date ascending (oldest first)
        scored_group.sort(key=lambda x: (-x["score"], x["created_dt"]))
        
        primary_item = scored_group[0]["lead"]
        primary_id = primary_item["id"]
        primary_data = copy.deepcopy(primary_item["data"])
        
        print(f"Selected Primary: ID: {primary_id}, Name: '{primary_data.get('name')}', Score: {scored_group[0]['score']}")
        
        secondary_items = [x["lead"] for x in scored_group[1:]]
        
        # Merge data from secondary leads into primary
        merged_logs = list(primary_data.get("callLogs", []))
        merged_notes = primary_data.get("notes", "") or ""
        
        fields_filled = []
        
        for sec in secondary_items:
            sec_id = sec["id"]
            sec_data = sec["data"]
            print(f"  Merging Duplicate: ID: {sec_id}, Name: '{sec_data.get('name')}'")
            
            # Merge call logs
            sec_logs = sec_data.get("callLogs", [])
            merged_logs.extend(sec_logs)
            
            # Merge notes
            sec_notes = sec_data.get("notes", "")
            if sec_notes and sec_notes.strip() and sec_notes.strip() not in merged_notes:
                merged_notes = f"{merged_notes}\n[Merged Note from duplicate {sec_id}]: {sec_notes}".strip()
                
            # Fill missing fields in primary
            fillable_fields = [
                "email", "projectId", "plotId", "assignedTo", "assignedToName",
                "priority", "leadSource", "leadMedium", "createdBy", "leadNumber"
            ]
            for field in fillable_fields:
                if not primary_data.get(field) and sec_data.get(field):
                    primary_data[field] = sec_data[field]
                    fields_filled.append(f"{field}='{sec_data[field]}'")
                    
        # Deduplicate call logs based on date and note content
        unique_logs = []
        seen_logs = set()
        for log in merged_logs:
            log_key = (log.get("date", ""), log.get("note", ""), log.get("agent", ""))
            if log_key not in seen_logs:
                seen_logs.add(log_key)
                unique_logs.append(log)
                
        # Sort logs chronologically by date
        unique_logs.sort(key=lambda x: parse_iso_date(x.get("date", "")))
        
        # Update primary data
        primary_data["callLogs"] = unique_logs
        primary_data["notes"] = merged_notes
        primary_data["updatedAt"] = datetime.now(timezone.utc).isoformat()
        
        if fields_filled:
            print(f"  Fields filled on primary: {', '.join(fields_filled)}")
        print(f"  Call Logs Count: {len(primary_item.get('callLogs', []))} -> {len(unique_logs)} (merged)")
        
        if args.action == "merge":
            # Add updates/deletes to batch
            primary_ref = leads_ref.document(primary_id)
            batch.set(primary_ref, primary_data)
            batch_size += 1
            total_updates += 1
            
            for sec in secondary_items:
                sec_ref = leads_ref.document(sec["id"])
                batch.delete(sec_ref)
                batch_size += 1
                total_deletes += 1
                
            if batch_size >= 400:
                print("Committing batch of 400 database actions...")
                batch.commit()
                batch = db.batch()
                batch_size = 0
                
    if args.action == "merge" and batch_size > 0:
        print(f"Committing final batch of {batch_size} database actions...")
        batch.commit()
        
    print(f"\n=======================================================")
    print(f"Deduplication Analysis Summary ({args.action.upper()}):")
    print(f"Total Duplicate Groups Evaluated: {len(duplicate_groups)}")
    if args.action == "merge":
        print(f"Total Primary Leads Updated:      {total_updates}")
        print(f"Total Duplicate Leads Deleted:      {total_deletes}")
        print(f"[SUCCESS] Database consolidated successfully.")
    else:
        deletes_planned = sum(len(group) - 1 for group in duplicate_groups.values())
        print(f"Planned Primary Updates:          {len(duplicate_groups)}")
        print(f"Planned Duplicate Deletes:          {deletes_planned}")
        print(f"[INFO] Run with '--action merge' to consolidate these duplicates.")

if __name__ == "__main__":
    main()
