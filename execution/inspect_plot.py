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
    proj = db.collection("projects").document("golden-acres").get()
    if proj.exists:
        data = proj.to_dict()
        plots = data.get("plots", [])
        for p in plots:
            if p.get("id") == "1781519090208-1":
                print("Plot Found:")
                print(p)
                return
        print("Plot not found in golden-acres")
    else:
        print("Project golden-acres not found")

if __name__ == "__main__":
    main()
