# Architecture — Golden Acres CRM

High-level map of the Golden Acres Projects workspace and the Telecaller CRM. For feature-level UI/structure detail see `telecaller-app/architecture_guide.md`.

## System layers

```
┌─────────────────────────────────────────────────────────────┐
│  Agents / humans                                            │
│  directives/*.md  →  orchestration decisions  →  execution/* │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  telecaller-app (React + Vite + Capacitor)                  │
│  features/*  ·  shared/*  ·  Firebase client SDK            │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        Firestore        Cloud Functions   Firebase Hosting
        (+ Storage)      (webhooks, jobs)  (+ OTA /updates)
```

## Workspace layout

| Path | Role |
|------|------|
| `AGENTS.md` | 3-layer agent operating model |
| `directives/` | SOPs (what to do) |
| `execution/` | Deterministic Python scripts (how to do it) |
| `telecaller-app/` | CRM web/mobile client + Cloud Functions |
| `.github/workflows/` | CI (`ci.yml`), manual deploy (`deploy.yml`), scheduled backup |
| `backups/` | Local Firestore JSON backups (gitignored) |

## CRM app (`telecaller-app/`)

- **Client**: React 19 + Vite, feature folders under `src/features/`, shared UI/services under `src/shared/`.
- **Auth / data**: Firebase Auth + Firestore; repositories in `shared/services/firebase/`.
- **Backend**: `functions/` — Express webhook API, callable functions, scheduled automation jobs (Node 22).
- **Mobile**: Capacitor Android + Capgo OTA bundles under `public/updates/` / Hosting `/updates/`.

## Data flow (simplified)

1. **Leads** enter via UI, CSV import scripts, or webhook routes (`WEBHOOK_API.md`).
2. **Allocation** may assign telecallers via round-robin helpers in Cloud Functions.
3. **Automation** crons (follow-ups, SLA, site-visit) write idempotent notifications.
4. **Reporting / analytics** mostly client-side services reading Firestore.

## Testing & CI

| Surface | Runner | Notes |
|---------|--------|-------|
| App unit tests | Vitest (`npm test` in `telecaller-app/`) | Excludes `functions/`, `rules/` |
| Scoped coverage | `npm run test:coverage` | Business-logic thresholds in `vite.config.js` |
| Functions unit tests | `node --test` (`npm test` in `functions/`) | Hard audit at `--audit-level=high` |
| Rules unit tests | `npm run test:rules` | Firestore + Storage emulators |
| PR/push CI | `.github/workflows/ci.yml` | Three parallel jobs: app, functions, rules |

## Deployment

Primary path: `directives/deploy_ota_and_firebase.md` / `execution/deploy_ota_and_firebase.py` (OTA + Firebase).

GitHub Actions: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) — manual `workflow_dispatch` for rules, storage, functions, and optional Hosting. Requires `FIREBASE_SERVICE_ACCOUNT_JSON`; gated by GitHub Environment **`production`**. See `telecaller-app/DEPLOYMENTS.md` for secrets, WIF upgrade path, and rollback notes.

## Backups

Daily pragmatic path: Windows Task Scheduler via `execution/schedule_backup_windows.ps1`, or optional GitHub Action `backup-firestore.yml` (needs `FIREBASE_SERVICE_ACCOUNT_JSON` secret). Details in `directives/backup_firestore.md`.

## Security boundary (do not weaken)

Phase 0 security (Firestore/Storage rules design, webhook fail-closed auth, password policies, claims) is out of scope for casual DevOps tweaks. Document header names and routes; never commit secret values.
