# Deployments — Golden Acres Telecaller CRM

How CI/CD deploys Firebase assets and what secrets you must configure.

## CI (automatic)

Every push/PR to `main` / `master` runs [`.github/workflows/ci.yml`](../.github/workflows/ci.yml):

| Job | Runner | Hard gate |
|-----|--------|-----------|
| **App** | Vitest (`npm test`, `npm run test:coverage`) | lint, typecheck, unit tests, coverage, production build |
| **Functions** | `node --test` in `functions/` | unit tests, `npm audit --audit-level=high` |
| **Rules** | Firebase emulators + `node --test rules/*.test.js` | `npm run test:rules` |

Vitest excludes `functions/**` and `rules/**` (see `vite.config.js`); each surface uses its own runner.

### Dependency audit policy

| Target | Gate | Notes |
|--------|------|-------|
| `functions/` | **hard** at `--audit-level=high` | Clean at high/critical |
| App | **soft** (`continue-on-error`) | DO-2 waiver below |

Run locally:

```bash
cd telecaller-app
npm audit --audit-level=high --omit=dev
cd functions && npm audit --audit-level=high --omit=dev
npm run test:rules
```

### DO-2 advisory waivers (documented)

#### react-router — GHSA-qwww-vcr4-c8h2 (high, soft-fail)

| Field | Value |
|-------|-------|
| Package | `react-router-dom@7.18.1` (pinned) |
| Advisory | [GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2) — RSC-mode CSRF bypass |
| Affected range | `react-router` 7.12.0 – 8.2.0 |
| Mitigation | **Not applicable to this deployment.** CRM is a client-only SPA using `BrowserRouter`; no React Server Components, SSR, or server actions. |
| Why not pin 7.11.0 | Clears GHSA-qwww-vcr4-c8h2 but npm audit reports 12+ other **high** advisories on 7.11.0 (XSS, open redirect, SSR hydration). 7.18.1 is strictly safer for SPA. |
| Remediation trigger | Upgrade when upstream publishes a patched release above 8.2.0 (or 7.18.x backport). Then remove `continue-on-error` on app audit in `ci.yml`. |
| Review date | 2026-07-27 |

#### uuid via firebase-admin — GHSA-w5hq-g745-h8pq (moderate, informational)

| Field | Value |
|-------|-------|
| Package | `uuid` transitive via `firebase-admin` in `functions/` |
| Advisory | [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) |
| Gate impact | **None** — functions audit uses `--audit-level=high`; moderate does not fail CI |
| Remediation | Requires `firebase-admin@14+` major bump — track separately |

## Production release record

| Version | Channel | Deployed | Notes |
|---------|---------|----------|-------|
| **0.0.64** | OTA + Hosting | 2026-07-27 | DevOps wave: rules CI job, functions hard audit, deploy workflow, dependabot |

Live manifest: `https://golden-acres-projects.web.app/updates/manifest.json`

## Commit checklist (DevOps artifacts → origin/main)

Stage and push these paths together so remote CI matches local:

```
.github/workflows/ci.yml
.github/workflows/deploy.yml
.github/dependabot.yml
telecaller-app/vite.config.js
telecaller-app/package.json
telecaller-app/package-lock.json
telecaller-app/DEPLOYMENTS.md
telecaller-app/CONTRIBUTING.md
telecaller-app/rules/*.test.js
telecaller-app/rules/firestore.rules.test.js
telecaller-app/rules/storage.rules.test.js
ARCHITECTURE.md
directives/deploy_ota_and_firebase.md
```

Verify before push:

```bash
cd telecaller-app
npm run lint && npm run typecheck && npm test && npm run test:coverage && npm run build
cd functions && npm test && npm audit --audit-level=high --omit=dev
cd .. && npm run test:rules
```

Do **not** commit: `.env`, service-account JSON, `coverage/`, `dist/`, `.firebase/`.

## Manual Firebase deploy (GitHub Actions)

Workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)

Trigger: **Actions → Deploy Firebase → Run workflow**

Defaults deploy `firestore:rules,storage,functions`. Optionally include Hosting (builds Vite first).

The workflow uses `environment: production` — configure required reviewers before relying on it as a gate.

### Required GitHub secret

| Secret | Purpose |
|--------|---------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Raw JSON key for a GCP service account with Firebase deploy permissions |

Minimum IAM roles for the service account:

- Firebase Admin (`roles/firebase.admin`) or granular: Rules Admin, Cloud Functions Admin, Storage Admin
- Service Account User (if deploying functions that run as another SA)

### Optional secrets (Hosting build only)

When `include_hosting: true`:

| Secret | Purpose |
|--------|---------|
| `VITE_FIREBASE_API_KEY` | Vite build env |
| `VITE_FIREBASE_AUTH_DOMAIN` | Vite build env |
| `VITE_FIREBASE_STORAGE_BUCKET` | Vite build env |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Vite build env |
| `VITE_FIREBASE_APP_ID` | Vite build env |

### Environment protection

1. GitHub → Settings → Environments → create or open **`production`**
2. Add required reviewers and/or wait timer
3. `deploy.yml` already sets `environment: production`

### Workload Identity Federation (next hardening step)

Replace JSON key auth with WIF — see commented block at top of `deploy.yml`. Secrets:

- `WIF_PROVIDER` — full workload identity provider resource name
- `WIF_SERVICE_ACCOUNT` — deploy service account email

Steps (summary):

1. Create GCP Workload Identity Pool + GitHub OIDC provider
2. Grant deploy SA `roles/firebase.admin` (or granular roles)
3. Bind `principalSet` for this repo to the SA
4. Swap `credentials_json` auth step for WIF in `deploy.yml`
5. Remove `FIREBASE_SERVICE_ACCOUNT_JSON` secret once verified

## Local deploy

Prefer the unified agent skill / script when shipping OTA + backend together:

```bash
python execution/deploy_ota_and_firebase.py
```

See `directives/deploy_ota_and_firebase.md` and [CONTRIBUTING.md](./CONTRIBUTING.md).

## Scheduled Firestore backup

[`.github/workflows/backup-firestore.yml`](../.github/workflows/backup-firestore.yml) uses the same `FIREBASE_SERVICE_ACCOUNT_JSON` secret (read-only Firestore export role is sufficient).
