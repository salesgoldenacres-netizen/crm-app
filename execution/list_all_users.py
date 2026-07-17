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
        sys.exit("Error: FIREBASE_SERVICE_ACCOUNT_JSON not set in .env")
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(Path(FIREBASE_SA_JSON)))
        firebase_admin.initialize_app(cred)
    return firestore.client()

def main():
    db = get_firestore_client()
    
    print("--- Firestore 'users' Collection ---")
    users = db.collection("users").stream()
    user_count = 0
    for doc in users:
        user_count += 1
        data = doc.to_dict()
        print(f"Doc ID: {doc.id}")
        for k, v in sorted(data.items()):
            print(f"  {k}: {v}")
        print("-" * 40)
    print(f"Total Users: {user_count}\n")
    
    print("--- Firestore 'userRoles' Collection ---")
    roles = db.collection("userRoles").stream()
    role_count = 0
    for doc in roles:
        role_count += 1
        data = doc.to_dict()
        print(f"Doc ID: {doc.id}")
        for k, v in sorted(data.items()):
            print(f"  {k}: {v}")
        print("-" * 40)
    print(f"Total Roles: {role_count}")

if __name__ == "__main__":
    main()
