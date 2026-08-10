# Deploy OTA and Sync Firebase

This directive describes the standard operating procedure for bumping the application version, building/packaging the Capacitor OTA update, deploying it to Firebase Hosting, deploying associated backend components (Cloud Functions, Rules, and Indexes), and verifying that the update has successfully propagated.

## Inputs

The script accepts optional command-line arguments to customize the flow:
- `--version` (string): A specific target version (e.g. `0.0.21`). If omitted, the script automatically increments the patch version (e.g., `0.0.20` -> `0.0.21`).
- `--only` (string): A comma-separated list of Firebase targets to deploy (defaults to `hosting,functions`). You can specify individual targets like `firestore:rules`, `firestore:indexes`, or deploy everything using `hosting,functions,firestore:rules,firestore:indexes`.

## Execution

To run the unified workflow, execute the Python script from the project root:

```bash
python execution/deploy_ota_and_firebase.py [--version <version_string>] [--only <firebase_targets>]
```

### Script Actions:
1. **Reads package.json** to determine the current version.
2. **Calculates the target version** (either the specified one or a patch bump of the current version).
3. **Bumps the version** in `package.json`.
4. **Triggers React build & packages OTA zip** by running `npm run build:ota <version>` inside the `telecaller-app` directory. This creates `bundle-<version>.zip` and `manifest.json`.
5. **Deploys targets to Firebase** using `firebase deploy --only <targets>`.
6. **Verifies live manifest** by polling `https://golden-acres-projects.web.app/updates/manifest.json` until the live version matches the target version (up to 10 attempts, 5s interval).
7. **Restores package.json** automatically if any step (build or deploy) fails.

## Outputs

- A new OTA bundle zip file deployed on Firebase Hosting: `https://golden-acres-projects.web.app/updates/bundle-<version>.zip`
- Updated live manifest: `https://golden-acres-projects.web.app/updates/manifest.json`
- Synced Firebase components (Functions, Hosting files, and rules as specified).

## Rollback notes

If a bad OTA or Hosting deploy ships:

1. **OTA (Capacitor clients):** Point `public/updates/manifest.json` (then redeploy hosting / run the deploy script) back to the last known-good `bundle-<version>.zip` that is still hosted under `/updates/`. Clients poll the manifest and will pull the previous zip.
2. **Hosting SPA only:** Redeploy the previous Hosting release via Firebase Console → Hosting → Release history → **Rollback**, or rebuild the prior git tag/commit and `firebase deploy --only hosting`.
3. **Cloud Functions:** Redeploy the previous functions revision from a known-good commit (`firebase deploy --only functions`). Callable/HTTP behavior returns with that code; there is no separate OTA for functions.
4. **Firestore rules / indexes:** Only roll forward with a reviewed fix when possible. Rolling rules backward can re-open closed security holes — treat rules rollback as a security decision, not a routine DevOps step.
5. **Failed mid-script deploy:** The deploy script restores `package.json` version on build/deploy failure. Confirm live `updates/manifest.json` version manually after any partial failure.

GitHub [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) provides a manual `workflow_dispatch` deploy (rules, storage, functions, optional Hosting). Requires `FIREBASE_SERVICE_ACCOUNT_JSON` and uses GitHub Environment `production`. Prefer this directive’s local/agent path for routine OTA + backend releases; use the workflow for ops-triggered backend-only deploys.
