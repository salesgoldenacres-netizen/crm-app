# Wave 7 Phase 2A — Agent 4 Notes (AI Platform Testing)

**Status:** Complete — unit + contract coverage expanded  
**Date:** 2026-07-14  
**Scope:** Tests only under `telecaller-app/src/shared/ai/`  
**Out of scope:** Copilot UI, production feature code, `wave7-phase2a-validation.md` (Agent 5)

---

## Deliverables

| Path | Role |
| --- | --- |
| `telecaller-app/src/shared/ai/aiPlatform.test.ts` | Platform contract + pipeline + safety + flags |
| `telecaller-app/src/shared/ai/context/contextBuilders.test.ts` | Context builders + no score fork |
| `directives/wave7-phase2a-agent4-notes.md` | This coverage report |

No production modules were changed beyond tests.

---

## Test counts

| Suite | File | Tests |
| --- | --- | --- |
| Platform | `aiPlatform.test.ts` | **47** |
| Context builders | `context/contextBuilders.test.ts` | **12** |
| **Total AI** | `src/shared/ai/` | **59** |

Baseline before Agent 4 expansion: **37**. Added **+22** cases.

### Validation commands (from `telecaller-app/`)

```bash
npm test -- src/shared/ai/
npx tsc --noEmit
```

| Check | Result |
| --- | --- |
| `npm test -- src/shared/ai/` | **PASS** — 2 files, 59 tests |
| `npx tsc --noEmit` | **PASS** |

---

## Coverage map

### StubAiProvider / AiProvider contract
- Stub satisfies `AiProvider` (`id`, `models`, `complete`)
- `lead-brief-v1` JSON fixture + usage/latency metadata
- Unknown capability → text-only fixture (no network)

### PromptRegistry (`lead-brief-v1` only)
- Registry size = 1; unknown id undefined
- `writePolicy: none`, empty tools, `maxContextChars: 4000`, slot list
- Template render (missing / numeric / object slots)
- `parseOutput` valid, JSON-text fallback, invalid/empty reject

### AiOrchestrator.run pipeline
- Default → `AI_DISABLED` + audit
- Happy path stub → `source: "stub"`, audit fields
- Injected provider → `source: "llm"`
- `UNKNOWN_CAPABILITY`, `CONTEXT_TOO_LARGE`
- `PROVIDER_ERROR` (throw), empty → `INVALID_OUTPUT`
- CRM patch in json → `SAFETY_VIOLATION`
- Schema-invalid → `INVALID_OUTPUT`
- Strips intelligence overrides on success
- E2E: `buildLeadBriefContextSlots` → `run` (no score/scoreBand on output)

### SafetyGuard + safetyUtils (READ_ONLY)
- Nested CRM patch keys; nested intelligence strip
- `assertWritePolicySafe` (allows brief; rejects `policy_auto` / tools+none)
- `assertContextWithinLimit`
- Role gate with missing role
- `AI_SAFETY_POSTURE === "READ_ONLY"`
- `redactPII`, `validatePrompt` / `validateResponse` (incl. null + write keys)
- `allowWriteIntent` always deny; `blockUnsafeWrite` always block

### Feature flags
- `AI_ENABLED === false` default
- `parseAiEnabledEnvValue` truthy/falsy matrix
- `isAiEnabled()` / `AiFeatureGate` fail-closed when master off
- Dev: `VITE_AI_ENABLED=true` enables master when `PROD` is false; unknown capability still fails closed

### Context builders (read-only, no score fork)
- PII scrub + phone last4
- Lead allowlist (no name/email/phone/address by default)
- Timeline cap + scrub
- Automation overdue signals via shared thresholds
- Intelligence parity with `computeLeadIntelligence` (deterministic, no formula fork)
- Precomputed intelligence passthrough
- `lead-brief-v1` slots filled; slots match Wave 6 scoreBand/health/nextAction; no `leadPatch` / raw `score`

---

## Gaps / intentional non-coverage

| Item | Reason |
| --- | --- |
| UI / Copilot Drawer | Explicitly out of scope |
| Live provider HTTP | No live adapter in Phase 2A |
| Remote Config | Not wired yet (Agent 2 follow-up) |
| Production `PROD=true` env ignore | Branch covered only when `import.meta.env.PROD`; vitest is non-prod |
| Write-tool propose flows | W7-AI-3 later; READ_ONLY deny helpers covered |

---

## Handoff to Agent 5

- Do **not** treat this file as validation closeout — Agent 5 owns `wave7-phase2a-validation.md`.
- AI suite is green at **59** tests; `tsc --noEmit` expected green after Agent 4 session.
- Feature UI may consume `@/shared/ai` with confidence that disabled-by-default and safety post-checks are asserted.
