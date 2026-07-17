import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv

ENV_PATH = Path(__file__).parent.parent / ".env"
load_dotenv(ENV_PATH)

PROJECT_ID = "golden-acres-projects"
SA_EMAIL = f"golden-acres-agent@{PROJECT_ID}.iam.gserviceaccount.com"
ROLES_TO_ADD = [
    "roles/datastore.user",              # Firestore read/write
    "roles/firebase.admin",              # Firebase admin
    "roles/serviceusage.serviceUsageConsumer",  # Call Google APIs (Sheets/Drive)
    "roles/editor"                       # Let service account create resources
]

def get_firebase_token() -> str:
    candidates = [
        Path.home() / ".config" / "configstore" / "firebase-tools.json",
        Path(os.environ.get("APPDATA", "")) / "configstore" / "firebase-tools.json",
    ]
    for p in candidates:
        if p.exists():
            data = json.loads(p.read_text())
            return data.get("tokens", {}).get("access_token", "")
    return ""

def main():
    token = get_firebase_token()
    if not token:
        print("[-] No Firebase token found. Please login via Firebase CLI.")
        sys.exit(1)
        
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    import googleapiclient.errors
    
    creds = Credentials(token=token)
    crm = build("cloudresourcemanager", "v1", credentials=creds)
    
    print(f"[*] Fetching current IAM policy for project: {PROJECT_ID}...")
    try:
        policy = crm.projects().getIamPolicy(resource=PROJECT_ID, body={}).execute()
    except googleapiclient.errors.HttpError as e:
        print(f"[-] Failed to get IAM policy: {e}")
        print(f"Details: {e.content.decode('utf-8')}")
        sys.exit(1)
        
    print("[*] Current policy fetched successfully.")
    
    member = f"serviceAccount:{SA_EMAIL}"
    changed = False
    
    bindings = policy.get("bindings", [])
    
    for role in ROLES_TO_ADD:
        found = False
        for b in bindings:
            if b.get("role") == role:
                found = True
                if member not in b.get("members", []):
                    b.setdefault("members", []).append(member)
                    changed = True
                    print(f"[+] Added {member} to role {role}")
                else:
                    print(f"[=] {member} already has role {role}")
                break
        if not found:
            bindings.append({
                "role": role,
                "members": [member]
            })
            changed = True
            print(f"[+] Created role {role} and added {member}")
            
    if not changed:
        print("[*] No changes needed. Service account already has all required roles.")
        return
        
    policy["bindings"] = bindings
    
    print("[*] Updating IAM policy...")
    try:
        updated_policy = crm.projects().setIamPolicy(resource=PROJECT_ID, body={"policy": policy}).execute()
        print("[SUCCESS] IAM policy updated successfully!")
    except googleapiclient.errors.HttpError as e:
        print(f"[-] Failed to set IAM policy: {e}")
        print(f"Details: {e.content.decode('utf-8')}")
        sys.exit(1)

if __name__ == "__main__":
    main()
