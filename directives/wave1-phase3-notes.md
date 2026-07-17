# Wave 1 Phase 3 — Agent Dashboard Widget Adoption Notes

**Date:** 2026-07-13  
**App:** `telecaller-app/`  
**Constraint:** Presentation-only. No KPI/data-hook, customizer, routing, or Admin changes.

---

## Batches completed

### Batch 1 — Highest impact
- **CallsToday / BookingsToday:** Larger Tier‑1 rings (96px); theme status copy (“Target met” / “N to go”); removed persistent 🎉; `gap-widget` + `type-label` / `type-secondary`.
- **TeamGoals:** Slightly smaller dual inline rings (secondary to personal Tier 1); custom goal chip remapped to `theme-accent-muted` / `theme-border` (no indigo / 🎯).
- **LeaderboardWidget:** Numeric rank badges; column headers; wider names; theme borders; pts tooltip for score formula; compact `EmptyState`.
- **PipelineFunnelWidget:** Cumulative math unchanged; clearer labels (“Reached Contacted+”, etc.); theme bar colors; empty pipeline `EmptyState`.

### Batch 2
- **CallLogsWidget:** Theme borders/chips; compact activity empty; muted notes (non-italic).
- **TasksWidget:** Readable controls (`text-[11px]` / `py-1.5`); `rounded-theme`; placeholder “Add a task…”; compact tasks empty; theme delete/clear chrome.
- **CoachingTipWidget:** Category pill without 💡; theme tokens.
- **TodayEventsWidget:** Theme surfaces; no 🎉 copy; Lucide Cake/Gift; compact empty.

### Batch 3
- **TelecallerMetricsWidget:** Theme surface cards; badge panel on accent-muted (no indigo island); next badge name without emoji icon.
- **WeeklyRosterWidget:** AM/PM/NT/Off short labels (no shift emoji); today cell accent; theme borders; optional empty when no schedule.
- **LeaveRequestsWidget:** Theme status badges; form radius/tokens; no option emoji; compact empties (agent + manager views).
- **WidgetGrid (light polish):** Events header icon `CalendarDays` (was Gift); Customize control `rounded-theme`.

### Batch 4
- **DashboardHeader:** Removed Sparkles pulse → static `LayoutDashboard`; streak as number + “Streak”; status dots + text (no emoji); quieter attendance strip (no pulse); menus/`rounded-theme` + elevation helpers.

---

## Files changed

| File | Change |
| --- | --- |
| `telecaller-app/src/features/dashboard/components/widgets/CallsTodayWidget.tsx` | Tier 1 KPI presentation |
| `telecaller-app/src/features/dashboard/components/widgets/BookingsTodayWidget.tsx` | Tier 1 KPI presentation |
| `telecaller-app/src/features/dashboard/components/widgets/TeamGoalsWidget.tsx` | Secondary KPI + token chip |
| `telecaller-app/src/features/dashboard/components/LeaderboardWidget.tsx` | Rank badges + EmptyState |
| `telecaller-app/src/features/dashboard/components/PipelineFunnelWidget.tsx` | Labels + theme bars + empty |
| `telecaller-app/src/features/dashboard/components/widgets/CallLogsWidget.tsx` | Tokens + EmptyState |
| `telecaller-app/src/features/dashboard/components/widgets/TasksWidget.tsx` | Controls + EmptyState |
| `telecaller-app/src/features/dashboard/components/widgets/CoachingTipWidget.tsx` | Emoji/token cleanup |
| `telecaller-app/src/features/dashboard/components/widgets/TodayEventsWidget.tsx` | Tokens + EmptyState |
| `telecaller-app/src/features/dashboard/components/widgets/TelecallerMetricsWidget.tsx` | Theme metrics panel |
| `telecaller-app/src/features/dashboard/components/widgets/WeeklyRosterWidget.tsx` | Text shifts + tokens |
| `telecaller-app/src/features/dashboard/components/widgets/LeaveRequestsWidget.tsx` | Tokens + EmptyState |
| `telecaller-app/src/features/dashboard/components/WidgetGrid.tsx` | Events icon + radius polish |
| `telecaller-app/src/features/dashboard/components/DashboardHeader.tsx` | Quiet chrome |
| `ui-registry.md` | Phase 3 pattern imprint |
| `directives/wave1-phase3-notes.md` | This file |

---

## Verification

- `npx tsc --noEmit` in `telecaller-app/` — **pass** (exit 0)
- Business logic / data hooks — **unchanged**
- Widget customizer / ordering / resize paths — **untouched** (shell already Phase 2)

---

## Deferred residuals (not blocking)

1. **Sidebar P3** — intentional skip (audit P3; large nav work out of scope).
2. **Header dual-row attendance strip** — tightened padding only; still a second row on `md+` when clocked in (folding into primary row deferred).
3. **Widget fixed heights** (`widget.h`) — left intact to preserve customizer resize contract.
4. **EmptyState default variant `font-extrabold`** — still optional Phase 2 residual; compact path used by dashboard.
5. **True volume-metric (non-%-to-goal) large-number layout** — Calls/Bookings correctly keep rings; no volume-only KPI sibling required a ring→number swap.
6. **Phase 4 design-language doc** — **done.** Canonical DLS in `ui-registry.md`; visual baseline in `directives/wave1-visual-baseline.md`; close-out in `directives/wave1-complete.md`.
