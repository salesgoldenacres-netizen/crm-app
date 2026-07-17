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
    print("Checking audit logs for user creation or registration of 'hacker'...")
    logs = db.collection("auditLogs").stream()
    for l in logs:
        data = l.to_dict()
        action = data.get("action", "")
        details = data.get("details", "")
        user = data.get("user", "")
        # print if it mentions hacker
        if "hacker" in str(action).lower() or "hacker" in str(details).lower() or "hacker" in str(user).lower():
            print(f"Log ID: {l.id}")
            for k, v in data.items():
                print(f"  {k}: {v}")

if __name__ == "__main__":
    main()
