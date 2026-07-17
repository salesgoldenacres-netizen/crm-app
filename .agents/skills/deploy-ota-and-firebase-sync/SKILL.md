---
name: deploy-ota-and-firebase-sync
description: Packages a React Capacitor OTA update, bumps version, builds web assets, and deploys both the OTA updates to Firebase Hosting and backend assets (rules, functions, indexes) to Firebase in one unified flow.
---

# Deploy OTA and Sync Firebase Skill

Use this skill whenever the user requests to:
1. "Deploy an OTA update"
2. "Sync with Firebase"
3. "Publish/deploy a new app version"
4. "Perform a unified deploy/build"

This skill uses a deterministic script to automate version bumping, building, packaging, deploying, and verifying live URL propagation.

## Workflow

### 1. Read the Directive
Review the SOP directive in [deploy_ota_and_firebase.md](file:///c:/Users/pushp/OneDrive/Documents/Golden%20Acres%20Projects/directives/deploy_ota_and_firebase.md) to understand the input options, script behavior, and expected outputs.

### 2. Determine inputs
Clarify or decide:
- **Target version**: Whether to do a patch bump (default) or a specific target version.
- **Firebase components**: What targets to sync (default: `hosting,functions`).

### 3. Run the execution script
Run the Python script located in `execution/` from the root directory:

```bash
python execution/deploy_ota_and_firebase.py [--version <version>] [--only <targets>]
```

### 4. Verification & Summary
The script will auto-verify the manifest url. Highlight the verification results (success/timeout) and list the deployed version in your final response to the user.
