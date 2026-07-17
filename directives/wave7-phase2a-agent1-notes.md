# Wave 7 Phase 2A — Agent 1 Notes (Context Builders)

**Status:** Implemented — read-only context packs  
**Date:** 2026-07-14  
**Module:** `telecaller-app/src/shared/ai/context/`  
**Import:** `@/shared/ai` (builders re-exported from Agent 0 barrel)  
**Depends on:** Agent 0 platform (`wave7-phase2a-agent0-notes.md`)

---

## What shipped

| File | Role |
| --- | --- |
| `context/redact.ts` | PII scrub (phone/email patterns), optional phone last-4 |
| `context/types.ts` | Builder input/output DTOs + `LeadBriefV1ContextSlots` |
| `context/buildLeadContext.ts` | Allowlisted lead facts; no name/email/full phone/address |
| `context/buildTimelineContext.ts` | Bounded recent timeline digest (default 8 events) |
| `context/buildAutomationContext.ts` | Overdue / idle / stuck signals via shared thresholds |
| `context/buildIntelligenceContext.ts` | Wraps `computeLeadIntelligence` (or precomputed snapshot) |
| `context/buildLeadBriefContext.ts` | Composes packs → `lead-brief-v1` slots |
| `context/index.ts` | Context barrel |
| `context/contextBuilders.test.ts` | Unit tests (redaction + slots + intelligence parity) |
| `shared/ai/index.ts` | Re-exports builders/types only (no orchestrator/provider edits) |

**Not modified:** `AiOrchestrator`, `AiProvider`, `StubAiProvider`, `PromptRegistry`, `SafetyGuard` logic.  
**Not modified:** Wave 6 intelligence formulas, timeline writers, automation, UI, Firestore queries.

---

## How to use

```ts
import {
  buildLeadBriefContext,
  buildLeadBriefContextSlots,
  createAiOrchestrator,
  LEAD_BRIEF_V1_ID,
} from "@/shared/ai";

// Feature already has lead + timeline events loaded (e.g. useLeadsStore + useTimelineEvents)
const { slots } = buildLeadBriefContext({
  lead: activeLead,
  timelineEvents: events,
  automationOptions: { todayYmd },
  intelligenceOptions: {
    todayYmd,
    isManagerial,
    peers: allLeads.map((l) => ({ id: l.id, phone: l.phone })),
    // or intelligence: precomputedFromStrip,
  },
});

const result = await createAiOrchestrator().run(LEAD_BRIEF_V1_ID, {
  leadId: activeLead.id,
  userId,
  role: "telecaller",
  context: slots, // statusLabel, scoreBand, health, nextAction*, timelineSummary, facts
});
```

Individual builders remain available for other capabilities:

| Builder | Output highlights |
| --- | --- |
| `buildLeadContext` | `statusLabel`, FU date, site-visit flags, scrubbed notes — **no raw PII** |
| `buildTimelineContext` | `timelineSummary` + `recent[]` (PII scrubbed) |
| `buildAutomationContext` | `overdueDays`, `idleWatch`, `stuckRisk`, `signals[]` |
| `buildIntelligenceContext` | `scoreBand`, `health`, `nextActionType/Reason` from Wave 6 |

---

## Hard rules observed

1. **Read-only** — builders never write CRM / Firestore / timeline.
2. **No formula fork** — score / health / next-action come from `computeLeadIntelligence` (or an explicit precomputed `intelligence` snapshot).
3. **Shared thresholds only** — automation pack uses `AUTOMATION_THRESHOLDS` + `getOverdueDays` / `getStaleDays`.
4. **PII minimization** — phone/email/address/name omitted by default; notes & timeline summaries scrubbed; optional `includePhoneLast4`.
5. **Deterministic slots** — same CRM snapshot → same `lead-brief-v1` context object (helps `hashContext` audit).

---

## `lead-brief-v1` slot mapping

| Slot | Source |
| --- | --- |
| `statusLabel` | `buildLeadContext` → `getLeadStatusLabel` |
| `scoreBand` | `buildIntelligenceContext` |
| `health` | `buildIntelligenceContext` |
| `nextActionType` | `buildIntelligenceContext` |
| `nextActionReason` | `buildIntelligenceContext` |
| `timelineSummary` | `buildTimelineContext` |
| `facts` | Composed lead + automation signals + intelligence ground-truth lines |

---

## Validation

From `telecaller-app/`:

| Check | Result |
| --- | --- |
| `npm test -- src/shared/ai/context/contextBuilders.test.ts` | **PASS** |
| `npm test -- src/shared/ai/aiPlatform.test.ts` | **PASS** (Agent 0 unchanged) |

---

## Out of scope (later agents)

| Item | Owner |
| --- | --- |
| Live provider / Remote Config wrap of `AI_ENABLED` | Agent 2 |
| Lead Detail / Copilot UI consuming brief | W7-AI-1 UI / Copilot SC-1 |
| Propose/confirm write tools | Agent 3 / W7-AI-3 |
| Broader test matrix | Agent 4 |

---

## Handoff notes

- Pass **preloaded** lead + timeline arrays — builders do not subscribe or query.
- Prefer passing `intelligenceOptions.intelligence` when Lead Detail already computed intelligence (avoids double compute); otherwise builders call `computeLeadIntelligence`.
- Until `AI_ENABLED` is on, UI should keep showing Wave 6 rules `LeadIntelligenceSummary`.
