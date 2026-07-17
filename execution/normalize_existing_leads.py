import os
import sys
import re
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")
FIREBASE_SA_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

def get_firestore_client():
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
    return firestore.client(), firestore

def main():
    print("Connecting to Firestore...")
    db, firestore = get_firestore_client()
    
    leads_ref = db.collection("leads")
    print("Fetching leads from database...")
    leads = list(leads_ref.stream())
    print(f"Retrieved {len(leads)} leads. Analyzing phone numbers...")
    
    count_already_clean = 0
    count_updated = 0
    count_empty = 0
    
    batch = db.batch()
    batch_size = 0
    
    for doc in leads:
        lead_id = doc.id
        data = doc.to_dict()
        original_phone = data.get("phone", "")
        
        if not original_phone:
            count_empty += 1
            continue
            
        normalized_phone = normalize_phone(original_phone)
        
        if original_phone == normalized_phone:
            count_already_clean += 1
        else:
            print(f"[NORMALIZE] Lead ID {lead_id} ({data.get('name', 'Unknown')}): '{original_phone}' -> '{normalized_phone}'")
            doc_ref = leads_ref.document(lead_id)
            batch.update(doc_ref, {"phone": normalized_phone, "updatedAt": firestore.SERVER_TIMESTAMP})
            count_updated += 1
            batch_size += 1
            
            # Commit batch when it reaches 500 operations
            if batch_size >= 500:
                print("Committing batch of 500 updates...")
                batch.commit()
                batch = db.batch()
                batch_size = 0

    # Commit any remaining updates
    if batch_size > 0:
        print(f"Committing final batch of {batch_size} updates...")
        batch.commit()
        
    print("\n--- Migration Complete ---")
    print(f"Total Leads Checked:  {len(leads)}")
    print(f"Already Normalized:   {count_already_clean}")
    print(f"Normalized/Updated:   {count_updated}")
    print(f"Empty Phone Numbers:  {count_empty}")

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

if __name__ == "__main__":
    main()
