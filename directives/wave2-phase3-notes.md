# Wave 2 Phase 3 — Consumer Adoption Notes

**Date:** 2026-07-13  
**Scope:** Presentation-only adoption of existing DLS table chrome on Leads + Admin DataTable consumers.  
**Discipline:** **Adoption only — no new design invention.** If something does not fit DLS, adopt an existing contract or document a genuine gap after validation.

**Hard constraints (unchanged):** No changes to sorting / filtering / pagination / CSV / search / hooks / stores / routing / grouping algorithms. Leads remains a custom table (not merged into shared `DataTable`).

Governed by: `ui-registry.md` (v1.1), `directives/wave2-datatable-ui-audit.md`, `directives/wave2-phase2-validation.md`.

---

## Batches

### Batch 1 — Leads Desktop (highest risk/ROI)

**Exit:** Users recognize the table; it feels calmer.

| File | Adoption |
| --- | --- |
| `LeadsDesktopTable.tsx` | Plain group labels; `type-label` / `font-semibold` headers; theme group borders; `rounded-theme` shell; focus-visible on collapse |
| `LeadsTableRow.tsx` | Selection `bg-theme-accent-muted/40`; hover `theme-surface/60`; hierarchy weights; `Badge` Idle/Hot/Cold; overdue solid danger (no pulse); theme actions |

**Preserved:** sticky header, filter row, compact mode, grouping/collapse, memoization, row actions, keyboard-focusable controls.

### Batch 2 — Leads Mobile (intentionally SMALL)

**Stop:** No card redesign, no layout rewrite.

| File | Adoption |
| --- | --- |
| `LeadsMobileGrid.tsx` | Status chip `font-semibold` + `rounded-theme`; existing theme hover/active/touch row; layout unchanged |

### Batch 3 — Admin (cleanup pass only)

**Stop:** Does it look like the same CRM as Agent Dashboard? If yes, STOP — no polish beyond DLS.

Order executed:

1. `AdminLeadsTab.tsx`  
2. `AgentLeaderboardTab.tsx`  
3. `AdminUsersTab.tsx`  
4. `AdminProjectsTab.tsx`  
5. `LeaveRequestsManagement.tsx`  
6. `settings/AuditSettingsTab.tsx`  
7. `AdminAttendanceTab.tsx`  
8. `AdminRosterTab.tsx`  

Focus applied: column typography, Badge/token cleanup, emoji removal (ranks → numeric badges), `rounded-theme` on touched wrappers. No data-model or interaction-logic changes.

---

## Outside-in order (execution)

1. Header / row chrome  
2. Selection / hover / focus  
3. Cell typography (hierarchy)  
4. Badges / chips  
5. Consumer-specific polish (Admin cleanup only)

Shared `DataTable` primitive = Phase 2 (adopted, not redesigned in Phase 3).

---

## Residuals / DLS gaps (documented — not invented mid-pass)

| Item | Where | Disposition |
| --- | --- | --- |
| Soft tinted group headers | `LeadsDesktopTable` | Keep for pipeline scan; borders themed |
| Filter / quick-tab emoji | `LeadsFilters`, `QuickAccessStatusTabs` | Outside table body → Filter Contract later |
| Admin Users team cards | Non-table grid | Out of Phase 3 table scope |
| Leads empty | Parent workspace | Gap only if in-table EmptyState required later |
| Manual Light/Dark contrast QA | Ops | See validation matrix |

---

## Artifacts

- Validation (RC): [`directives/wave2-phase3-validation.md`](wave2-phase3-validation.md)  
- DLS **v1.1**: `ui-registry.md` §3a (Surface / Header / Row states / Selection / Hover / Focus / EmptyState / Badge / Motion / Toolbar / Pagination) + §3b Hierarchy + §3c Density
