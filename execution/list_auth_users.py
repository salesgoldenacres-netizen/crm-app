import os
import sys
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

def main():
    initialize_firebase()
    from firebase_admin import auth
    
    print("--- Firebase Authentication Users ---")
    page = auth.list_users()
    auth_users = {}
    while page:
        for user in page.users:
            auth_users[user.uid] = user
            print(f"UID: {user.uid}")
            print(f"  Email: {user.email}")
            print(f"  Display Name: {user.display_name}")
            print(f"  Disabled: {user.disabled}")
            print(f"  Creation Timestamp: {user.user_metadata.creation_timestamp}")
            print("-" * 40)
        page = page.get_next_page()
        
    print(f"Total Auth Users: {len(auth_users)}")

if __name__ == "__main__":
    main()
