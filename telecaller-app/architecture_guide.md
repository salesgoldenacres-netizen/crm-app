# CRM Application Architecture & Developer Guide

This document outlines the design principles, structural architecture, and developer workflows for this CRM.

---

## 1. Directory Structure & Feature-Based Architecture

The project follows a clean, Feature-Based Architecture to keep business domains separated and isolated.

```
src/
  app/              # Global application setup (router, stores provider, global CSS)
  features/         # Decoupled business domains
    admin/          # RBAC Management, user controls, roster shifts, audit logs
    attendance/     # Check-in, check-out, live status tracking, leaves management
    calls/          # IVR settings, simulated dialer overlay, call logs
    dashboard/      # Widgets, dashboard tab switcher, push configuration, timers
    employees/      # User accounts, telecaller teams hierarchy
    leads/          # Leads workspace grid, compact/normal views, WhatsApp templates
    plots/          # Plot layouts, SVG canvas, dimension line computations
    settings/       # Global theme store, application configuration
  shared/           # Highly generic, stateless UI and common utilities
    components/     # DataTable, ModalRegistryContext, SegmentedStageTracker, etc.
    layouts/        # AppShell layout framework
    services/       # Global services (Firebase initialization)
    types/          # Shared TypeScript type declarations
    utils/          # Formatting, date computations, custom hooks
```

### Component Guidelines
* **No Business Logic inside Shared**: Shared components should be entirely presentation-only, driven by React props.
* **Isolated Features**: Feature directories should not import components from other feature folders. Communication between features must happen through shared hooks, global context, or repositories.

---

## 2. Shared Data Table (DataTable)

`DataTable` is a highly scalable, enterprise-ready grid wrapper located in `src/shared/components/DataTable.tsx`.

### Features
* **Sorting**: Click columns headers to toggle ascending/descending sorting.
* **Pagination**: Interactive pagination controls with custom page size configuration.
* **Selection**: Support for multi-row checkbox selection.
* **CSV Export**: Native CSV exporter button.
* **Search**: Global search query mapping with search field constraints.

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

Tests are run using **Vitest** and **React Testing Library**.

### Executing Tests
To run unit and integration tests:
```bash
npm run test
```

### Adding New Tests
Write test specifications in files matching `*.test.ts` or `*.test.tsx` next to the code under test.
