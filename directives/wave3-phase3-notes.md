# Wave 3 Phase 3 — Consumer Adoption Notes

**Date:** 2026-07-13  
**Scope:** Outside-in presentation adoption of Phase 2 filter primitives across Leads desktop/mobile, Admin filter chrome, and legacy siblings.  
**Constraint:** No filter logic / query / hook / preset model / Firestore changes. Draft → Search → Applied preserved.

---

## Batches

### Batch 1 — Leads Desktop

| File | Change |
| --- | --- |
| `LeadListDesktopFilterRow.tsx` | Search/Reset → `rounded-theme`, `font-semibold`, Wave 1.5 focus rings; sticky row placement/props unchanged |
| `LeadListPresetStrip.tsx` | Quiet command chrome: `rounded-theme`, `font-semibold`, focus rings; drop decorative chip shadow |
| `LeadsWorkspace.tsx` | Command bar → `theme-surface` / `rounded-theme` / no `font-black`; filtered-empty → shared `EmptyState` (`variant="compact"`, preset search) + Reset action |

**Primitives reused:** `LeadFilterFieldControl` (already), `LeadListFilterChips` (already), `EmptyState`.

### Batch 2 — Mobile

| File | Change |
| --- | --- |
| `LeadListMobileFilterSheet.tsx` | Title `font-semibold`; `type-label` labels; footer/close `rounded-theme` + focus rings; close `aria-label="Close filters"`; Escape-to-close; Search still applies + closes (semantics unchanged) |

### Batch 3 — Admin

| File | Change |
| --- | --- |
| `LeadsFilterPanel.tsx` | Wrap with `FilterPanelShell`; gray/indigo islands → theme field chrome matching `LeadFilterFieldControl` non-dense recipe (filled wash + focus rings); Clear All → `text-theme-danger` |
| `AdminLeadsTab.tsx` | Search → `FilterSearchInput`; active chips → `LeadListFilterChips`; Filters count badge → `rounded-theme` (not pill); quieter Filters toggle |

**Note:** Admin still uses `AdvancedFilters` state (not `LeadListFilters`). Field controls are presentation-aligned to `LeadFilterFieldControl` tokens, not remapped onto that component — merging models was an explicit non-goal.

### Batch 4 — Legacy cleanup

| File | Decision | Rationale |
| --- | --- | --- |
| `QuickAccessStatusTabs.tsx` | **Deprecate** + presentation migrate | Not on `LeadsWorkspace` path; superseded by `LeadListPresetStrip`. Removed persistent emoji + rainbow borders so remount ≠ Emoji Policy violation |
| `LeadsFilters.tsx` | **Deprecate** + migrate to `FilterSearchInput` | Not on workspace path; emoji removed from selects; theme chrome |
| `AdvancedFiltersPanel.tsx` | **Deprecate** + migrate to `FilterPanelShell` | Admin mounts `LeadsFilterPanel` instead; type `AdvancedFilters` remains here for imports; panel chrome aligned so no gray island |

Exports kept in `leads/index.ts` for type/legacy safety; JSDoc `@deprecated` on components.

---

## Migrate vs deprecate summary

| Surface | Live mount? | Decision |
| --- | --- | --- |
| Desktop filter row + workspace command bar | Yes | **Migrate** |
| Mobile filter sheet | Yes | **Migrate** |
| Admin `LeadsFilterPanel` + search + chips | Yes | **Migrate** |
| `LeadListPresetStrip` | Yes | **Migrate** (light) |
| `QuickAccessStatusTabs` | No | **Deprecate** (+ quiet/no-emoji pass) |
| `LeadsFilters` | No | **Deprecate** (+ `FilterSearchInput`) |
| `AdvancedFiltersPanel` | No | **Deprecate** (+ `FilterPanelShell`; keep type) |

---

## Residuals (soft — not blockers)

| Residual | Notes |
| --- | --- |
| Dense date-range `text-[9px]` in Excel row | Keep for density; readability soft note from audit |
| Admin ≠ `LeadFilterFieldControl` instance | Intentional state-model fence |
| Lead Bin filter chrome | Adjacent; out of Wave 3 live path |
| Forms/Modals (e.g. AdminLeadModal emoji options) | Later waves |
| Runtime visual screenshot pass | Static + `tsc` validation only |

---

## Explicit non-touches

- `useLeadListFilters.ts`, `leadListFilterConfig.ts`, `useAdminLeads.ts` filter application
- Firestore / query builders
- Draft → Search → Applied / mobile apply / chip clear / preset apply semantics
- Sticky `thead` + filter row behavior in `LeadsDesktopTable`
- DLS bump deferred to Phase 5 (this pass includes validation + promote if PASS)
