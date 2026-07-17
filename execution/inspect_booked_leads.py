"""
inspect_booked_leads.py
───────────────────────
Helper script to fetch booked/reserved leads, retrieve their corresponding
projects and plots from Firestore, and print out their pricing information.
"""

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
        sys.exit("[ERROR] FIREBASE_SERVICE_ACCOUNT_JSON not set in .env")

    sa_path = Path(FIREBASE_SA_JSON)
    if not sa_path.exists():
        sys.exit(f"[ERROR] Service account file not found: {sa_path}")

    if not firebase_admin._apps:
        cred = credentials.Certificate(str(sa_path))
        firebase_admin.initialize_app(cred)

    return firestore.client()

def main():
    db = get_firestore_client()
    
    print("Fetching leads with booked or reserved status...")
    leads = db.collection("leads").stream()
    
    booked_or_reserved = []
    for doc in leads:
        data = doc.to_dict()
        status = data.get("status")
        if status in ["booked", "reserved"]:
            booked_or_reserved.append((doc.id, data))
            
    print(f"Found {len(booked_or_reserved)} booked or reserved leads:")
    for doc_id, lead in booked_or_reserved:
        print(f"\nLead ID: {doc_id}")
        print(f"  Name: {lead.get('name')}")
        print(f"  Status: {lead.get('status')}")
        print(f"  Project ID: {lead.get('projectId')}")
        print(f"  Plot ID: {lead.get('plotId')}")
        
        project_id = lead.get('projectId')
        if project_id:
            proj_ref = db.collection("projects").document(project_id).get()
            if proj_ref.exists:
                proj_data = proj_ref.to_dict()
                print(f"  Project Name: {proj_data.get('name')}")
                plots = proj_data.get("plots", [])
                plot_id = lead.get('plotId')
                plot = None
                for p in plots:
                    if p.get("id") == plot_id or p.get("number") == plot_id:
                        plot = p
                        break
                if plot:
                    print(f"  Plot Found: ID/Number={plot_id}")
                    print(f"    Price Field: {plot.get('price')} (type: {type(plot.get('price'))})")
                    print(f"    Size Field: {plot.get('size')} (type: {type(plot.get('size'))})")
                    print(f"    Rate Field: {plot.get('rate')} (type: {type(plot.get('rate'))})")
                else:
                    print(f"  [WARNING] Plot ID {plot_id} NOT found in project's plots list!")
            else:
                print(f"  [WARNING] Project document {project_id} does not exist!")
        else:
            print("  [WARNING] Lead has no projectId specified. Searching all projects for plot...")
            all_projs = db.collection("projects").stream()
            found_plot = False
            for p_doc in all_projs:
                proj_data = p_doc.to_dict()
                plots = proj_data.get("plots", [])
                plot_id = lead.get('plotId')
                for p in plots:
                    if p.get("id") == plot_id or p.get("number") == plot_id:
                        print(f"  Plot Found in Project: {proj_data.get('name')} (ID: {p_doc.id})")
                        print(f"    Price Field: {p.get('price')} (type: {type(p.get('price'))})")
                        print(f"    Size Field: {p.get('size')} (type: {type(p.get('size'))})")
                        print(f"    Rate Field: {p.get('rate')} (type: {type(p.get('rate'))})")
                        found_plot = True
                        break
                if found_plot:
                    break
            if not found_plot:
                print(f"  [ERROR] Plot {lead.get('plotId')} was NOT found in any project!")

if __name__ == "__main__":
    main()
