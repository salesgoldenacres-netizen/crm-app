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
    db = get_firestore_client()
    users = db.collection("users").stream()
    found = False
    for u in users:
        data = u.to_dict()
        if data.get("username") == "hacker" or data.get("email") == "hacker@goldenacres.app" or u.id == "hacker":
            print("User Found:")
            print(f"Doc ID: {u.id}")
            print(f"Firestore Create Time: {u.create_time}")
            print(f"Firestore Update Time: {u.update_time}")
            for k, v in data.items():
                print(f"  {k}: {v}")
            found = True
            
    if not found:
        print("User 'hacker' not found in users collection.")

if __name__ == "__main__":
    main()
