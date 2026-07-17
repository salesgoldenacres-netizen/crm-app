# Wave 1.5 — Stabilization Report

**Date:** 2026-07-13  
**App:** `telecaller-app/`  
**Type:** Stabilization (presentation-only) — **not** a feature sprint  
**Plan:** [`directives/wave1.5-plan.md`](wave1.5-plan.md)  
**Governed by:** [`ui-registry.md`](../ui-registry.md), [`directives/wave1-complete.md`](wave1-complete.md)

---

## Summary

| Metric | Result |
| --- | --- |
| Fixes applied | **8 files** (surgical presentation / a11y) |
| Deferred | Profile / Training / Maps / sidebar / attendance fold / PNG capture |
| `tsc --noEmit` | **Pass** (exit 0) |
| Ready for Wave 2? | **YES** (with pending screenshot capture noted) |

---

## What was fixed (file list)

| File | Fix |
| --- | --- |
| `telecaller-app/src/features/dashboard/pages/Dashboard.tsx` | Loading skeleton: `gray-*` / `rounded-2xl` → `theme-*` / `rounded-theme`; `aria-busy` |
| `telecaller-app/src/features/dashboard/components/WidgetGrid.tsx` | Announcement dismiss: `font-extrabold` → `font-bold`, `rounded-theme`, focus ring; Customize focus ring |
| `telecaller-app/src/features/dashboard/components/DashboardHeader.tsx` | Focus-visible rings + `aria-*` on menu / status / notifications controls |
| `telecaller-app/src/features/dashboard/components/MobileStatusPanel.tsx` | Removed decorative `animate-pulse` (status dot + Zap); `font-black` → `font-bold`; `rounded-theme`; expand/dismiss focus + `aria-expanded` |
| `telecaller-app/src/features/dashboard/components/MobileDrawer.tsx` | Sparkles → `LayoutDashboard`; `font-extrabold` → `type-card-title`; `rounded-theme`; nav/close focus rings |
| `telecaller-app/src/features/dashboard/components/DashboardTabContent.tsx` | Suspense fallback `text-gray-500` → `text-theme-muted` |
| `telecaller-app/src/features/dashboard/components/CustomizerDrawer.tsx` | Section labels → `type-label`; drop `font-extrabold`; `rounded-xl` → `rounded-theme`; focus rings / aria on reorder + footer |
| `telecaller-app/src/shared/components/ui/EmptyState.tsx` | Default variant `font-extrabold` → `font-semibold` (Wave 1 residual closed) |

**Also updated docs:** `directives/wave1.5-plan.md`, this report, `directives/wave1-visual-baseline.md` (per-shot Pending status), light imprint in `ui-registry.md` §7 / §16.

---

## Consistency grep — Agent widget batch

Phase 3 widget interiors (`CallsToday`, `BookingsToday`, `TeamGoals`, `Leaderboard`, `Pipeline`, `CallLogs`, `Tasks`, `CoachingTip`, `TodayEvents`, `TelecallerMetrics`, `WeeklyRoster`, `LeaveRequests`) were already clean: **no** emoji chrome, indigo/slate/gray islands, hardcoded hex, decorative pulse, or `font-black` / `font-extrabold` remaining in widget bodies.

---

## What was found but deferred

| Item | Why deferred |
| --- | --- |
| `AgentProfileView.tsx` — indigo/gray islands, 🔥 streak emoji, hover-lift | Adjacent tab; Wave 2 / Settings-adjacent, not Agent widget grid |
| `TrainingHQView.tsx` — indigo/gray card language | Out of Wave 1.5 scope |
| `ProjectMapsView.tsx` — `font-black`, `text-gray-500`, map rgba fills | Maps fence; rgba needed for map styling |
| `agentStats.ts` badge emoji icons | Consumed by Profile badges, not persistent dashboard chrome |
| Sidebar P3 / gold inset | Explicit Wave 1 fence |
| Dual-row attendance strip fold into primary header | Explicit residual; redesign out of scope |
| Widget fixed heights / customizer resize contract | Explicit fence |
| Coaching tip quote `italic` | Meaning-preserving quote styling; not a first-time-user blocker |
| Manual baseline PNGs | App session not run this sprint; checklist marked Pending |

---

## Accessibility findings

| Area | Finding | Action |
| --- | --- | --- |
| **Focus** | Header / drawer / customizer / mobile panel buttons lacked visible `focus-visible` rings | Fixed on touched controls via `ring-theme-ring` |
| **Semantics** | Status dots already paired with text (good). Notification bell lacked unread count in accessible name | Added `aria-label` / `aria-expanded` |
| **Contrast** | Widget + header use `text-theme-muted` / `text-theme-text` (OK). Compact empties at `text-[10px]` / `text-[11px]` are dense but tokenized | Document only — no size redesign |
| **Dark mode** | Theme tokens on fixed surfaces; deferred Profile/Training still use raw `dark:bg-gray-*` | Defer to Wave 2 adoption |
| **Zoom** | Widget shells use relative typography + flex/truncate; no fixed px overflow traps spotted on header/widgets | Manual 150–200% zoom still recommended when capturing baseline |
| **EmptyState** | Compact path already semibold; default was extrabold | Default aligned to semibold |
| **WidgetHeader** | Non-interactive chrome; titles via `type-card-title` — no focus issues | No change needed |

---

## Performance notes

| Finding | Assessment |
| --- | --- |
| Phase 3 widget files | No new `useMemo` / `memo` introduced for presentation |
| `Dashboard.tsx` | Existing `useMemo` / `useCallback` for stats, events, notifications — legitimate data derivation, not Wave 1 decoration |
| `WidgetGrid` | Single `useCallback` for long-press customizer — functional, not abuse |
| Decorative motion | Removed remaining idle `animate-pulse` on mobile status chrome; skeleton pulse retained (loading-only, allowed) |
| Overall | No obvious expensive presentation patterns added in Wave 1 / 1.5 |

---

## Screenshot baseline status

All **8 required** + **3 optional** shots: **Pending** (folder + README ready; no PNGs captured).

See [`directives/wave1-visual-baseline.md`](wave1-visual-baseline.md).

---

## Ready for Wave 2?

**YES — Wave 1.5 approved by user.**

**Rationale:** Agent dashboard widget batch + primary chrome are on the DLS (tokens, type scale, quiet motion, emoji policy). Wave 1.5 closed the remaining in-scope residuals (skeleton gray islands, mobile decorative pulse, weight/radius strays, EmptyState default weight, focus rings). Deferred items are either fenced (sidebar, attendance redesign, maps) or clearly Wave 2 surfaces (Profile, Training, DataTable).

### Milestone close notes

| Item | Status |
| --- | --- |
| Wave 1.5 | **Approved** |
| Design Language Spec | Tagged **v1.0** in [`ui-registry.md`](../ui-registry.md) |
| Screenshot PNGs | Still **operational follow-up** — do **not** block Wave 2. Capture list remains in [`directives/wave1-visual-baseline.md`](wave1-visual-baseline.md). Do not invent PNGs. |
| Wave 2 next | **DataTable ecosystem** — audit first: [`directives/wave2-datatable-ui-audit.md`](wave2-datatable-ui-audit.md) |
