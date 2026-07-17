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
| `.github/workflows/` | CI, optional scheduled backup, deploy stub |
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
| App unit/UI tests | Vitest (`npm test` in `telecaller-app/`) | Excludes `functions/` |
| Scoped coverage | `npm run test:coverage` | Light gate on `dateUtils` |
| Functions unit tests | `node --test` (`npm test` in `functions/`) | Pure helpers only in CI |
| PR/push CI | `.github/workflows/ci.yml` | Lint + app tests + build + functions tests |

## Deployment

Prefer `directives/deploy_ota_and_firebase.md` / `execution/deploy_ota_and_firebase.py`. GitHub deploy is a **manual stub** until a Firebase CI token is configured (see `.github/workflows/deploy.yml`). Rollback notes live in the deploy directive.

## Backups

Daily pragmatic path: Windows Task Scheduler via `execution/schedule_backup_windows.ps1`, or optional GitHub Action `backup-firestore.yml` (needs `FIREBASE_SERVICE_ACCOUNT_JSON` secret). Details in `directives/backup_firestore.md`.

## Security boundary (do not weaken)

Phase 0 security (Firestore/Storage rules design, webhook fail-closed auth, password policies, claims) is out of scope for casual DevOps tweaks. Document header names and routes; never commit secret values.
