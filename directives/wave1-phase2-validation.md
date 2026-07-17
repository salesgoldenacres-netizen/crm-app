# Wave 1 Phase 2 Validation Report

**Date:** 2026-07-13  
**Scope:** Shared primitives only (`Card`, `.card-premium`, `.widget-shell`, `WidgetHeader`, `EmptyState`, `CircularProgressRing`, radius/type/spacing/elevation CSS, WidgetGrid shell, branding defaults)  
**Method:** Static code review of current sources + branding write paths. No runtime UI pass. No Phase 3 work performed.

---

## Verdict

**APPROVE Phase 3**

Phase 2 shared primitives meet the locked contracts: single `--radius` (default 12px), coherent card/widget shell without hover-translate, typography utilities, compact `EmptyState`, standardized `WidgetHeader`, and tokenized `CircularProgressRing`. No blockers found that require fixes before Phase 3 entry. Residual notes below are non-blocking.

---

## Diff / scope summary

Git lives under `telecaller-app/` (workspace root is not a repo). Phase 2 target files are largely **untracked** (`??`) after the JS→TS migration, so there is **no clean isolated Phase 2 commit diff**. Observed scope from file inspection + `ui-registry.md` Wave 1 Phase 2 section:

| Area | Files | Nature of change |
| --- | --- | --- |
| Radius / shell CSS | `src/index.css` (`MM`) | `:root --radius: 12px`; `.rounded-theme*`; `.widget-shell`; `.card-premium` → `var(--radius)`; `type-*`, `space-*`, `shadow-elevation-*` |
| Card | `src/shared/components/ui/Card.tsx` | `rounded-theme` + `shadow-elevation-sm` + theme borders |
| WidgetHeader | `src/shared/components/ui/WidgetHeader.tsx` | New shared chrome (icon / title / actions; compact\|comfortable) |
| EmptyState | `src/shared/components/ui/EmptyState.tsx` | `variant="compact"`, presets, theme tokens; `EmptyStateCompact` helper |
| CircularProgressRing | `src/shared/components/CircularProgressRing.tsx` | Theme stroke/text; no nested gray card; API unchanged |
| WidgetGrid shell | `src/features/dashboard/components/WidgetGrid.tsx` | `widget-shell` + `rounded-theme` + `WidgetHeader`; no `-translate-y` hover |
| Branding defaults | `useBrandingStore.ts`, `useBrandingSettings.ts` | `borderRadius: 12` defaults; saved Firestore values read when present |
| Docs | `ui-registry.md`, audit appendix | Contracts documented |

**Out of Phase 2 (intentionally untouched for Phase 3):** widget body interiors (leaderboard medals, pipeline colors, one-off empties), Admin, DataTable, DashboardHeader emoji chrome.

---

## Checklist results (table)

| Checklist item | Result | Evidence |
| --- | --- | --- |
| **Radius — primitives derive from `--radius`** | **PASS** | `Card` → `rounded-theme` (`Card.tsx:13`); `.card-premium` / `.widget-shell` / `.rounded-theme` → `border-radius: var(--radius)` (`index.css:684–686`, `749–750`, `760–763`); ring wrapper `rounded-theme` (`CircularProgressRing.tsx:102`); EmptyState `rounded-theme` (`EmptyState.tsx:94`) |
| **Radius — default branding 12px** | **PASS** | `:root { --radius: 12px; }` (`index.css:219`); `DEFAULT_BRANDING.borderRadius: 12` (`useBrandingStore.ts:32`); `defaultTheme.borderRadius: 12` (`useBrandingSettings.ts:34`) |
| **Radius — saved branding preserved (no migration writes)** | **PASS** | Read path: `data.borderRadius !== undefined ? Number(...) : 12` (`useBrandingStore.ts:113–114`); CSS apply uses stored value (`207–209`). `brandPalettePatch()` writes **colors only** — no `borderRadius` (`brandPalette.ts:35–51`). Indigo migrate does not overwrite radius. |
| **Radius — no `rounded-xl` / `rounded-2xl` / 20px in listed primitives** | **PASS** | Grep on `Card.tsx`, `WidgetHeader.tsx`, `EmptyState.tsx`, `CircularProgressRing.tsx`, and `.card-premium`/`.widget-shell` blocks: no `rounded-xl`, `rounded-2xl`, or `1.25rem`. (Icon circle uses `rounded-full` in EmptyState — not forbidden.) |
| **Card/shell — one consistent shell language** | **PASS** | Canonical: theme card + `border-theme-border` + `var(--radius)` + soft elevation. WidgetGrid maps `standard` / `raised` / `frosted` / `borderless` as light variants of the same shell (`WidgetGrid.tsx:351–366`, `372`), not alternate radius systems. |
| **Card/shell — hover translate removed** | **PASS** | `.widget-shell` hover = border-color only (`index.css:754–756`); `.card-premium:hover` = shadow/border only (`769–771`); WidgetGrid class string has **no** `hover:-translate-y` (`372–376`). |
| **Card/shell — soft consistent elevation** | **PASS** | `--elevation-sm` / `--elevation-md` + `.shadow-elevation-sm|md` (`index.css:221–222`, `738–742`); Card + WidgetGrid use `shadow-elevation-sm`; raised uses `shadow-elevation-md`. |
| **Card/shell — theme-token borders only** | **PASS** | `border-theme-border` / `var(--theme-border)` on Card, card-premium, widget shells, EmptyState. |
| **Card/shell — comfortable spacing** | **PASS** | `space-widget` / `space-widget-compact` / `gap-widget*` (`index.css:724–734`); WidgetHeader densities `px-4 py-2` / `px-5 py-3` (`WidgetHeader.tsx:36–37`); WidgetGrid body `p-3.5` / `p-5` (`396–397`). |
| **Card/shell — no widget logic changes** | **PASS** *(shell-scoped)* | Preference filter, long-press customizer, fixed `widget.h`, `getWidgetColSpan`, and per-id `switch` render path remain (`345–447+`). Shell presentation swapped to `widget-shell` + `WidgetHeader`. **Caveat:** file is untracked TS; no baseline JSX diff available — judgment from structural inspection only. |
| **Typography — hierarchy utilities exist & map correctly** | **PASS** | `type-page-title` (700), `type-section-title` (600), `type-card-title` (600), `type-label` / `type-secondary` (400 muted), `type-kpi` (700 tabular) (`index.css:697–721`). Used by WidgetGrid section title, WidgetHeader, CircularProgressRing. |
| **Typography — reduced unnecessary font-black in primitives** | **PARTIAL** | Card / WidgetHeader / CircularProgressRing: no `font-black`. EmptyState **compact** uses `font-semibold` (`EmptyState.tsx:120`). EmptyState **default** still uses `font-extrabold` (`EmptyState.tsx:120`). Not a Phase 3 blocker. |
| **Typography — interactive controls readable** | **PASS** | Theme text tokens on titles/actions; WidgetHeader title `text-theme-text` + size floors `text-xs`/`text-sm`. |
| **Typography — no hardcoded gray/slate in touched primitives** | **PASS** | Card, WidgetHeader, EmptyState, CircularProgressRing use `text-theme-*` / `border-theme-*` / `bg-theme-*` only. |
| **EmptyState — compact dashboard variant** | **PASS** | `variant?: "default" \| "compact"` (`EmptyState.tsx:66–67`); compact padding/type (`95–97`, `118–129`); `EmptyStateCompact` (`140–142`). |
| **EmptyState — backwards compatible API** | **PASS** | Existing `title` / `description` / `icon` / `action` retained; new props optional with defaults (`variant="default"`, `preset="default"`). |
| **EmptyState — widgets can adopt without custom impls** | **PASS** | Presets: `leads` / `tasks` / `activity` / `search` / `bookings` (`13–55`). Dashboard widgets **not yet** consuming it (expected Phase 3). |
| **EmptyState — theme tokens only** | **PASS** | `bg-theme-card` / `border-theme-border` / `text-theme-text` / `text-theme-muted` / `bg-theme-surface` (`94–128`). |
| **WidgetHeader — consistent icon/title/action layout** | **PASS** | Flex row; icon slot; truncate title; optional actions (`WidgetHeader.tsx:33–59`). |
| **WidgetHeader — shared spacing** | **PASS** | Density padding as above; icon `mr-2`; actions `gap-1.5`. |
| **WidgetHeader — no decorative chrome** | **PASS** | Border-b only; no emoji/badges/pulse in the primitive. |
| **WidgetHeader — backwards compatible** | **PASS** | New component; WidgetGrid adopted as consumer. Optional props; no breaking renames of prior public API. |
| **CircularProgressRing — theme-token colors** | **PASS** | Track `text-theme-border`; progress default `text-theme-accent`; labels `text-theme-text` / `text-theme-muted` (`22`, `51`, `60`, `70–77`, `88–94`). |
| **CircularProgressRing — no nested gray card** | **PASS** | Non-inline wrapper is transparent shell + `rounded-theme` only (`100–102`); comment documents intent. |
| **CircularProgressRing — remains progress visualization** | **PASS** | %-to-goal stroke math unchanged (`27–31`); docstring restricts use (`13–16`). |
| **CircularProgressRing — API unchanged** | **PASS** | Props: `value`, `max`, `label`, `colorClass?`, `strokeWidth?`, `size?`, `inline?` (`3–11`). |
| **CircularProgressRing — dark mode OK** | **PASS** | Relies on theme tokens (appearance layer writes structural vars via `useThemeStore` / `applyAppearance`). |
| **Global — theme switching** | **PASS** *(code-path)* | Appearance remains in `useThemeStore.ts` (`features/settings`); Phase 2 primitives consume CSS vars, do not own appearance writes. |
| **Global — branding customization** | **PASS** *(code-path)* | Store still applies `--radius` from `borderRadius` / `roundedCards`; customizer defaults 12 without forcing writes on existing docs. |
| **Global — widget customize / order / resize** | **PASS** *(code-path)* | `useDashboardPreferencesStore` `DEFAULT_WIDGETS` + `widgetStyle` intact; WidgetGrid still filters `visible`, uses `widget.w`/`widget.h`, customizer long-press. |
| **Global — responsive layouts** | **PASS** | Grid classes unchanged: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3` (`343`). |
| **Global — keyboard/a11y not regressed in primitives** | **PASS** | WidgetHeader/`Card` spread HTML attrs; EmptyState spreads attrs; ring SVG `aria-hidden` with visible text labels; no new click-trapping chrome. |
| **Global — no business logic changes** | **PASS** | No KPI formulas, preference schema, or widget ID model changes in Phase 2 primitives. |

---

## Critical judgment

**MOSTLY**

Shared primitives now define a single inheritable chrome language (radius via `--radius`, `widget-shell` + elevation, `WidgetHeader`, compact `EmptyState`, tokenized ring, `type-*` weights). Any Agent dashboard widget can adopt that chrome **without redesigning the shell**.

Not a full **YES** because:

1. Widget **interiors** still carry pre-Phase-2 debt (gray/emoji/one-off empties) — Phase 3 adoption work, not a primitive gap.
2. `widgetStyle` variants (borderless / raised / frosted) still fork surface treatment slightly while sharing radius.
3. `type-*` utilities encode **weight/color**, not a full size scale — consumers still choose sizes locally.
4. EmptyState **default** title still uses `font-extrabold` (compact path is correct).

None of these block Phase 3; they define what Phase 3 must adopt vs leave alone.

---

## Phase 3 entry criteria

| Criterion | Status |
| --- | --- |
| Shared primitives visually coherent | **MET** |
| Radius unified through `--radius` | **MET** |
| Typography hierarchy consistent | **MET** (minor residual: EmptyState default `font-extrabold`) |
| Widget headers standardized | **MET** |
| Empty states reusable compact pattern | **MET** |
| CircularProgressRing tokenized and visually lighter | **MET** |
| No regressions to theming, branding, customization | **MET** (static code-path review; recommend a short manual smoke before/while Phase 3) |

---

## Required fixes (if any) before Phase 3

**None required.**

Optional (non-blocking) cleanup if touched during Phase 3:

- Soften EmptyState default title from `font-extrabold` → `font-semibold` / `type-card-title` (`EmptyState.tsx:120`).
- Nearby non-primitive CSS still hardcodes radius on `.input-premium` / `.btn-premium-*` (`0.875rem`, `index.css:786`, `816`, `846`) and keeps button hover `translateY` — **out of Phase 2 primitive scope**; do not expand Wave 1 into those unless needed.

---

## Evidence notes (file:line citations)

### Radius contract
- `telecaller-app/src/index.css:219` — `--radius: 12px`
- `telecaller-app/src/index.css:7` — `@theme --radius-theme: var(--radius)`
- `telecaller-app/src/index.css:684–694` — `.rounded-theme` / `-b` / `-t`
- `telecaller-app/src/index.css:749–756` — `.widget-shell` + no-translate hover
- `telecaller-app/src/index.css:760–771` — `.card-premium` uses `var(--radius)`; elevation hover only
- `telecaller-app/src/shared/components/ui/Card.tsx:8–15` — `rounded-theme` + theme border + `shadow-elevation-sm`
- `telecaller-app/src/features/admin/hooks/useBrandingStore.ts:32`, `113–114`, `207–209` — default 12; preserve saved; apply `--radius`
- `telecaller-app/src/shared/constants/brandPalette.ts:35–51` — palette patch omits `borderRadius`

### Shell / WidgetGrid
- `telecaller-app/src/features/dashboard/components/WidgetGrid.tsx:277–293` — section strip uses `rounded-theme` + type utilities
- `telecaller-app/src/features/dashboard/components/WidgetGrid.tsx:372–392` — `widget-shell rounded-theme` + `WidgetHeader`; no translate hover
- `telecaller-app/src/features/dashboard/components/WidgetGrid.tsx:345–447` — visibility filter, height style, widget switch intact

### Typography / Empty / Header / Ring
- `telecaller-app/src/index.css:697–734` — `type-*` + `space-*` + elevation helpers
- `telecaller-app/src/shared/components/ui/WidgetHeader.tsx:22–59` — contract implementation
- `telecaller-app/src/shared/components/ui/EmptyState.tsx:57–142` — compact + presets + compatibility
- `telecaller-app/src/shared/components/CircularProgressRing.tsx:18–114` — tokens; no nested gray card; stable props
- `ui-registry.md:134–156` — Phase 2 contracts documented

### Residual (not blockers)
- `EmptyState.tsx:120` — default variant `font-extrabold`
- `index.css:786,816,846` — `.input-premium` / `.btn-premium-*` still `0.875rem` (outside listed primitives)
- Widget interiors still unused EmptyState (Phase 3)
