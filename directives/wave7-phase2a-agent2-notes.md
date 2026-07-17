# Wave 7 Phase 2A — Agent 2 Notes (Feature Flag Layer)

**Status:** Implemented — flag helpers only  
**Date:** 2026-07-14  
**Module:** `telecaller-app/src/shared/ai/featureFlags.ts`  
**Import:** `@/shared/ai`  
**Depends on:** Agent 0 (`AI_ENABLED`, orchestrator, prompt registry)

---

## Scope

| In | Out |
| --- | --- |
| Wrap `AI_ENABLED` via `isAiEnabled()` | Live provider / API keys |
| Capability gate `AiFeatureGate` | Copilot UI / Drawer / routing |
| Optional `VITE_AI_ENABLED` (non-prod only) | Remote Config wiring |
| Barrel exports + unit tests | Orchestrator / provider edits |

Orchestrator and providers were **not** modified. Callers resolve the flag and pass it in:

```ts
import { isAiEnabled, AiFeatureGate, createAiOrchestrator } from "@/shared/ai";

const orch = createAiOrchestrator({ enabled: isAiEnabled() });
```

---

## What shipped

| Export | Role |
| --- | --- |
| `isAiEnabled()` | Master resolution: `AI_ENABLED` → else optional env in non-prod |
| `AiFeatureGate(capabilityId?)` | Master + known capability (registry / `AI_CAPABILITY_IDS`) |
| `parseAiEnabledEnvValue(raw)` | Truthy parser for env strings (`true` / `1` / `yes`) |

Also: `VITE_AI_ENABLED?: string` on `ImportMetaEnv` in `vite-env.d.ts`.

---

## Resolution rules

1. **Default:** off (`AI_ENABLED === false`, no env → `isAiEnabled() === false`).
2. **Compile-time:** if `AI_ENABLED` is ever flipped to `true`, master is on.
3. **Env override:** `VITE_AI_ENABLED=true|1|yes` only when `import.meta.env.PROD` is false. Production builds ignore the env var so AI cannot turn on by accident.
4. **Capability gate:** `AiFeatureGate()` ≡ master; `AiFeatureGate(id)` requires master **and** a known capability (registered contract or declared ID). Unknown IDs fail closed.

Until enabled, orchestrator `run()` still returns `AI_DISABLED` when constructed with `enabled: false` / default — UI should keep Wave 6 rules intelligence.

---

## Usage (Agents 1 / UI later)

```ts
import {
  isAiEnabled,
  AiFeatureGate,
  AI_CAPABILITY_IDS,
  createAiOrchestrator,
  LEAD_BRIEF_V1_ID,
} from "@/shared/ai";

if (!AiFeatureGate(AI_CAPABILITY_IDS.LEAD_BRIEF_V1)) {
  // show rules LeadIntelligenceSummary
}

const orch = createAiOrchestrator({ enabled: isAiEnabled() });
const result = await orch.run(LEAD_BRIEF_V1_ID, { /* … */ });
```

Local/dev enable (optional):

```bash
# .env.local (not committed for prod)
VITE_AI_ENABLED=true
```

---

## Files touched

| Path | Change |
| --- | --- |
| `telecaller-app/src/shared/ai/featureFlags.ts` | **New** — flag helpers |
| `telecaller-app/src/shared/ai/index.ts` | Export helpers |
| `telecaller-app/src/shared/ai/types.ts` | Comment points at featureFlags |
| `telecaller-app/src/shared/ai/aiPlatform.test.ts` | Flag unit tests |
| `telecaller-app/src/vite-env.d.ts` | `VITE_AI_ENABLED` typing |

**Not modified:** `AiOrchestrator.ts`, `AiProvider.ts`, `StubAiProvider.ts`, prompt/safety modules.

---

## Validation

```bash
cd telecaller-app
npm test -- src/shared/ai/aiPlatform.test.ts
```

Expect: `AI_ENABLED` false; `isAiEnabled()` false under default vitest env; `AiFeatureGate` fails closed while master off.

---

## Follow-ups (not this agent)

- Remote Config / Functions proxy kill switch behind the same `isAiEnabled` surface
- Live provider (W7-AI-2 provider track) still gated by this flag
- Capability allowlists per role / tenant when product needs finer control
