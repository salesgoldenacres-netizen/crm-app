# Wave 1 Visual Baseline — Screenshot Storage

Store PNG screenshots for the checklist in [`../wave1-visual-baseline.md`](../wave1-visual-baseline.md) in **this folder**.

## Filename conventions

Use kebab-case shot IDs + optional date suffix:

```
{shot-id}.png
{shot-id}-YYYYMMDD.png   # optional dated recapture
```

| Shot ID | Expected file |
| --- | --- |
| `dashboard-light` | `dashboard-light.png` |
| `dashboard-dark` | `dashboard-dark.png` |
| `dashboard-empty` | `dashboard-empty.png` |
| `tasks-populated` | `tasks-populated.png` |
| `pipeline-populated` | `pipeline-populated.png` |
| `leaderboard-populated` | `leaderboard-populated.png` |
| `dashboard-mobile` | `dashboard-mobile.png` |
| `dashboard-tablet` | `dashboard-tablet.png` |

Optional: `header-status.png`, `customizer-open.png`, `tier1-kpi-closeup.png`.

## How to capture (Windows)

1. From `telecaller-app/`, start the usual local app (`npm run dev` or your standard script).
2. Sign in as an agent with dashboard access.
3. Open the Agent CRM dashboard.
4. For each checklist row:
   - Set appearance (light/dark) as required.
   - Populate or clear widgets as required (tasks, pipeline, leaderboard).
   - Resize the browser (DevTools device toolbar) for mobile (~375×812) and tablet (~768×1024).
   - Capture the **full dashboard viewport** (or widget close-up for optional shots).
5. Save PNGs into this folder using the filenames above.
6. Prefer OS Snipping Tool, Win+Shift+S, or browser full-page screenshot — keep resolution consistent across a set (same zoom, ideally 100%).

## Notes

- Do **not** commit secrets, PII, or real customer phone numbers if avoidable — use demo/seed data.
- Baselines are reference artifacts; they can be regenerated. Prefer checking them into git once a clean demo set exists.
- If the app is not runnable locally, leave placeholders empty and capture during Wave 1.5 validation.
