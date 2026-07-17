# Wave 8 Audit — Platform Architecture (Agent 0)

This report details the architectural bounds, boundary integrity, and technical debt of the `telecaller-app` codebase.

---

## 1. Module Boundaries & Integrity

The CRM maintains clean separation between:
- **Shared Primitives** (`src/shared/`): Unified components (Card, Drawer, Dialog), TypeScript contracts, and utility functions.
- **Feature Modules** (`src/features/`): Localized modules for Leads (`src/features/leads/`) and Admin dashboards.
- **AI Platform** (`src/shared/ai/`): Decoupled orchestration layer.

### Findings
- **Tight Coupling**: Direct imports from feature folders into shared wrappers exist in minor files.
- **Mitigation**: Standardize on dependency injection or pass callbacks down from pages (as done with `validateAssignment` in SalesCopilotDrawer).

---

## 2. Technical Debt

- **Missing Project Scoping**: No unified scoping helper exists to automatically append `projectId` constraints to lead fetch triggers.
- **Ad Hoc Permissions**: Inline checks for `user.role` are scattered across UI components.
- **Solution**: Move authorization decisions behind a centralized `AuthorizationService` mapping roles and project scopes to boolean results (e.g. `canViewLead(user, lead)`).
