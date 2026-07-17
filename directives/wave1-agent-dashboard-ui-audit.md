# Wave 1 — Agent Dashboard UI/UX Audit

**Scope:** Agent dashboard (`WidgetGrid` + in-grid widgets), shared chrome it depends on (header, sidebar, `Card` / `EmptyState` / `CircularProgressRing`), empty states on the agent dashboard.  
**Out of scope:** Admin surfaces, DataTable, filters, forms, modals, Maps/Training HQ pages (except as non-goals).  
**Constraint:** Presentation-only modernization later; existing CSS vars + `theme-*` only; no new token architecture.  
**Density target:** ~70% Linear/Stripe content density + ~30% Salesforce chrome; open dashboard canvas; keep sidebar/header compact.  
**Guiding question:** Would a first-time user understand this faster than before? If no, do not change it.

**Sources reviewed:** `ui-registry.md`, `telecaller-app/src/index.css`, `WidgetGrid.tsx`, `DashboardHeader.tsx`, `DesktopSidebar.tsx`, `sidebarNavStyles.ts`, KPI widgets + `CircularProgressRing.tsx`, `PipelineFunnelWidget.tsx`, `LeaderboardWidget.tsx`, activity/tasks/insights widgets, `Card.tsx`, `EmptyState.tsx`, `useBrandingStore.ts` / `brandPalette.ts`, `useDashboardPreferencesStore.ts` (`DEFAULT_WIDGETS`). `theme_audit_results.txt` skimmed for signal only (file is partially stale vs current theme-token migrations).

---

## Executive Summary

The Agent dashboard already sits on a coherent brand shell (`app-canvas`, `sidebar-brand-rail`, `header-brand-strip`, semantic `theme-*` on the grid chrome) and the KPI rings correctly encode %-to-goal. The main UX debt is **equal visual weight across widgets**, **legacy gray/indigo/emoji chrome inside widget bodies**, and **radius/elevation inconsistency** between `--radius` (8px), `rounded-xl` shells (12px), and `card-premium` (20px). Header status/streak chrome still reads consumer-app rather than enterprise CRM. Wave 1 is **ready for presentation polish** without architecture or logic changes; prioritize hierarchy, token cleanup inside widgets, quieter chrome, and shared empty-state pattern. **Overall readiness: Medium — shippable product with clear, implementable Wave 1 visual fixes.**

---

## Design Debt Scoreboard

| Area | Design Debt | Priority | Rationale (1 line) |
| --- | --- | --- | --- |
| Agent Dashboard (composition / WidgetGrid) | Medium | P1 | Flat equal-weight grid + fixed heights + hover lift; no Tier 1/2/3 scanning path |
| Header (DashboardHeader) | High | P1 | Persistent emoji status, sparkles/`animate-pulse`, streak badge — chrome noise vs compact enterprise bar |
| Sidebar | Low | P3 | Brand rail + nav helpers are solid; keep compact; only minor token/consistency polish |
| KPI Section | High | P1 | Rings are right metaphor, but gray nested cards + equal ring weight + celebration emoji blur Tier 1 goals |
| Pipeline | Medium | P1 | Meaning is weak (cumulative bars + indigo/gray tokens); first-time scan slower than needed |
| Leaderboard | High | P1 | Medal/phone emoji + gray borders + name truncate — looks toy, hard to scan professionally |
| Activity (Recent Call Timeline) | Medium | P2 | Usable list; gray/italic empties and ad-hoc status chips vs theme tokens |
| Tasks | Medium | P2 | Functional; tiny controls + gray empty; not using shared empty pattern |
| Widget Chrome (shared shell) | High | P1 | `rounded-xl` shells ≠ `--radius` ≠ `card-premium` 20px; hover lift fights density target |
| Empty States | Medium | P1 | `EmptyState` exists but dashboard widgets use one-off italic `text-gray-400` lines |

---

## Audit by Area

### 1. Agent Dashboard (overall composition / WidgetGrid)

**Files:** `telecaller-app/src/features/dashboard/components/WidgetGrid.tsx`, `useDashboardPreferencesStore.ts` (`DEFAULT_WIDGETS`), `DashboardTabContent.tsx` (`getWidgetColSpan`)

#### Keep

- Semantic theme wiring via `SEMANTIC_THEME` (`text-theme-accent`, `bg-theme-card border-theme-border`) — correct Wave 1 token path.
- Section strip: `rounded-xl border border-theme-border bg-theme-card` + “Operations Overview” + Customize — clear entry point without admin chrome.
- Announcement banner typed by `success` / `warning` / `important` using `theme-success|warning|danger` — meaningful, not decorative.
- Responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3` — open canvas, good density baseline.
- Lucide icons in widget headers (not emoji) — professional and scannable.
- Customizer long-press + dashed accent ring only when `isCustomizerOpen` — power-user affordance without permanent chrome.

#### Problems

**P1 — No Tier 1/2/3 visual hierarchy**

- **Current issue:** Default order places Calls / Bookings / Team Goals / Events / Leaderboard / Pipeline at equal card weight (`rounded-xl`, same header, same `h: 280–285`, same hover). All widgets compete.
- **Why it hurts enterprise UX:** First-time agents cannot tell what to look at first; Salesforce-like “what matters today” is missing while Linear/Stripe density is undermined by equal chrome on every tile.
- **Recommendation:** Visually promote Tier 1 (Calls Today, Bookings, Team Goals) — slightly larger type or denser body, optional subtle accent on header icon only; demote Tier 3 (Coaching Tip, Leave, Events) with quieter headers / less hover emphasis. Do **not** change data or widget IDs.
- **Why — expected user benefit:** Faster “am I on track?” scan in &lt;3 seconds.

**P2 — Fixed pixel heights + hover motion**

- **Current issue:** `style={{ height: \`${widget.h}px\` }}` plus `hover:shadow-md hover:-translate-y-0.5` and `transition-all duration-300` on every card.
- **Why it hurts enterprise UX:** Fixed heights clip or pad unevenly; lift-on-hover feels dashboard-toy and adds motion noise in persistent chrome.
- **Recommendation:** Prefer min-height or density-driven padding; drop translate-Y hover (keep subtle border/shadow if needed). Align with density target: content first.
- **Why — expected user benefit:** Cleaner scan, less distraction, more readable lists inside cards.

**P2 — Widget style variants fight a single premium language**

- **Current issue:** `widgetStyle` branches (`borderless`, `raised`, `frosted`) plus special-case `todayEvents` tint (`bg-theme-accent-muted/40`).
- **Why it hurts enterprise UX:** Same product can look like three different design systems per user preference.
- **Recommendation:** Keep customizer, but make **standard** the Wave 1 canonical look (theme card + single radius); treat raised/frosted as light variants of the same shell, not alternate design languages.
- **Why — expected user benefit:** Predictable UI across agents; less “settings changed my product.”

#### Design Debt: Medium | Priority: P1

---

### 2. Header (DashboardHeader)

**File:** `telecaller-app/src/features/dashboard/components/DashboardHeader.tsx`  
**CSS:** `header-brand-strip` in `index.css`

#### Keep

- Compact `h-14` primary bar aligned with sidebar brand seam (documented in `DesktopSidebar`).
- `header-brand-strip` + `bg-theme-card border-theme-border` — brand wash without heavy Salesforce chrome.
- Clock In CTA using `bg-theme-accent text-theme-accent-fg`.
- Notifications dropdown on theme tokens; unread badge `bg-theme-danger`.
- Secondary attendance strip (`hidden md:flex`) for Shift/Break — useful ops data, correctly secondary to the title row.
- Theme toggle present (compact).

#### Problems

**P1 — Decorative motion + emoji in persistent chrome**

- **Current issue:** `Sparkles` with `animate-pulse` beside “CRM Workspace”; streak `🔥`; status labels are emoji-prefixed (`🟢 Available`, `☕ On Break`, …); break badge and live dot use `animate-pulse`.
- **Why it hurts enterprise UX:** Violates locked rule (no decorative emoji/pulse in persistent chrome). Reads consumer/gamified; status is harder to parse at a glance than color + text.
- **Recommendation:** Remove sparkles pulse (static icon or drop icon). Replace status emoji with small Lucide/dot + label. Keep streak as number + muted “Streak” label (celebration emoji only on transient toast if desired). Reserve `animate-pulse` for true live “on break / clocked in” only if it aids recognition — prefer solid success/warning dots.
- **Why — expected user benefit:** Calmer professional header; status readable in &lt;1s without decoding emoji.

**P2 — Dual-row header height on desktop**

- **Current issue:** Main `h-14` + attendance strip (`py-2`) when clocked in.
- **Why it hurts enterprise UX:** Density target wants compact chrome; two rows push content down.
- **Recommendation:** Keep data, tighten strip typography/padding (`text-[10px]`, less vertical padding) or fold key timers into the primary row on `lg+`.
- **Why — expected user benefit:** More vertical space for widgets without losing attendance awareness.

**P3 — `rounded-full` / `rounded-2xl` chrome mix**

- **Current issue:** Pills (`rounded-full`) for Clock In/status; status menu `rounded-2xl`; notifications `rounded-xl`.
- **Why it hurts enterprise UX:** Radius debt compounds with widget shells.
- **Recommendation:** Prefer single `--radius` (target 12px later) for menus; keep pills only for true status chips if needed.
- **Why — expected user benefit:** Consistent, quieter chrome.

#### Design Debt: High | Priority: P1

---

### 3. Sidebar

**Files:** `telecaller-app/src/shared/components/DesktopSidebar.tsx`, `sidebar/sidebarNavStyles.ts`, `ui-registry.md` (Desktop Sidebar Navigation)

#### Keep

- `sidebar-brand-rail` forest gradient; gold active inset via `shadow-[inset_3px_0_0_0_#e8c84a]` — strong brand, independent of appearance mode (`index.css` overrides).
- Compact widths `w-[248px]` / `w-[72px]`; brand header `h-14` aligned with dashboard header.
- Shared helpers: `sidebarNavItem`, `sidebarGroupRow`, `sidebarSubItem`, `sidebarCategoryClass` — consistent 13px/12px/10px type scale.
- Feature-tinted icons via `navIconColor` / `sidebarIcon` — aids wayfinding (do not flatten to monochrome unless testing proves faster; current pattern is documented in ui-registry).
- Collapse control and logo/company label from branding store.

#### Problems

**P3 — Icon rainbow vs content density**

- **Current issue:** Many distinct hue classes (indigo/emerald/amber/purple/…).
- **Why it hurts enterprise UX:** Slightly busy next to a calm dashboard canvas; not a comprehension blocker.
- **Recommendation:** Keep colors (wayfinding works). Optional Wave 1: slightly reduce saturation only if header/widgets are quieted first — do not redesign nav IA.
- **Why — expected user benefit:** Preserve learned navigation; avoid a learning curve.

**P3 — Hardcoded gold `#e8c84a` in inset bar**

- **Current issue:** Active inset uses literal gold, not `var(--secondary-color)`.
- **Why it hurts enterprise UX:** Minor branding drift if secondary changes via branding store.
- **Recommendation:** If touching sidebar styles, map inset to secondary token; else leave (not user-facing confusion).
- **Why — expected user benefit:** Brand consistency when admins retheme.

#### Design Debt: Low | Priority: P3

---

### 4. KPI Section

**Files:** `widgets/CallsTodayWidget.tsx`, `BookingsTodayWidget.tsx`, `TeamGoalsWidget.tsx`, `TelecallerMetricsWidget.tsx`, `shared/components/CircularProgressRing.tsx`

#### Keep

- **Rings for %-to-goal** — correct chart rule. Calls/Bookings/Team Goals all use `CircularProgressRing` with value/max and percent.
- Calls ring uses `activeThemeConfig.accentText` (`text-theme-accent`); Bookings uses `text-theme-success` — meaningful semantic split (activity vs conversion).
- Team Goals dual inline rings (`inline={true}`) — appropriate Tier 1 team context beside personal targets.
- TelecallerMetrics three-up stats (`Calls` / `Visits` / `Streak`) with Lucide icons — good Tier 2 summary pattern once indigo badge panel is cleaned.

#### Problems

**P1 — Ring chrome uses gray/indigo-era surfaces, not theme tokens**

- **Current issue:** Non-inline ring wraps in `bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200…`; center text `text-gray-900` / `text-gray-400`; default `colorClass = "text-indigo-600"`.
- **Why it hurts enterprise UX:** Nested “card inside card” fights WidgetGrid shell; gray/indigo fights gold+green brand (`ui-registry`).
- **Recommendation:** Strip nested card chrome for dashboard KPI use (inline or transparent). Use `text-theme-text` / `text-theme-muted` / track `theme-border` or `theme-surface`. Default stroke to `text-theme-accent`.
- **Why — expected user benefit:** KPIs read as content, not double-framed widgets; brand-consistent at a glance.

**P1 — Equal visual weight + celebration emoji in body**

- **Current issue:** Calls/Bookings/Team Goals all centered rings of similar size; copy uses `🎉` when target hit; Team Goals custom line prefixes `🎯` and `border-indigo-200`.
- **Why it hurts enterprise UX:** Tier 1 personal goals don’t outrank Tier 2 team/metrics; emoji celebration is persistent in the widget, not transient.
- **Recommendation:** Slightly emphasize personal Calls/Bookings (size or label weight); Team Goals secondary; TelecallerMetrics tertiary. Replace persistent `🎉` with success color + “Target met” text; show emoji only in a toast if product already toasts.
- **Why — expected user benefit:** Clearer goal hierarchy; celebration feels earned, not wallpaper.

**P2 — TelecallerMetrics indigo badge panel**

- **Current issue:** `border-indigo-100 … bg-indigo-50/60`, progress `bg-indigo-500`; next badge still shows `nextBadge.icon` (likely emoji).
- **Why it hurts enterprise UX:** Legacy indigo island; badge emoji adds noise.
- **Recommendation:** Remap panel to `theme-accent-muted` / `theme-accent` / `theme-border`. Prefer Lucide or plain text for next badge name.
- **Why — expected user benefit:** Performance block matches the rest of the CRM.

#### Design Debt: High | Priority: P1

---

### 5. Pipeline

**File:** `telecaller-app/src/features/dashboard/components/PipelineFunnelWidget.tsx`

#### Keep

- Simple horizontal progress-per-stage list — easy to implement and denser than a heavy chart library.
- Stage order New → Contacted → Interested → Booked matches sales mental model.
- Percentages alongside counts — good for %-of-pipeline meaning when labels are clear.

#### Problems

**P1 — Funnel meaning is ambiguous for first-time users**

- **Current issue:** First bar labeled “New & Active” with `count: totalActive` and `pct: 100`; subsequent steps are **cumulative** (Contacted includes Interested+Booked). Bars use `bg-blue-500` / `bg-indigo-500` / `bg-amber-500` / `bg-emerald-500`; labels `text-gray-500`.
- **Why it hurts enterprise UX:** Looks like four independent metrics but encodes a funnel; indigo/blue ignore brand; gray labels ignore `theme-muted`.
- **Recommendation:** Keep cumulative funnel math (no business-logic rewrite). Clarify labels (e.g. “Reached Contacted+” or show stage-only counts if clearer — prefer label clarity over math change). Recolor bars to theme progression (accent → accent-muted → warning/gold → success). Use `text-theme-muted` / `bg-theme-surface` track.
- **Why — expected user benefit:** User understands conversion drop-off faster without asking “why is everything 100%?”

**P2 — No empty / zero-pipeline state**

- **Current issue:** All zeros still render four bars at 0%/100% pattern.
- **Why it hurts enterprise UX:** Empty pipeline looks broken rather than empty.
- **Recommendation:** When `totalActive === 0`, show compact empty copy (shared empty pattern).
- **Why — expected user benefit:** Confidence that the widget works.

#### Design Debt: Medium | Priority: P1

---

### 6. Leaderboard

**File:** `telecaller-app/src/features/dashboard/components/LeaderboardWidget.tsx`

#### Keep

- Top-3 slice — right density for a dashboard tile (not a full admin leaderboard).
- Score emphasis via `activeThemeConfig.accentText` for points.
- Sorting by composite score already present (do not change scoring in Wave 1).

#### Problems

**P1 — Emoji medals + emoji calls + gray chrome**

- **Current issue:** `🥇🥈🥉`, `📞 {calls}`, borders `border-gray-100 dark:border-gray-700/50`, empty `text-gray-400`, name `max-w-[70px]` truncate.
- **Why it hurts enterprise UX:** Toy aesthetic; names unreadable; gray not theme; phone emoji slower than a column header.
- **Recommendation:** Rank as `1`/`2`/`3` with optional subtle gold/silver/bronze **text color** from existing secondary/muted tokens (no emoji). Columns: name (wider truncate), calls (numeric), pts (bold accent). Borders `border-theme-border`. Empty via shared empty pattern.
- **Why — expected user benefit:** Professional competitive scan; names and scores readable.

**P2 — WhatsApp counted in score but not shown**

- **Current issue:** Score includes WhatsApp weight; UI only shows calls + pts.
- **Why it hurts enterprise UX:** Opaque scoring (learning curve).
- **Recommendation:** Optional tiny muted “WA” count **or** a title tooltip “Score = calls/WA/bookings” — only if it clarifies without clutter. Prefer tooltip on “pts” label over new columns if space is tight.
- **Why — expected user benefit:** Trust in the ranking without opening admin docs.

#### Design Debt: High | Priority: P1

---

### 7. Activity

**Primary:** `widgets/CallLogsWidget.tsx` (“Recent Call Timeline”)  
**Related Tier 3:** `TodayEventsWidget.tsx`, `CoachingTipWidget.tsx` (insights-adjacent)

#### Keep

- Call log rows with lead name as `text-theme-accent` click target — clear action path.
- Status chips with semantic colors for booked / site-visit / interested — meaning-driven.
- Scroll region `max-h-[220px]` — good density inside fixed widget height.
- Coaching tip quote layout is calm (large quote marks, italic body) — keep structure; only clean emoji category chip.
- Events widget Lucide Cake/Gift — better than emoji icons for type.

#### Problems

**P2 — Gray/italic empty and body tokens**

- **Current issue:** Empty: `text-[11px] text-gray-400 italic`; notes/times `text-gray-400`; row borders gray.
- **Why it hurts enterprise UX:** Feels unfinished vs theme shell; italic empty states look like errors.
- **Recommendation:** `text-theme-muted`, `border-theme-border`; non-italic empty via shared compact empty.
- **Why — expected user benefit:** Timeline feels part of the same product.

**P2 — Events celebration copy + Gift header icon**

- **Current issue:** Widget header uses `Gift` for “Today’s Events”; body copy `Call to wish! 🎉`; row chrome `border-rose-50` / white-gray surfaces.
- **Why it hurts enterprise UX:** Events are Tier 3 but visually loud (rose + celebration); header Gift is slightly off for mixed event types.
- **Recommendation:** Soften to theme surfaces; drop persistent 🎉 from copy; Calendar/Party Lucide only. Keep birthday meaning.
- **Why — expected user benefit:** Events don’t overpower KPIs.

**P3 — Coaching category `💡` pill**

- **Current issue:** `💡 {category}` on accent pill.
- **Recommendation:** Drop emoji; keep uppercase category text.
- **Why — expected user benefit:** Tip stays insightful without sticker chrome.

#### Design Debt: Medium | Priority: P2

---

### 8. Tasks

**File:** `widgets/TasksWidget.tsx`

#### Keep

- Theme-aware add form: `border-theme-border`, `bg-theme-accent` Add button, checkbox `text-theme-accent`.
- Clear completed control on accent — good secondary action.
- Done state `line-through text-theme-muted` — clear.

#### Problems

**P2 — Undersized controls + gray empty**

- **Current issue:** Input/button `text-[10px] py-1`; empty `text-gray-400 italic`; row borders gray; input `rounded` (sharp vs card radius).
- **Why it hurts enterprise UX:** Harder to tap/read; empty looks like a stub; radius inconsistency.
- **Recommendation:** Bump to ~`text-[11px]`/`py-1.5` within widget density; `rounded-md`/`rounded-[var(--radius)]`; theme borders; shared empty when list empty.
- **Why — expected user benefit:** Tasks feel operable and consistent.

**P3 — Placeholder “Add daily goal…” vs widget title “Personal Tasks List”**

- **Current issue:** Naming mismatch (goal vs task).
- **Recommendation:** Align placeholder to “Add a task…” — tiny clarity win, no logic change.
- **Why — expected user benefit:** Less first-time confusion.

#### Design Debt: Medium | Priority: P2

---

### 9. Widget Chrome (shared card / widget shell)

**Files:** `WidgetGrid.tsx` (shell), `shared/components/ui/Card.tsx`, `index.css` (`.card-premium`, `--radius`), `useBrandingStore.ts` (`--radius` from `borderRadius || 8`)

#### Keep

- Widget header/body density switch (`compact` vs comfortable padding) — valuable for 70/30 density target.
- Semantic card class baseline `bg-theme-card border-theme-border`.
- Shared `Card` primitive already on `theme-*` + `rounded-xl` — good target pattern for alignment.
- `card-premium` hover border `color-mix` with primary — nice when used intentionally (Lead Details / premium surfaces per ui-registry).

#### Problems

**P1 — Triple radius system**

- **Current issue:**
  - `:root { --radius: 8px; }` and branding default `borderRadius || 8`
  - Widget shells / `Card`: `rounded-xl` (12px)
  - `.card-premium { border-radius: 1.25rem; }` (20px)
  - Empties: `EmptyState` `rounded-2xl`; header menus mix `rounded-xl` / `rounded-2xl` / `rounded-full`
- **Why it hurts enterprise UX:** Locked Wave 1 direction is **single `--radius`** (default **12px** later). Mixed radii make the dashboard feel pieced together.
- **Recommendation:** Document and implement toward one radius: widgets + Card + premium cards consume `var(--radius)` (or Tailwind radius theme mapped to it). Note 8 / xl / 20 as debt; Phase 2 set branding default toward 12 without new token architecture.
- **Why — expected user benefit:** Cohesive “one product” surfaces.

**P1 — Shell ≠ `card-premium`; elevation on every tile**

- **Current issue:** Dashboard widgets do not use `card-premium`; they invent hover lift. `Card` uses quieter `shadow-sm`.
- **Why it hurts enterprise UX:** Two card languages; lift adds Salesforce chrome weight we don’t want on every KPI.
- **Recommendation:** Canonical Wave 1 widget shell = theme card + border + **one** radius + optional very light shadow; no translate hover. Optionally adopt `card-premium` **without** strong hover transform for dashboard, or align `card-premium` hover to border-only for this surface.
- **Why — expected user benefit:** Comfortable spacing and consistent cards; faster scan.

#### Design Debt: High | Priority: P1

---

### 10. Empty States (shared pattern usage on Agent dashboard)

**File:** `shared/components/ui/EmptyState.tsx`  
**Usages in dashboard widgets:** none (`EmptyState` not imported under `features/dashboard`).

#### Keep

- Shared `EmptyState` API: title, description, icon, action; already on `theme-card` / `theme-border` / `theme-muted` — correct primitive for Wave 1.
- Widgets already branch on empty data (tasks, calls, leaderboard, events, leave) — behavior exists; only presentation is ad hoc.

#### Problems

**P1 — Ad-hoc empties instead of shared pattern**

- **Current issue:** Examples:
  - Leaderboard: `No stats logged.` (`text-gray-400`)
  - Tasks: `No tasks added for today.` (italic gray)
  - Call logs: `No recent calls logged yet.`
  - Events: `No events or celebrations today.`
  - Leave: `No leave requests yet.`
- **Why it hurts enterprise UX:** Inconsistent voice/weight; italic gray reads as disabled/error; full-page `EmptyState` padding (`p-8`) is too heavy **inside** a 280px widget if used raw.
- **Recommendation:** Add a **compact** variant or className preset for widget bodies (smaller padding, optional hide large icon) reusing `EmptyState` tokens. Replace one-off paragraphs on Agent dashboard widgets only.
- **Why — expected user benefit:** Empty dashboards still look intentional and on-brand; faster understanding that “no data” ≠ “broken.”

#### Design Debt: Medium | Priority: P1

---

## Cross-Cutting Findings

### Spacing

- Grid `gap-3` + widget padding `p-5` / compact `p-3.5` is a solid Linear-like baseline — **keep**.
- Fixed `widget.h` (280/285) causes internal scroll islands; prefer content-driven min-heights in Phase 2 where possible.
- Header dual row + Operations strip + announcement can stack before first KPI — tighten chrome before adding new strips.

### Typography

- Shell titles use `font-black` heavily (`Operations Overview`, `CRM Workspace`, metrics). Works for brand, but overuse flattens hierarchy — reserve blackest weight for Tier 1 numbers/titles.
- Widget bodies often `text-[9px]`–`text-[11px]` — good density; avoid going smaller on interactive controls (Tasks).
- Mixed `text-gray-*` / `text-slate-*` inside widgets vs `text-theme-*` on chrome — primary Wave 1 cleanup.

### Radius

- Debt triad: **8px** (`--radius` / branding default) · **12px** (`rounded-xl` widgets/Card) · **20px** (`card-premium` 1.25rem). Target single `--radius` @ **12px** later; map utilities to the var.

### Tokens

- Grid/header/sidebar largely migrated to `theme-*` and brand gradients — **preserve**.
- Widget interiors still gray/indigo/rose islands (`PipelineFunnelWidget`, `CircularProgressRing`, `TelecallerMetricsWidget`, `TeamGoalsWidget` indigo border, `WeeklyRosterWidget` indigo today cell + shift emoji).
- `theme_audit_results.txt` still lists many indigo hits on `DashboardHeader` that **current code has already fixed** — treat the file as historical signal, not a defect checklist.

### Emoji / motion

- **Persistent (fix):** Header status/streak/sparkles pulse; Leaderboard medals/phone; KPI 🎉; Coaching 💡; Team 🎯; Events 🎉; WeeklyRoster shift emojis (`🌅🌃🏖️`) as sole shift encoding.
- **Allowed later:** Transient celebration (toast) on target hit; optional brief success flash — not permanent widget copy.
- **Motion:** Prefer opacity/border transitions; remove decorative `animate-pulse` from title icon; keep functional live indicators minimal.

### Elevation

- Prefer border + light shadow over `hover:-translate-y` and `hover:shadow-xl` (raised style).
- Frosted/raised styles should remain variants of the same elevation language.

### Charts

- Rings = %-to-goal only — **confirmed correct** for Calls/Bookings/Team Goals.
- Pipeline bars = funnel meaning — keep type, fix color + labeling.
- Do not introduce decorative sparklines or extra chart types in Wave 1.

---

## Recommended Implementation Order (Phase 2→3)

Ordered by UX impact within Wave 1 scope only:

1. **Header quieting** — remove persistent emoji/pulse; compact status (P1, High debt).
2. **Widget shell + radius alignment** — single radius path, kill hover lift, unify card language (P1).
3. **KPI ring token cleanup + Tier 1 emphasis** — theme surfaces, no nested gray card, quieter celebration (P1).
4. **Leaderboard professionalization** — numeric ranks, theme borders, readable names (P1).
5. **Pipeline label clarity + brand colors** (P1).
6. **Compact EmptyState adoption** across dashboard widget empties (P1/P2).
7. **Activity / Tasks / Events / Coaching / Metrics / Roster token + emoji cleanup** (P2).
8. **Sidebar minor token polish** only if time (P3).

Phase 2 sets branding **default** `borderRadius` → **12** and aligns shared Card / `card-premium` / widget shell to `--radius` (no Firestore migration of saved values). Phase 3 then tunes density defaults (`comfortable` → slightly tighter), adopts compact EmptyState + WidgetHeader inside widget bodies, and optional visual Tier 1 emphasis — still presentation-only.

---

## Explicit Non-Goals (Wave 1)

- Admin dashboard / AdminDashboardHeader / Control Panel pages
- DataTable, filters, bulk actions, forms, modal/sheet redesign
- Theme engine rewrite, new token architecture, indigo→green remaps beyond existing CSS bridges
- Business logic changes (scoring formula, funnel math, attendance rules, widget visibility backend)
- Maps / Training HQ / Project maps visual overhaul
- Mobile drawer IA redesign (except incidental token consistency if touching shared empties)
- Customizer feature removal or new widget types
- Gamification system redesign (badges logic) — presentation of badge panel only if in TelecallerMetrics
- Font family replacement (Inter/Outfit remain unless branding store already controls)

---

## Success Criteria Checklist

| Criterion | Maps to | Pass when |
| --- | --- | --- |
| Better hierarchy | Dashboard composition + KPI tiers | Tier 1 goals visually dominate Tier 3 tips/events |
| Less noise | Header, emoji/motion cross-cut | No decorative emoji/pulse in persistent chrome |
| Consistent cards | Widget chrome + radius | One radius + one shell language on Agent widgets |
| Comfortable spacing | Grid gap/padding + header compact | Open canvas; chrome stays compact; no hover-lift theater |
| Clearer KPIs | KPI section + rings | %-to-goal rings on theme tokens; target met without permanent 🎉 |
| Cleaner leaderboard | Leaderboard | Top 3 readable, numeric ranks, theme borders |
| Professional dashboard | All P1 areas | Gold+green CRM, not consumer gamification |
| Same functionality | Non-goals | No logic/IA regressions; customizer still works |
| Faster scanning | Guiding question | First-time user finds “calls vs target” and status faster |
| No learning curve | Keep sections | Nav, widget set, clock-in, and ring metaphor unchanged |

---

## Regression Checklist

Every Phase 2+ change must preserve:

- Widget customization
- Widget ordering
- Resize behavior
- Theme switching
- Branding customization
- Dark mode
- Responsive layouts
- Accessibility
- Keyboard navigation
- Existing animations that communicate state

---

## Explicit Widget Contract

Formalize the Agent dashboard widget chrome so Phase 2–3 share one structure:

```
Widget
  Header — icon, title, optional actions
  Body — primary content, supporting metrics
  Footer (optional) — metadata, last updated, CTA
```

- **Header:** Lucide icon + title; actions only when they clarify the widget job (e.g. Customize lives on the section strip, not every tile).
- **Body:** Primary content first (KPI ring, list, funnel); supporting metrics secondary.
- **Footer:** Optional; prefer omitting over decorative chrome. Use for last-updated / single CTA when needed.

Shared primitive: `WidgetHeader` (icon + title + actions). Phase 2 creates it; Phase 3 adopts inside widget interiors where useful.

---

## Don't Improve This / Do Not Change

Hard scope fence — different from Keep. Do not redesign, refactor architecture, or expand scope into these:

- Widget architecture (IDs, visibility model, preference store shape)
- Grid system (responsive column model / `getWidgetColSpan` contract)
- Customizer workflow (long-press, dashed ring, open/close behavior)
- Dashboard routing
- KPI data sources / scoring formulas
- Attendance logic
- All items already listed under **Explicit Non-Goals (Wave 1)** (Admin surfaces, DataTable/filters/forms/modals, theme engine rewrite, Maps/Training HQ, gamification logic, font family replacement)

### Implementation guideline — outside-in

Phase 2+ presentation work proceeds **outside-in**:

1. Shell (canvas / sidebar / page frame)
2. Header
3. Layout (grid / section strips)
4. Typography
5. Colors / tokens
6. Content spacing

Only then change **widget interiors** (Phase 3). Do not jump to KPI/leaderboard/pipeline body polish before shared primitives (radius, Card, elevation, EmptyState, ring tokens) are aligned.

---

## Appendix — Quick code anchors for Phase 2

| Concern | Anchor |
| --- | --- |
| Grid shell / hover | `WidgetGrid.tsx` ~`rounded-xl … hover:shadow-md hover:-translate-y-0.5` |
| Default widget order/heights | `useDashboardPreferencesStore.ts` `DEFAULT_WIDGETS` |
| Header emoji/pulse | `DashboardHeader.tsx` `Sparkles … animate-pulse`, streak `🔥`, status emoji map |
| Sidebar | `DesktopSidebar.tsx` `sidebar-brand-rail`; `sidebarNavStyles.ts` |
| Ring nested card | `CircularProgressRing.tsx` non-inline wrapper `bg-gray-50… rounded-xl` |
| Pipeline colors | `PipelineFunnelWidget.tsx` `bg-blue-500` / `bg-indigo-500` |
| Leaderboard medals | `LeaderboardWidget.tsx` `medals = ["🥇","🥈","🥉"]` |
| Empty primitive | `EmptyState.tsx` — unused by dashboard widgets today |
| Radius sources | `index.css` `--radius: 12px` (default); `.card-premium` / `Card` / `widget-shell` → `var(--radius)`; branding default `borderRadius \|\| 12` (saved Firestore values unchanged) |

---

## Phase 3 completion notes (July 13, 2026)

Phase 3 widget adoption is **done**. Full batch changelog, file list, and residuals: [`directives/wave1-phase3-notes.md`](wave1-phase3-notes.md). Pattern imprint: `ui-registry.md` → Wave 1 Phase 3.

**Summary:** Batches 1–4 applied outside-in (shell already Phase 2 → interiors). Agent widgets use `gap-widget*`, `type-*`, compact `EmptyState`, theme tokens; leaderboard numeric ranks; pipeline theme bars + clearer cumulative labels; header quieted (no sparkles/emoji/pulse). `tsc --noEmit` pass. Sidebar P3 and dual-row header fold deferred.

---

## Phase 4 completion notes (July 13, 2026)

Wave 1 **approved complete**. Phase 4 docs only (no Wave 2 code):

- Canonical Design Language Spec: [`ui-registry.md`](../ui-registry.md)
- Visual baseline checklist + folder: [`wave1-visual-baseline.md`](wave1-visual-baseline.md), [`wave1-visual-baseline/`](wave1-visual-baseline/)
- Close-out: [`wave1-complete.md`](wave1-complete.md)
