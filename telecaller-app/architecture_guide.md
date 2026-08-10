# CRM Application Architecture & Developer Guide

This document outlines the design principles, structural architecture, and developer workflows for this CRM.

---

## 1. Directory Structure & Feature-Based Architecture

The project follows a clean, Feature-Based Architecture to keep business domains separated and isolated.

```
src/
  App.tsx           # Root composition: router, providers, modal registry (no src/app/ dir)
  main.tsx          # App entry / bootstrap
  features/         # Business domains (each with an index.ts public barrel)
    admin/          # RBAC management, user controls, roster shifts, audit logs, settings
    attendance/     # Check-in, check-out, live status tracking, leaves management
    auth/           # Login, auth state (useAuth), profile linking
    calls/          # IVR settings, simulated dialer overlay, call logs, WhatsApp inbox UI
    dashboard/      # Widgets, dashboard tab switcher, push configuration, timers
    employees/      # User accounts, telecaller teams hierarchy
    leads/          # Leads workspace grid, lead details, intelligence, copilot, templates
    messaging/      # WhatsApp / Evolution timeline events, messaging status hooks
    plots/          # Plot layouts, SVG canvas, dimension line computations
    settings/       # Global theme store, application configuration
  shared/           # Generic UI, cross-cutting services, and common utilities
    components/     # DataTable, ModalRegistryContext, SegmentedStageTracker, etc.
    layouts/        # AppShell layout framework, ModalHost
    services/       # Firebase, repositories, LeadQueryService, analytics, contexts
    types/          # Shared TypeScript type declarations
    utils/          # Formatting, date/role utils, logger, leadColors
```

### Component Guidelines
* **No Business Logic inside Shared Components**: Shared *components* should be presentation-only, driven by React props. (Note: `shared/services` intentionally holds cross-cutting logic — repositories, LeadQueryService, analytics, contexts.)
* **Isolated Features**: Feature directories should not reach into another feature's internal pure-logic modules (`utils/`, `config/`, `constants/`, `intelligence/`, `copilot/`). Such shared logic must be extracted to `@/shared/**`. This boundary is enforced in `eslint.config.js` via `no-restricted-imports` (audit A-1).

### Cross-feature coupling debt (audit A-1 — burn-down)
The ESLint rule bans cross-feature **logic** imports (utils/config/constants/intelligence/copilot must live in `@/shared/**`) **and** any `@/features/**` import from `@/shared/**` (inverted dependency). Cross-feature **hook/store composition** at the composition root (`App.tsx`, `FeatureAnalyticsProvider`) and a handful of cross-feature **component** imports remain as tracked debt. These should be migrated incrementally toward shared services or each feature's public barrel (`@/features/<x>`); do not add *new* cross-feature coupling.

---

## 2. Shared Data Table (DataTable)

`DataTable` (`src/shared/components/DataTable.tsx`) is a **client-side** presentational grid: sorting, filtering, and pagination all operate over the in-memory `data` array it is given. It is well suited to bounded / moderate datasets (settings lists, admin sub-tables, roster views).

> **Scalability note (audit D-1):** `DataTable` is *not* the scalability mechanism for large lead volumes. High-cardinality lead lists must be fed by `LeadQueryService` (Firestore cursor pagination — not a global snapshot) and rendered through the virtualization layer (`TanStackVirtualEngine`), so the browser never sorts/filters the full dataset in memory. Reserve `DataTable` for bounded collections.

### Features
* **Sorting**: Click column headers to toggle ascending/descending sorting (in-memory).
* **Pagination**: Interactive client-side pagination controls with custom page size.
* **Selection**: Support for multi-row checkbox selection.
* **CSV Export**: Native CSV exporter button (exports the currently loaded rows).
* **Search**: Global search query mapping with search field constraints (in-memory).

---

## 3. Global Modal Registry

To avoid component coupling, the CRM implements a central registry for modals using `ModalRegistryContext.tsx`.

### Usage
Modals are triggered by name (e.g. `add-lead`, `edit-user`) without direct imports of the modal components into layout containers:
```typescript
const { openModal } = useModalRegistry();

openModal("link-lead", {
  plot: selectedPlot,
  onSave: handleSaveLead
});
```

---

## 4. Theme and Styling System

The application uses Tailwind CSS matched with standard theme variables in `useThemeStore.ts`.

### Mode Modifiers
* **Light / Dark Mode**: Toggled by adding the `.dark` class to `document.documentElement`.
* **Color Themes**: Customizable gradient palettes (e.g. Sunset Glow, Emerald Forest, Cyber Neon).
* **Usage**: Styling classes support dark prefix, e.g. `bg-white dark:bg-gray-800 text-gray-900 dark:text-white`.

---

## 5. Testing Infrastructure

Tests use **two runners** — do not mix them:

| Runner | Command | Scope |
|--------|---------|--------|
| **Vitest** + React Testing Library | `npm test`, `npm run test:coverage` | `src/**` business logic, hooks, contracts, utils, component smoke tests |
| **node:test** + Firebase emulators | `npm run test:rules` | `rules/*.test.js` (Firestore + Storage security rules) |
| **node:test** (functions) | `cd functions && npm test` | Cloud Functions helpers, webhooks, lead ingest |

Vitest **excludes** `rules/**` and `functions/**` via `vite.config.js` → `test.exclude`. Rules tests fail under Vitest (wrong runner / missing emulator).

### Executing app tests
```bash
npm run test
npm run test:coverage   # ratchet thresholds in vite.config.js
npm run test:rules      # requires Firebase CLI + emulators
```

### Adding New Tests
Write Vitest specs as `*.test.ts` / `*.test.tsx` next to code under `src/`. Write rules specs as `rules/*.test.js` (node:test + `@firebase/rules-unit-testing`).

### Coverage policy (Wave 2)
Vitest coverage (`npm run test:coverage`) measures **business logic** under `shared/services`, `shared/contracts`, `shared/utils`, `shared/ai`, feature hooks, and lead intelligence — not React pages/components (Login/Dashboard smoke tests are RTL residuals; full UI/E2E deferred). Thresholds in `vite.config.js` are ratchet-style baselines (~25–30%), not an 80% gate. **Repositories**: unit tests mock Firestore for critical paths (`LeadRepository`, `UsersRepository`, `NotificationsRepository`, `CallLogsRepository`); full transaction/listener coverage remains a **Firestore emulator** residual. **Auth** (`shared/services/auth.ts`) is fully unit-tested with Firebase mocks. Prefer targeted tests on production paths you touch — not coverage theater.
