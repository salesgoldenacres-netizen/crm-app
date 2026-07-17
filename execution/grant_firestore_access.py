"""
grant_firestore_access.py
─────────────────────────
Grants the agent service account the Firestore-specific IAM roles needed to
read/write data. Run once after generate_service_account.py.

The Firebase Admin role alone doesn't always include Cloud Firestore data access
at the IAM level — we also need roles/datastore.user or roles/firestore.serviceAgent.
"""

import os, sys, json, urllib.request, urllib.error
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

PROJECT   = "golden-acres-projects"
SA_EMAIL  = f"golden-acres-agent@{PROJECT}.iam.gserviceaccount.com"
ROLES     = [
    "roles/datastore.user",       # Firestore read/write
    "roles/firebase.admin",       # Firebase admin
    "roles/storage.admin",        # Storage
    "roles/serviceusage.serviceUsageConsumer",  # Call Google APIs (Sheets/Drive)
    "roles/editor",               # Let service account create resources
]


def get_token() -> str:
    candidates = [
        Path.home() / ".config" / "configstore" / "firebase-tools.json",
        Path(os.environ.get("APPDATA", "")) / "configstore" / "firebase-tools.json",
    ]
    for p in candidates:
        if p.exists():
            data = json.loads(p.read_text())
            return data.get("tokens", {}).get("access_token", "")
    return ""


def api(url, body=None, method=None, token=""):
    data   = json.dumps(body).encode() if body is not None else b"{}"
    method = method or ("POST" if body is not None else "GET")
    req    = urllib.request.Request(
        url, data=data,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method=method
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read()), None
    except urllib.error.HTTPError as e:
        return None, e.read().decode()


def main():
    token = get_token()
    if not token:
        sys.exit("[ERROR] No Firebase CLI token found. Run: firebase login")

    print(f"[IAM] Getting current IAM policy for project {PROJECT}...")
    policy, err = api(
        f"https://cloudresourcemanager.googleapis.com/v1/projects/{PROJECT}:getIamPolicy",
        body={}, token=token
    )
    if err:
        sys.exit(f"[ERROR] Could not read IAM policy: {err}")

    member = f"serviceAccount:{SA_EMAIL}"
    changed = False
    for role in ROLES:
        # Find or create binding
        for binding in policy.get("bindings", []):
            if binding.get("role") == role:
                if member not in binding.get("members", []):
                    binding["members"].append(member)
                    changed = True
                    print(f"  + Added {role}")
                else:
                    print(f"  = Already has {role}")
                break
        else:
            policy.setdefault("bindings", []).append({"role": role, "members": [member]})
            changed = True
            print(f"  + Added {role} (new binding)")

    if not changed:
        print("[OK] All required roles already granted. Nothing to do.")
        return

    print("[IAM] Writing updated policy...")
    result, err = api(
        f"https://cloudresourcemanager.googleapis.com/v1/projects/{PROJECT}:setIamPolicy",
        body={"policy": policy}, token=token
    )
    if err:
        sys.exit(f"[ERROR] Could not set IAM policy: {err}")

    print(f"\n[DONE] IAM roles granted to {SA_EMAIL}")
    print("       Wait ~60s for propagation, then re-run the smoke test.")


if __name__ == "__main__":
    main()
