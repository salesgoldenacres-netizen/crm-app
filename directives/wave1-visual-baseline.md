# Wave 1 — Visual Regression Baseline

**Purpose:** Checklist of required Agent dashboard screenshots that lock the Wave 1 visual language. Use before Wave 2 presentation work and after Wave 1.5 polish.

**Storage:** PNG files live in [`directives/wave1-visual-baseline/`](wave1-visual-baseline/). Capture instructions and filename conventions are in that folder’s [README](wave1-visual-baseline/README.md).

**Capture status (July 13, 2026 — Wave 1.5):** Checklist + folder structure ready. Screenshots **not captured** this sprint (no local app session / avoid env setup fights). Capture manually when the app is runnable; follow the README. All rows below remain **Pending**.

---

## Required shots

| # | Shot ID | Description | What to verify | Status |
| --- | --- | --- | --- | --- |
| 1 | `dashboard-light` | Agent dashboard — **light** appearance | Calm chrome; theme cards; Tier 1 rings readable; no persistent emoji/pulse | **Pending** |
| 2 | `dashboard-dark` | Agent dashboard — **dark** appearance | Same hierarchy; theme surfaces; contrast OK | **Pending** |
| 3 | `dashboard-empty` | Empty / sparse dashboard | Compact `EmptyState` in empty tiles; no italic gray one-offs | **Pending** |
| 4 | `tasks-populated` | Tasks widget with items | Readable controls; theme tokens; list scan | **Pending** |
| 5 | `pipeline-populated` | Pipeline funnel with stages | Theme bar colors; cumulative labels clear | **Pending** |
| 6 | `leaderboard-populated` | Leaderboard with ranks | Numeric ranks (no medals); names readable; theme borders | **Pending** |
| 7 | `dashboard-mobile` | Dashboard at **mobile** width (~375px) | Stacked grid; touch targets; header compact | **Pending** |
| 8 | `dashboard-tablet` | Dashboard at **tablet** width (~768px) | 2-col grid; no clipped widget titles | **Pending** |

---

## Optional extras (nice for Wave 1.5 / Wave 2)

| Shot ID | Description | Status |
| --- | --- | --- |
| `header-status` | Header with status menu open (dots + text, no emoji) | **Pending** |
| `customizer-open` | Widget customizer long-press / dashed ring state | **Pending** |
| `tier1-kpi-closeup` | Calls + Bookings rings close-up (light) | **Pending** |

---

## Regression use

1. Capture baseline PNGs once Wave 1 / 1.5 UI is approved on a reference machine.  
2. After polish or Wave 2-adjacent chrome changes that touch the Agent dashboard, recapture and visually diff against baseline.  
3. Pair with the functional regression list in [`ui-registry.md`](../ui-registry.md) §14.
