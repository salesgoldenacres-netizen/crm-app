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
    found = False
    for p in projects:
        data = p.to_dict()
        plots = data.get("plots", [])
        for plot in plots:
            price = plot.get("price")
            rate = plot.get("rate")
            size = plot.get("size")
            if price or (rate and size):
                print(f"Project: {data.get('name')} (ID: {p.id})")
                print(f"  Plot ID: {plot.get('id')}, Number: {plot.get('number')}")
                print(f"  Price: {price}, Rate: {rate}, Size: {size}")
                found = True
    if not found:
        print("No priced plots found in any project!")

if __name__ == "__main__":
    main()
