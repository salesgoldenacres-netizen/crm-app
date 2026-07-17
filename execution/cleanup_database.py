import os
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")
FIREBASE_SA_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

def get_firebase_admin():
    import firebase_admin
    from firebase_admin import credentials, firestore, auth
    if not FIREBASE_SA_JSON:
        sys.exit("Error: FIREBASE_SERVICE_ACCOUNT_JSON not set in .env")
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(Path(FIREBASE_SA_JSON)))
        firebase_admin.initialize_app(cred)
    return firestore.client(), auth

def main():
    db, auth = get_firebase_admin()
    
    print("--- Starting Database Cleanup & Verification ---")
    
    # 1. Get all Firestore users
    users_ref = db.collection("users")
    users = list(users_ref.stream())
    user_uids = set()
    user_emails = set()
    
    for u in users:
        data = u.to_dict()
        uid = data.get("uid")
        email = data.get("email")
        role = data.get("role")
        username = data.get("username")
        if uid:
            user_uids.add(uid)
            # Ensure they have a userRoles doc
            role_doc = db.collection("userRoles").document(uid).get()
            if not role_doc.exists:
                print(f"[FIX] User '{username}' (UID: {uid}) was missing a 'userRoles' document. Creating it with role '{role}'...")
                db.collection("userRoles").document(uid).set({"role": role or "telecaller"})
                print(f"  [SUCCESS] Created 'userRoles/{uid}'")
        if email:
            user_emails.add(email.lower())
            
    # 2. Find orphaned userRoles documents
    roles_ref = db.collection("userRoles")
    roles = list(roles_ref.stream())
    for r in roles:
        role_uid = r.id
        if role_uid not in user_uids:
            print(f"[FIX] Found orphaned 'userRoles' document with ID {role_uid}. Deleting...")
            roles_ref.document(role_uid).delete()
            print(f"  [SUCCESS] Deleted orphaned 'userRoles/{role_uid}'")
            
    # 3. Find orphaned Firebase Auth accounts
    page = auth.list_users()
    orphaned_auth_uids = []
    while page:
        for user in page.users:
            # If the email or UID is not in Firestore users, and it's not the user's main account
            # (Note: we already check against user_uids)
            if user.uid not in user_uids and user.email.lower() not in user_emails:
                print(f"[FIX] Found orphaned Auth User: UID: {user.uid}, Email: {user.email}. Deleting...")
                try:
                    auth.delete_user(user.uid)
                    print(f"  [SUCCESS] Deleted from Firebase Auth: {user.email}")
                except Exception as e:
                    print(f"  [ERROR] Failed to delete auth user {user.uid}: {e}")
        page = page.get_next_page()

    print("\n--- Cleanup Complete ---")

if __name__ == "__main__":
    main()
