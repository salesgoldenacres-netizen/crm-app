"""
generate_service_account.py
───────────────────────────
Bootstrap script — runs once to create a Firebase Admin SDK service account key
using the Firebase CLI (which must already be authenticated).

Usage:
    python execution/generate_service_account.py

What it does:
1. Uses `firebase-admin` with the Firebase CLI's cached credentials (Application Default Credentials)
2. OR falls back to the REST API via the Firebase CLI token to create a service account key
3. Writes the key to: credentials/firebase-service-account.json
4. Updates .env to point at it
"""

import os
import sys
import json
import subprocess
import tempfile
from pathlib import Path

ROOT      = Path(__file__).parent.parent
CREDS_DIR = ROOT / "credentials"
SA_PATH   = CREDS_DIR / "firebase-service-account.json"
ENV_PATH  = ROOT / ".env"
PROJECT   = "golden-acres-projects"
SA_NAME   = "golden-acres-agent"
SA_EMAIL  = f"{SA_NAME}@{PROJECT}.iam.gserviceaccount.com"


def run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, **kwargs)


def get_cli_token() -> str:
    """Extract the Firebase CLI access token from its cached config."""
    import platform, json
    config_dir = Path(os.environ.get("APPDATA", "")) / ".config" / "configstore"
    candidates = [
        Path.home() / ".config" / "configstore" / "firebase-tools.json",
        Path(os.environ.get("APPDATA", "")) / "Roaming" / "configstore" / "firebase-tools.json",
        Path(os.environ.get("APPDATA", "")) / "configstore" / "firebase-tools.json",
    ]
    for p in candidates:
        if p.exists():
            data = json.loads(p.read_text())
            tokens = data.get("tokens", {})
            return tokens.get("access_token", "")
    return ""


def create_sa_via_rest(access_token: str) -> dict | None:
    """Create service account via IAM REST API using the Firebase CLI token."""
    import urllib.request, urllib.error

    # Step 1: Create the service account
    create_url = f"https://iam.googleapis.com/v1/projects/{PROJECT}/serviceAccounts"
    body = json.dumps({
        "accountId": SA_NAME,
        "serviceAccount": {
            "displayName": "Golden Acres Agent (auto-created)"
        }
    }).encode()

    req = urllib.request.Request(
        create_url, data=body,
        headers={"Authorization": f"Bearer {access_token}",
                 "Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as r:
            sa_data = json.loads(r.read())
            print(f"  [OK] Service account created: {sa_data.get('email')}")
    except urllib.error.HTTPError as e:
        body_text = e.read().decode()
        if "already exists" in body_text:
            print(f"  [INFO] Service account already exists: {SA_EMAIL}")
        else:
            print(f"  [ERROR] Failed to create service account: {e.code} {body_text}")
            return None

    # Step 2: Grant Firebase Admin role
    iam_url = f"https://cloudresourcemanager.googleapis.com/v1/projects/{PROJECT}:getIamPolicy"
    req = urllib.request.Request(
        iam_url, data=b"{}",
        headers={"Authorization": f"Bearer {access_token}",
                 "Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as r:
            policy = json.loads(r.read())
    except Exception as e:
        print(f"  [WARNING] Could not read IAM policy: {e}")
        policy = {"bindings": [], "etag": "", "version": 1}

    member = f"serviceAccount:{SA_EMAIL}"
    role   = "roles/firebase.admin"
    for binding in policy.get("bindings", []):
        if binding.get("role") == role:
            if member not in binding.get("members", []):
                binding["members"].append(member)
            break
    else:
        policy.setdefault("bindings", []).append({"role": role, "members": [member]})

    set_url = f"https://cloudresourcemanager.googleapis.com/v1/projects/{PROJECT}:setIamPolicy"
    body = json.dumps({"policy": policy}).encode()
    req = urllib.request.Request(
        set_url, data=body,
        headers={"Authorization": f"Bearer {access_token}",
                 "Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as r:
            print(f"  [OK] IAM role '{role}' granted to {SA_EMAIL}")
    except Exception as e:
        print(f"  [WARNING] IAM binding failed (may already be set): {e}")

    # Step 3: Create a key for the service account
    key_url = f"https://iam.googleapis.com/v1/projects/{PROJECT}/serviceAccounts/{SA_EMAIL}/keys"
    req = urllib.request.Request(
        key_url, data=b"{}",
        headers={"Authorization": f"Bearer {access_token}",
                 "Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as r:
            key_data = json.loads(r.read())
            import base64
            raw_json = base64.b64decode(key_data["privateKeyData"]).decode()
            return json.loads(raw_json)
    except Exception as e:
        print(f"  [ERROR] Key creation failed: {e}")
        return None


def update_env(sa_rel_path: str):
    """Write FIREBASE_SERVICE_ACCOUNT_JSON into .env."""
    env_text = ENV_PATH.read_text() if ENV_PATH.exists() else ""
    lines = env_text.splitlines()
    new_lines = []
    replaced = False
    for line in lines:
        if line.startswith("FIREBASE_SERVICE_ACCOUNT_JSON="):
            new_lines.append(f"FIREBASE_SERVICE_ACCOUNT_JSON={sa_rel_path}")
            replaced = True
        else:
            new_lines.append(line)
    if not replaced:
        new_lines.append(f"FIREBASE_SERVICE_ACCOUNT_JSON={sa_rel_path}")
    ENV_PATH.write_text("\n".join(new_lines) + "\n")
    print(f"  [OK] .env updated: FIREBASE_SERVICE_ACCOUNT_JSON={sa_rel_path}")


def main():
    CREDS_DIR.mkdir(exist_ok=True)

    if SA_PATH.exists():
        print(f"[OK] Service account key already exists at {SA_PATH}")
        update_env(str(SA_PATH))
        return

    print("[KEY] Retrieving Firebase CLI access token...")
    token = get_cli_token()

    # Also try: firebase login:ci output
    if not token:
        result = run(["firebase", "login:print-token"], cwd=str(ROOT))
        token = result.stdout.strip()

    if not token:
        # Try Application Default Credentials path
        adc_path = Path(os.environ.get("APPDATA", "")) / "gcloud" / "application_default_credentials.json"
        if adc_path.exists():
            print(f"  [INFO] Found ADC at {adc_path}")
        sys.exit(
            "[ERROR] Could not obtain a Google access token automatically.\n"
            "    Please run: firebase login  (already done)\n"
            "    Then re-run this script, or manually download the service account key\n"
            "    from: https://console.firebase.google.com/project/golden-acres-projects/settings/serviceaccounts/adminsdk\n"
            f"    and save it to: {SA_PATH}"
        )

    print(f"  [OK] Token obtained ({len(token)} chars)")

    print(f"[SETUP] Creating service account '{SA_NAME}' in project '{PROJECT}'...")
    key_dict = create_sa_via_rest(token)

    if not key_dict:
        sys.exit(
            "[ERROR] Automatic key creation failed.\n"
            "    Download the key manually from:\n"
            "    https://console.firebase.google.com/project/golden-acres-projects/settings/serviceaccounts/adminsdk\n"
            f"    Save it to: {SA_PATH}"
        )

    SA_PATH.write_text(json.dumps(key_dict, indent=2))
    print(f"  [OK] Key written to {SA_PATH}")

    update_env(str(SA_PATH))

    print(f"\n[DONE] Setup complete. Service account: {SA_EMAIL}")
    print(f"    Key saved to: {SA_PATH}")


if __name__ == "__main__":
    main()
