import os
import sys
import csv
import urllib.parse
import argparse
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
PROJECT_ROOT = Path(__file__).parent.parent
load_dotenv(PROJECT_ROOT / ".env")

FIREBASE_SA_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

TEMPLATES = {
    "intro": "Hello {name}, thank you for showing interest in {project}. We would love to share the layout plan and pricing details. Please let us know a convenient time to call. Regards, Golden Acres.",
    "visit": "Hello {name}, this is to confirm your scheduled site visit to {project}. We have arranged a site executive to guide you. Regards, Golden Acres.",
    "followup": "Hello {name}, we tried calling you earlier regarding your interest in {project} plots. Please let us know when we can connect. Regards, Golden Acres."
}

def get_firestore_client():
    import firebase_admin
    from firebase_admin import credentials, firestore
    
    if not FIREBASE_SA_JSON:
        sys.exit("Error: FIREBASE_SERVICE_ACCOUNT_JSON not set in .env")
        
    sa_path = Path(FIREBASE_SA_JSON)
    if not sa_path.is_absolute():
        sa_path = PROJECT_ROOT / sa_path
        
    if not sa_path.exists():
        sys.exit(f"Error: Service account file not found at {sa_path}")
        
    if not firebase_admin._apps:
        cred = credentials.Certificate(str(sa_path))
        firebase_admin.initialize_app(cred)
        
    return firestore.client()

def clean_phone_for_wa(phone_str):
    if not phone_str:
        return ""
    # Strip spaces, hyphens, parentheses, but keep leading + if present
    cleaned = "".join(c for c in phone_str if c.isdigit() or c == '+')
    if cleaned.startswith("+"):
        return cleaned
    # Default to India (+91) if country code is missing and it's 10 digits
    if len(cleaned) == 10:
        return f"+91{cleaned}"
    return f"+{cleaned}"

def main():
    parser = argparse.ArgumentParser(description="Firestore Bulk Outreach Link Generator.")
    parser.add_argument("--project", help="Filter leads by Project ID (e.g. golden-acres).")
    parser.add_argument("--status", help="Filter leads by Status (e.g. interested).")
    parser.add_argument("--priority", help="Filter leads by Priority (hot, warm, cold).")
    parser.add_argument("--template", choices=["intro", "visit", "followup"], default="intro", help="Message template to render.")
    parser.add_argument("--output", help="Output path for the generated CSV campaign file.")
    args = parser.parse_args()
    
    db = get_firestore_client()
    
    # 1. Fetch Projects to map IDs to Names
    print("Fetching projects mapping...")
    projects_ref = db.collection("projects")
    projects_list = list(projects_ref.stream())
    projects_map = {}
    for p in projects_list:
        projects_map[p.id] = p.to_dict().get("name", p.id)
        
    # 2. Fetch Leads
    print("Fetching leads from database...")
    leads_ref = db.collection("leads")
    leads_list = list(leads_ref.stream())
    
    print(f"Retrieved {len(leads_list)} leads. Filtering targets...")
    
    # 3. Filter Leads
    target_leads = []
    for doc in leads_list:
        data = doc.to_dict()
        
        # Apply project filter
        if args.project and data.get("projectId") != args.project:
            continue
            
        # Apply status filter
        if args.status and data.get("status") != args.status:
            continue
            
        # Apply priority filter
        if args.priority and data.get("priority") != args.priority:
            continue
            
        # Exclude leads without phone numbers
        if not data.get("phone"):
            continue
            
        target_leads.append({
            "id": doc.id,
            "data": data
        })
        
    print(f"Found {len(target_leads)} leads matching campaign filters.")
    
    if len(target_leads) == 0:
        print("No leads matched the filters. Campaign generation skipped.")
        return
        
    # 4. Generate CSV
    if not args.output:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = PROJECT_ROOT / ".tmp" / f"outreach_campaign_{timestamp}.csv"
    else:
        output_file = Path(args.output)
        
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    template_str = TEMPLATES[args.template]
    
    print(f"Rendering template: '{args.template}'")
    
    records_written = 0
    with open(output_file, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        # Header Row
        writer.writerow(["Lead ID", "Lead Number", "Name", "Phone", "Project Name", "Message", "WhatsApp Web Link"])
        
        for lead in target_leads:
            data = lead["data"]
            name = data.get("name", "Customer")
            proj_id = data.get("projectId", "")
            proj_name = projects_map.get(proj_id, proj_id or "Golden Acres Projects")
            phone = clean_phone_for_wa(data.get("phone", ""))
            
            # Format message
            message = template_str.format(name=name, project=proj_name)
            
            # Generate WA Web link
            encoded_text = urllib.parse.quote(message)
            wa_link = f"https://web.whatsapp.com/send?phone={phone}&text={encoded_text}"
            
            writer.writerow([
                lead["id"],
                data.get("leadNumber", "—"),
                name,
                phone,
                proj_name,
                message,
                wa_link
            ])
            records_written += 1
            
    print(f"\n[SUCCESS] Campaign file generated successfully!")
    print(f"  Records Exported: {records_written}")
    print(f"  Campaign CSV Path: {output_file.absolute()}")

if __name__ == "__main__":
    main()
