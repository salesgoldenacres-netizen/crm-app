import os
import sys
import json
import subprocess
import argparse
import time
import urllib.request
from pathlib import Path

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
APP_DIR = PROJECT_ROOT / "telecaller-app"
PACKAGE_JSON_PATH = APP_DIR / "package.json"

def get_current_version():
    if not PACKAGE_JSON_PATH.exists():
        sys.exit(f"[ERROR] package.json not found at {PACKAGE_JSON_PATH}")
    with open(PACKAGE_JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("version", "0.0.0")

def set_package_version(version):
    with open(PACKAGE_JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    data["version"] = version
    with open(PACKAGE_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    print(f"[VERSION] Updated package.json version to {version}")

def bump_patch_version(current_version):
    parts = current_version.split(".")
    if len(parts) != 3:
        sys.exit(f"[ERROR] Invalid version format in package.json: '{current_version}'. Must be x.y.z")
    try:
        patch = int(parts[2])
        parts[2] = str(patch + 1)
    except ValueError:
        sys.exit(f"[ERROR] Non-integer patch version in: '{current_version}'")
    return ".".join(parts)

def run_command(command, cwd):
    print(f"\n[RUNNING] {command} (in {cwd})")
    # Using shell=True for windows shell commands (npm, firebase, etc.)
    result = subprocess.run(command, cwd=str(cwd), shell=True)
    if result.returncode != 0:
        raise subprocess.CalledProcessError(result.returncode, command)

def verify_live_manifest(expected_version, max_retries=10, delay=5):
    url = "https://golden-acres-projects.web.app/updates/manifest.json"
    print(f"\n[VERIFICATION] Checking live manifest at: {url}")
    
    # Adding a cache buster timestamp query
    full_url = f"{url}?t={int(time.time())}"
    
    for i in range(1, max_retries + 1):
        try:
            print(f"Attempt {i}/{max_retries}: Fetching manifest...")
            req = urllib.request.Request(
                full_url, 
                headers={'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache'}
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status == 200:
                    content = response.read().decode('utf-8')
                    manifest = json.loads(content)
                    live_version = manifest.get("version")
                    print(f"Success. Live version is: {live_version}")
                    
                    if live_version == expected_version:
                        print(f"[VERIFIED] Live manifest matches expected version: {expected_version}!")
                        return True
                    else:
                        print(f"Version mismatch: Live={live_version}, Expected={expected_version}. Waiting to propagate...")
        except Exception as e:
            print(f"Fetch failed: {e}")
            
        time.sleep(delay)
        
    print(f"[WARNING] Live manifest verification timed out. The update might still be propagating.")
    return False

def main():
    parser = argparse.ArgumentParser(description="Automate OTA packaging and Firebase sync.")
    parser.add_argument("--version", help="Specific version to set (e.g. 0.0.21). If omitted, bumps patch version.")
    parser.add_argument("--only", default="hosting,functions", help="Firebase deploy target, e.g. hosting, functions, firestore:rules, firestore:indexes")
    args = parser.parse_args()

    current_version = get_current_version()
    print(f"Current version in package.json: {current_version}")

    if args.version:
        target_version = args.version
    else:
        target_version = bump_patch_version(current_version)
        print(f"No version specified. Bumping patch version: {current_version} -> {target_version}")

    # Back up package.json in case build fails
    backup_content = PACKAGE_JSON_PATH.read_text(encoding="utf-8")

    try:
        # 1. Bump version
        set_package_version(target_version)

        # 2. Build React App and Package OTA Zip
        # This executes the custom scripts/deploy-ota.js script inside the app
        run_command(f"npm run build:ota {target_version}", APP_DIR)

        # 3. Deploy to Firebase
        # We specify targets via --only
        deploy_cmd = f"firebase deploy"
        if args.only:
            deploy_cmd += f" --only {args.only}"
            
        run_command(deploy_cmd, APP_DIR)

        print("\n=============================================")
        print(f"Deployment complete for version {target_version}!")
        print("=============================================")

        # 4. Verification Check
        verify_live_manifest(target_version)

    except Exception as e:
        print(f"\n[ERROR] Deployment workflow failed: {e}")
        print("Restoring package.json version...")
        PACKAGE_JSON_PATH.write_text(backup_content, encoding="utf-8")
        sys.exit(1)

if __name__ == "__main__":
    main()
