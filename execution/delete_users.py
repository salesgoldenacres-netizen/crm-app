import os
import sys
import argparse
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")
FIREBASE_SA_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

def initialize_firebase():
    import firebase_admin
    from firebase_admin import credentials
    if not FIREBASE_SA_JSON:
        sys.exit("Error: FIREBASE_SERVICE_ACCOUNT_JSON not set in .env")
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(Path(FIREBASE_SA_JSON)))
        firebase_admin.initialize_app(cred)

def delete_user_by_username(username):
    from firebase_admin import firestore, auth
    db = firestore.client()
    
    print(f"\n--- Processing user: '{username}' ---")
    
    # 1. Find user in Firestore users collection
    users_ref = db.collection("users")
    query = users_ref.where("username", "==", username).stream()
    user_docs = list(query)
    
    if not user_docs:
        print(f"[INFO] No Firestore user document found with username '{username}'.")
        return False
        
    for doc in user_docs:
        doc_id = doc.id
        data = doc.to_dict()
        uid = data.get("uid")
        email = data.get("email")
        
        print(f"Found Firestore User Doc: {doc_id} (email: {email}, uid: {uid})")
        
        # 2. Delete from Firebase Auth if UID exists
        if uid:
            try:
                auth.delete_user(uid)
                print(f"  [SUCCESS] Deleted from Firebase Auth (UID: {uid})")
            except Exception as e:
                if "user-not-found" in str(e).lower():
                    print(f"  [INFO] User UID {uid} not found in Firebase Auth (already deleted).")
                else:
                    print(f"  [ERROR] Error deleting from Firebase Auth: {e}")
                    
            # 3. Delete from userRoles collection
            try:
                db.collection("userRoles").document(uid).delete()
                print(f"  [SUCCESS] Deleted document from 'userRoles' (ID: {uid})")
            except Exception as e:
                print(f"  [ERROR] Error deleting from userRoles: {e}")
        else:
            print("  [INFO] No UID associated with this user document.")
            
        # 4. Delete Firestore user document
        try:
            users_ref.document(doc_id).delete()
            print(f"  [SUCCESS] Deleted document from 'users' collection (ID: {doc_id})")
        except Exception as e:
            print(f"  [ERROR] Error deleting users document: {e}")
            
    return True

def main():
    parser = argparse.ArgumentParser(description="Delete users from Firebase Auth and Firestore by username.")
    parser.add_argument("usernames", nargs="+", help="Usernames to delete.")
    args = parser.parse_args()
    
    initialize_firebase()
    
    for username in args.usernames:
        delete_user_by_username(username)

if __name__ == "__main__":
    main()
