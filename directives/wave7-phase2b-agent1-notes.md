# Wave 7 Phase 2B — Agent 1 Notes (Sales Copilot Drawer Shell)

**Status:** Implemented — drawer shell + Lead Detail open trigger  
**Date:** 2026-07-14  
**Role:** Agent 1 only (SC-1 UI shell)  
**App:** `telecaller-app/`  
**DLS:** v1.4 unchanged  

---

## What shipped

| Path | Role |
| --- | --- |
| `src/features/leads/copilot/SalesCopilotDrawer.tsx` | Shared `Drawer` shell; calls `createAiOrchestrator` → `run(LEAD_BRIEF_V1_ID)` when `isAiEnabled()` |
| `src/features/leads/copilot/LeadBriefCard.tsx` | Renders `LeadBriefV1Output` (or disabled / error / loading) |
| `src/features/leads/copilot/NextActionCard.tsx` | Placeholder NBA panel — Agent 2 wires `next-action-v1` |
| `src/features/leads/copilot/ReadinessCard.tsx` | Placeholder readiness — Agent 2 wires `pBook-v1` |
| `src/features/leads/copilot/TimelineHighlights.tsx` | Placeholder timeline — Agent 2 wires context builders |
| `src/features/leads/copilot/index.ts` | Barrel |
| `src/features/leads/pages/LeadDetailsPage.tsx` | Minimal **Copilot** header button + drawer mount only |

---

## How the drawer opens

1. Lead Detail sticky header → **Copilot** button (`Sparkles` icon; label hidden on xs).
2. Sets `isCopilotOpen` → `<SalesCopilotDrawer isOpen … />`.
3. No Lead Detail redesign; Intelligence strip / pipeline / forms untouched.

---

## AI consumption (read-only)

```ts
import {
  LEAD_BRIEF_V1_ID,
  createAiOrchestrator,
  isAiEnabled,
} from "@/shared/ai";

if (!isAiEnabled()) {
  // LeadBriefCard status = "disabled" — fall back to Intelligence strip
} else {
  const orch = createAiOrchestrator({ enabled: isAiEnabled() });
  await orch.run(LEAD_BRIEF_V1_ID, { leadId, userId, role, context: contextSlots });
}
```

- Capability: **`lead-brief-v1` only**
- No Firestore / no direct LLM / no CRM writes
- `shared/ai` **not modified** (Agent 0 frozen)
- Default: AI off → drawer still opens with “AI off” brief state

---

## Extension points for Agent 2

Pass these props from Lead Detail (or a thin host hook) — **memoize object props**:

| Prop | Purpose |
| --- | --- |
| `contextSlots` | `lead-brief-v1` template slots from `buildLeadBriefContext` / `buildLeadBriefContextSlots` |
| `nextAction` | `{ type, reason, channel }` from Wave 6 `next-action-v1` (display only) |
| `readiness` | `{ bookingProbability, gaps?, band? }` from `pBook-v1` |
| `timeline` | `{ items?, summaryText? }` from timeline context pack |
| `safetyNotice` | Agent 4 UX / redaction banner (optional string) |

**Do not** recompute NBA / pBook inside the drawer with a new engine — reuse Wave 6 intelligence.

---

## Explicit non-goals (this agent)

- Context wiring / packing (Agent 2)
- UX polish beyond basic themed sections (Agent 3)
- Safety pipeline beyond display hook (Agent 4)
- Confirm → write CTAs, follow-up / WA / notes
- Live provider / DLS bump / `AI_ENABLED` default on
- Timeline / Wave 6 formula edits

---

## Validation (Agent 1 slice)

From `telecaller-app/` on 2026-07-14:

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | **PASS** (exit 0) |

---

## STOP

Agent 1 complete. Hand off to Agent 2 for context wiring. Do not implement Agents 3–5 in this slice.
