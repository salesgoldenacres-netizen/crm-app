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
    projects = db.collection("projects").stream()
    for p in projects:
        data = p.to_dict()
        print(f"Project ID: {p.id}, Name: {data.get('name')}")
        plots = data.get("plots", [])
        print(f"  Total Plots: {len(plots)}")
        if plots:
            sample_plots = [plot.get("id") or plot.get("number") for plot in plots[:10]]
            print(f"  Sample Plot IDs/Numbers: {sample_plots}")

if __name__ == "__main__":
    main()
