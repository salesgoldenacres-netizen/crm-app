# Wave 7 Phase 2B — Agent 4 Notes (Safety Integration)

**Status:** Implemented — Copilot display safety on AI outputs  
**Date:** 2026-07-14  
**Role:** Agent 4 only (SC-1 safety wiring)  
**App:** `telecaller-app/`  
**DLS:** v1.4 unchanged  

---

## What shipped

| Path | Role |
| --- | --- |
| `src/features/leads/copilot/secureCopilotOutput.ts` | `secureLeadBriefOutput` — `validateResponse` → `redactPII` → typed brief; fail → `AI_SUMMARY_UNAVAILABLE` |
| `src/features/leads/copilot/SalesCopilotDrawer.tsx` | Runs secure helper on every successful `run()`; sets `safetyNotice`; never surfaces raw error / stack |
| `src/features/leads/copilot/LeadBriefCard.tsx` | Error default copy → “AI summary unavailable.”; avoids double-period with safe messages |
| `src/features/leads/copilot/index.ts` | Exports `secureLeadBriefOutput` + `AI_SUMMARY_UNAVAILABLE` |

**Not modified:** `@/shared/ai` (frozen) — SafetyGuard / `validateResponse` / `redactPII` imported only.

---

## Safety pipeline (display)

```
orchestrator.run(lead-brief-v1)   ← already post-checks internally
        │
        ▼ result.ok
secureLeadBriefOutput(result.data)
        ├─ validateResponse  → SafetyGuard safetyPostCheck (no CRM patch + strip intel overrides)
        ├─ redactPII         → mask emails / phones / PII keys
        └─ shape check       → non-empty `brief` string required
        │
        ├─ ok  → LeadBriefCard renders redacted brief / bullets
        └─ fail → safetyNotice = "AI summary unavailable."
                  + rules brief fallback (if present) OR error card
```

Orchestrator errors with `SAFETY_VIOLATION` / `INVALID_OUTPUT` take the same banner path.  
`catch` and other AI failures use the same safe copy — **no** `err.message`, provider dumps, prompts, or stacks.

---

## Failure path behavior

| Condition | Banner (`safetyNotice`) | Lead Brief card |
| --- | --- | --- |
| `validateResponse` / redact / shape fail after `ok` | **AI summary unavailable.** | Rules brief if available (`fallbackKind: error`); else error with same copy |
| Orchestrator `SAFETY_VIOLATION` / `INVALID_OUTPUT` | **AI summary unavailable.** | Same as above |
| Other AI errors / thrown exceptions | (none, unless host) | Rules fallback or error with **AI summary unavailable.** only |
| `AI_DISABLED` / flag off | none | Rules (`ai_off`) — not a safety failure |
| Offline (Agent 3) | none | Rules (`offline`) — AI not called |

Raw provider output is never passed to `LeadBriefCard` / `CopilotAlert`.

---

## Hard rules respected

- `shared/ai` **frozen** (read-only imports)
- Copilot remains **read-only** (no CRM writes)
- Agent 2 context packer untouched
- Agent 3 offline / retry / `fallbackKind` hooks preserved

---

## Explicit non-goals (this agent)

- Live provider / enabling `AI_ENABLED` by default
- Confirm → write CTAs
- Rewriting Wave 6 intelligence or context builders
- New SafetyGuard APIs

---

## Validation

From `telecaller-app/` on 2026-07-14:

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | **PASS** (exit 0) |

---

## STOP

Agent 4 complete. Hand off to Agent 5 (validation) if authorized. Do not implement Agents 1–3 / 5 in this slice.
