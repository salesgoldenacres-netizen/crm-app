# Architecture — Golden Acres Telecaller CRM

This is a **living pointer** to the canonical architecture and process docs. Keep it short;
update the linked documents (not this file) when the system changes.

## Canonical documents

| Topic | Document |
|-------|----------|
| Feature-based architecture, directory layout, DataTable, theming, cross-feature boundaries | [`architecture_guide.md`](./architecture_guide.md) |
| Cloud Functions HTTP webhooks + callable request/response shapes | [`WEBHOOK_API.md`](./WEBHOOK_API.md) |
| Day-to-day contribution workflow, local checks, hardening notes | [`CONTRIBUTING.md`](./CONTRIBUTING.md) |
| Workspace (3-layer agent) overview + CRM location | [`../README.md`](../README.md) |

## At a glance

- **App:** React 19 + Vite + TypeScript, Firebase (Auth, Firestore, Functions, Hosting), Capacitor shell.
- **Layering:** `features/*` (business domains, each with an `index.ts` barrel) → `shared/*`
  (generic UI + cross-cutting services: repositories, `LeadQueryService`, analytics, contexts).
- **Data access:** lead lists via `LeadQueryService` (cursor pagination); mutations via
  repositories under `shared/services/firebase`. Features avoid direct `firebase/firestore` imports.
- **Enforcement:** `eslint.config.js` bans direct firestore imports in features and cross-feature
  *logic* imports (audit A-1); logging is centralized in `shared/utils/logger` (audit C-3).

## Known architecture debt (burn-down)

- Cross-feature hook/store composition and some cross-feature component imports remain
  (see `architecture_guide.md` → "Cross-feature coupling debt").
- God modules to decompose incrementally: `useAdminMapEditor`, `shared/services/firebase/repositories.ts`.
