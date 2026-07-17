# Wave 7 Phase 2B — Agent 3 Notes (UX States)

**Status:** Implemented — Copilot loading / empty / error / offline / AI-disabled  
**Date:** 2026-07-14  
**Role:** Agent 3 only (SC-1 presentation states)  
**App:** `telecaller-app/`  
**DLS:** v1.4 unchanged  

---

## What shipped

| Path | Role |
| --- | --- |
| `src/features/leads/copilot/CopilotAlert.tsx` | Feature-local alert banner (no shared DLS `Alert`; mirrors existing `role="alert"` strips) |
| `src/features/leads/copilot/useOnlineStatus.ts` | `navigator.onLine` + online/offline listeners |
| `src/features/leads/copilot/SalesCopilotDrawer.tsx` | Offline / AI-disabled banners; skip AI when offline; retry token; leave `safetyNotice` for Agent 4 |
| `src/features/leads/copilot/LeadBriefCard.tsx` | LoadingSpinner, EmptyState, CopilotAlert, Badge, Card, Retry |
| `src/features/leads/copilot/NextActionCard.tsx` | Card + EmptyState + channel Badge |
| `src/features/leads/copilot/ReadinessCard.tsx` | Card + EmptyState + band Badge |
| `src/features/leads/copilot/TimelineHighlights.tsx` | Card + EmptyState (`preset="activity"`) |
| `src/features/leads/copilot/index.ts` | Exports `CopilotAlert`, `useOnlineStatus`, `LeadBriefFallbackKind` |

**Not modified:** `shared/ai`, Lead Detail redesign, Timeline / intelligence formulas, DLS / `ui-registry.md`, `safetyNotice` ownership (Agent 4).

---

## States covered

| State | Where | Behavior |
| --- | --- | --- |
| **Loading** | Lead Brief | `LoadingSpinner` + “Loading brief…” while `orchestrator.run` |
| **Empty** | All cards | Compact `EmptyState` when no brief / NBA / readiness / timeline |
| **Error** | Lead Brief (+ drawer) | `CopilotAlert` danger + **Retry**; rules fallback when available |
| **Offline** | Drawer banner + Brief | Warning alert; **no AI call**; Wave 6 rules brief; badge `Rules (offline)` |
| **AI-disabled** | Drawer banner + Brief | Muted alert; rules brief or disabled EmptyState; badge `Rules (AI off)` / `AI off` |

NBA / readiness / timeline remain Wave 6 data (Agent 2) — only empty presentation polished.

---

## Primitives reused

- `Card`, `Badge`, `LoadingSpinner`, `EmptyState`, `Button`
- Feature `CopilotAlert` (shared `Alert` does not exist in DLS — not invented as a registry primitive)
- **No** Skeleton redesign; **no** DLS bump

---

## Agent 4 coordination

- Agent 3 owns presentation states in drawer/cards.
- `safetyNotice` prop left as Agent 4 display hook (unchanged chrome).
- Prefer Agent 3 for further UX-state edits if both touch `SalesCopilotDrawer`.

---

## Hard rules respected

- No `shared/ai` edits
- No CRM writes
- No Lead Detail redesign beyond existing Copilot mount
- No Timeline / intelligence formula changes
- Offline = rules intelligence only (Wave 7 AI architecture)

---

## Validation

From `telecaller-app/` on 2026-07-14:

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | **PASS** (exit 0) |

---

## STOP

Agent 3 complete. Hand off to Agent 4 (safety / `safetyNotice`) / Agent 5 validation. Do not implement Agents 4–5 in this slice.
