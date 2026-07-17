# Wave 7 Phase 2A — Agent 3 Notes (Safety Utilities)

**Status:** Implemented — READ_ONLY safety utilities  
**Date:** 2026-07-14  
**Module:** `telecaller-app/src/shared/ai/safetyUtils.ts`  
**Import:** `@/shared/ai`  
**Depends on:** Agent 0 platform (`SafetyGuard`, types) — **SafetyGuard not modified**

---

## What shipped

| API | Behavior |
| --- | --- |
| `redactPII(value)` | Deep-clone; mask emails/phones in strings; replace known PII keys (`phone`, `email`, `address`, …) with `[REDACTED]` |
| `validatePrompt(prompt)` | Reject CRM/write keys; redact PII; return `{ ok, value?, error?, posture: "READ_ONLY" }` |
| `validateResponse(response)` | Delegate to `safetyPostCheck` (no CRM patch + strip intelligence overrides); posture `READ_ONLY` |
| `allowWriteIntent(intent?)` | **Always deny** — `allowed: false`, posture `READ_ONLY` |
| `blockUnsafeWrite(payload?)` | **Always block** — `blocked: true`, posture `READ_ONLY` |
| `AI_SAFETY_POSTURE` | Constant `"READ_ONLY"` |

Barrel exports added in `index.ts`. Existing `SafetyGuard` / orchestrator behavior unchanged.

---

## How to import

```ts
import {
  AI_SAFETY_POSTURE,
  redactPII,
  validatePrompt,
  validateResponse,
  allowWriteIntent,
  blockUnsafeWrite,
} from "@/shared/ai";
```

---

## Posture (hard rule)

Phase 2A AI path is **READ_ONLY**.

- No CRM writes, silent patches, or tool commits.
- `allowWriteIntent` never returns `allowed: true`.
- `blockUnsafeWrite` never returns `blocked: false`.
- Propose/confirm tools remain **W7-AI-3** (later auth) — these helpers will stay the deny/block layer until that slice explicitly relaxes write gates.

---

## Integration notes

| Layer | Relationship |
| --- | --- |
| `SafetyGuard.ts` | Unchanged. Utilities compose `assertNoCrmPatch` / `safetyPostCheck` / `makeAiError`. |
| `AiOrchestrator` | Not rewired in this slice (additive only). Callers / Agent 1 context builders may use `redactPII` / `validatePrompt` before `run`. |
| Context builders (Agent 1) | Prefer `redactPII` on assembled context slots before templating. |
| Tools / propose (future Agent 3 write track) | Gate every write attempt with `allowWriteIntent` → on deny, `blockUnsafeWrite`. |

---

## Example

```ts
const pre = validatePrompt({
  facts: "Reach me at +91 98765 43210",
  statusLabel: "Interested",
});
if (!pre.ok) {
  // SAFETY_VIOLATION — do not call provider
}

const write = allowWriteIntent({ tool: "propose_status_transition" });
// write.allowed === false, write.posture === "READ_ONLY"
```

---

## Validation

- Unit tests appended in `telecaller-app/src/shared/ai/aiPlatform.test.ts` (`safetyUtils (READ_ONLY)`)
- Run: `npm test -- src/shared/ai/aiPlatform.test.ts` (from `telecaller-app/`)

---

## Out of scope (unchanged)

- Live LLM providers / keys  
- Copilot UI / Drawer  
- Firestore AI collections  
- Propose→confirm write tools  
- Wave 6 intelligence / timeline edits  
- Modifying `SafetyGuard` core gates  
