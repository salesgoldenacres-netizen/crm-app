# Wave 1.5 — Stabilization Sprint Plan

**Status:** Complete  
**Date:** 2026-07-13  
**App:** `telecaller-app/`  
**Type:** Stabilization — **not** a feature sprint  
**Governed by:** `ui-registry.md` (DLS), `directives/wave1-complete.md`  
**Report:** [`directives/wave1.5-report.md`](wave1.5-report.md)

---

## Goals

1. **Visual QA** — Confirm baseline checklist; capture screenshots if practical, else document clear capture status.
2. **Accessibility** — Quick pass: keyboard/focus, muted-text contrast, dark-mode readability, zoom notes.
3. **Performance** — Sanity check for expensive Wave 1 presentation patterns (`useMemo` abuse, etc.).
4. **Consistency** — Fix remaining Agent-dashboard-only issues: hardcoded colors, spacing, stray `font-black`/`font-extrabold`, legacy borders, decorative emoji/pulse.

---

## Scope

| IN | OUT |
| --- | --- |
| Agent dashboard widgets | Admin |
| `DashboardHeader`, `WidgetGrid` | DataTable redesign |
| Shared primitives (small consistency fixes only) | Filters, forms |
| Mobile drawer / status panel (Agent chrome) | Wave 2 surfaces |
| | Sidebar redesign |
| | Attendance strip redesign |
| | Widget height / customizer *behavior* changes |

---

## Checklist

- [x] Create this plan (`directives/wave1.5-plan.md`)
- [x] Consistency grep on Agent dashboard + Phase 3 files
  - [x] Emoji in persistent chrome
  - [x] `indigo-` / `slate-` / `gray-` islands → `theme-*`
  - [x] `font-black` / `font-extrabold` vs `type-*`
  - [x] Hardcoded hex
  - [x] Decorative `animate-pulse` (not loading skeletons)
- [x] Apply surgical presentation-only fixes
- [x] A11y spot-check: Header, WidgetHeader, EmptyState, key widgets
- [x] Update `directives/wave1-visual-baseline.md` capture status
- [x] Write `directives/wave1.5-report.md`
- [x] Light imprint to `ui-registry.md` (EmptyState weight + focus-ring rule; §16 marked done)
- [x] `tsc --noEmit` (pass)

---

## Guiding question

Would a first-time user understand faster?
