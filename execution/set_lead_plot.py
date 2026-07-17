import os
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")
FIREBASE_SA_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

def get_firestore_client():
    import firebase_admin
    from firebase_admin import credentials, firestore
    if not FIREBASE_SA_JSON:
        sys.exit("SA JSON not set")
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(Path(FIREBASE_SA_JSON)))
        firebase_admin.initialize_app(cred)
    return firestore.client()

def main():
    from firebase_admin import firestore
    db = get_firestore_client()
    lead_id = "1780368705302-478"
    lead_ref = db.collection("leads").document(lead_id)
    if lead_ref.get().exists:
        print(f"Updating lead {lead_id}...")
        lead_ref.update({
            "projectId": "sri-balaji-nagar",
            "plotId": "1",
            "updatedAt": firestore.SERVER_TIMESTAMP
        })
        print("Update successful!")
    else:
        print(f"Lead {lead_id} not found!")

if __name__ == "__main__":
    main()
