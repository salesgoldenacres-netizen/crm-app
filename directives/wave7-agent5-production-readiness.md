# Wave 7 Agent 5 — Production Readiness Review

**Date:** 2026-07-14  
**Scope:** Wave 7 AI production-readiness only  
**Branch context:** Current Wave 7 branch  
**Mode:** Audit/documentation only  

---

## Executive summary

**FAIL** — the current Wave 7 AI stack is **not production-ready** for live enablement.

The client-side readiness story is mostly sound: AI is off by default, provider selection is centralized, client API keys are not introduced, and the live Gemini path is routed through a Firebase callable instead of direct browser SDK use. However, the live server callable `functions/ai/complete.js` currently trusts caller-supplied payloads too much and does **not** re-enforce the same capability, model, prompt-size, or role boundaries that exist in the client orchestrator. Because `exports.aiComplete` only checks `request.auth`, any authenticated caller can bypass client feature flags and invoke the live provider directly with arbitrary prompts and model values.

That is a **critical production blocker** because it creates an uncontrolled cost, abuse, and policy-bypass path exactly at the paid provider boundary. Monitoring/logging readiness is also incomplete: the orchestrator generates in-memory audit objects, but there is no durable AI request telemetry, alert thresholding, or operational dashboard for the live provider path.

**Recommendation:** **NO-GO** for enabling the current Wave 7 AI stack in production until the server-side callable is hardened and basic AI operational observability is in place.

---

## PASS / FAIL

**Overall result:** **FAIL**

**Critical blocker:** Yes

- `aiComplete` is exposed as an authenticated callable, but server-side enforcement is insufficient for production live AI usage.

---

## Environment/config validation

### Findings

- **PASS:** Master kill switch is off by default via `src/shared/ai/types.ts` with `AI_ENABLED = false`.
- **PASS:** `VITE_AI_ENABLED` is only honored in non-production builds through `src/shared/ai/featureFlags.ts`, reducing accidental production enablement from client env alone.
- **PASS:** Provider selection is centralized in `src/shared/ai/ProviderFactory.ts`.
- **PASS:** Live provider selection is explicit via `VITE_AI_PROVIDER=gemini|live`; safe default remains `stub`.
- **PASS:** Product call sites use `createAiRuntime()` / orchestrator abstraction instead of vendor SDK imports.
- **PASS:** Server secret expectation is clearly isolated to Functions env: `GEMINI_API_KEY` or `GOOGLE_AI_API_KEY`.
- **GAP:** There is no repo-local production env manifest or deployment checklist source of truth for AI-specific runtime settings beyond notes/docs.
- **GAP:** No remote operational kill switch is wired for production AI beyond code-level `AI_ENABLED=false` and client env/provider selection.

### Validation summary

The environment and configuration model is directionally correct and fail-closed by default. Configuration does **not** block readiness by itself. The issue is what happens once live AI is enabled.

---

## Secret handling review

### Findings

- **PASS:** No Gemini/OpenAI client SDK or browser API key path was introduced.
- **PASS:** `src/shared/ai/GeminiProvider.ts` calls Firebase Functions only.
- **PASS:** `functions/ai/complete.js` reads provider credentials from server env only.
- **PASS:** Client-facing provider errors are redacted to generic messages.
- **PASS:** Missing server key fails closed with `failed-precondition`.
- **GAP:** Server logs still emit vendor error text through `console.error('[aiComplete] Gemini error', status, vendorMsg)`. This does not appear to expose keys, but it is not structured logging and should be reviewed carefully if vendor error payloads ever include request details.

### Validation summary

Secret placement is acceptable for production design: server-side only, no browser key exposure. Secret handling is **not** the primary blocker.

---

## Deployment checklist

### Current readiness

**Not ready to execute for production enablement** because of the critical blocker below.

### Required checklist before any live enablement

1. Keep `AI_ENABLED=false` until remediation is complete and validated.
2. Ensure Functions secret/env is set for `GEMINI_API_KEY` or `GOOGLE_AI_API_KEY`.
3. Deploy the hardened `aiComplete` callable only after server-side guardrails are added.
4. Verify callable restrictions:
   - authenticated caller required
   - approved capability allowlist enforced server-side
   - approved model allowlist enforced server-side
   - request size/token ceilings enforced server-side
   - role/entitlement enforcement performed from trusted auth/server context, not only client input
5. Verify production logs/alerts exist for:
   - callable error rate
   - rate limiting
   - request volume spikes
   - latency
   - provider auth failures
6. Smoke test with:
   - AI disabled
   - AI enabled + stub
   - AI enabled + live provider
   - missing secret
   - malformed output
   - provider timeout/rate limit
7. Confirm rollback operator knows how to force the stack back to stub/off.

---

## Rollback guidance

### Immediate rollback path

If live AI causes production issues:

1. Stop user exposure first:
   - keep or return `AI_ENABLED=false`, or
   - switch live selection away from `VITE_AI_PROVIDER=gemini|live`
2. If necessary, redeploy Hosting with AI-off/stub configuration.
3. If callable misuse or runaway cost is occurring, remove/disable the deployed live `aiComplete` path until hardened.
4. Rotate `GEMINI_API_KEY` if abuse is suspected.
5. Review Cloud Functions logs for invocation spikes, auth failures, and provider-side errors.

### Rollback confidence

Rollback is conceptually simple because the stack already supports stub/off modes. The bigger issue is that the current live callable is too open once deployed.

---

## Monitoring/logging readiness

**Status:** **FAIL**

### Findings

- **PASS:** The orchestrator produces structured `audit` objects with `providerId`, `model`, `usage`, `latencyMs`, `errorCode`, `leadId`, and `userId`.
- **FAIL:** Those audit objects are returned in memory only; there is no durable AI telemetry sink for production operations.
- **FAIL:** No AI-specific alerting, dashboard, or SLO/SLA evidence was found in repo scope.
- **FAIL:** The callable uses basic `console.error` logging only; no structured operational event format was found for AI requests.
- **FAIL:** No evidence of AI rate/cost monitoring, abuse thresholds, or anomaly detection was found.

### Why this matters

Even if the live path were functionally correct, production operations need a way to answer:

- who invoked AI
- how often
- with which capability/model
- with what latency/error rate
- whether failure rate or spend suddenly spiked

The current stack cannot answer those questions reliably from first-party AI telemetry.

---

## Operational runbook notes

### Current state

There is **no complete AI live-ops runbook** in the repository today. This report is the first production-readiness runbook seed.

### Minimum runbook expectations before enablement

- Named owner for Wave 7 AI incidents
- Exact switch-off procedure for live AI
- Secret rotation procedure for Gemini key
- Smoke-test steps after deploy
- Log locations and alert queries for `aiComplete`
- Known failure modes:
  - missing server key
  - provider timeout
  - provider rate limiting
  - malformed provider output
  - spike in authenticated misuse
- Customer-impact playbook:
  - fall back to rules-based brief
  - confirm no CRM writes occurred
  - announce degraded AI service internally

---

## Residuals

- AI remains intentionally off by default.
- No client API key path exists.
- Stub fallback remains available.
- Proposal/confirm-write paths remain read-only and inert in the reviewed Wave 7 surface.
- Durable AI audit persistence is still absent.
- AI-specific dashboards/alerts are still absent.
- No production-grade AI runbook existed prior to this report.

---

## Blockers

### Critical blocker 1 — server-side provider boundary is not hardened

**Severity:** Critical  
**Result:** Blocks production live enablement

`exports.aiComplete = onCall({ region: 'us-central1' }, handleAiComplete);` exposes a live provider callable that only checks `request.auth`. Inside `handleAiComplete`, the server validates that `capabilityId` is a string and `messages` is a non-empty array, then forwards the request to Gemini. It does **not** re-check:

- allowed Wave 7 capability IDs
- trusted user role/entitlement
- allowed model IDs
- server-side prompt/input ceilings equivalent to orchestrator guardrails
- whether the caller should be allowed to consume paid AI at all

Because those controls exist primarily in the client/shared orchestrator path, an authenticated caller can bypass them by invoking the callable directly.

**Production impact**

- uncontrolled provider spend
- abuse path for arbitrary prompting
- bypass of product feature flags and client safety assumptions
- weaker incident containment at the paid provider boundary

**Required remediation before any production enablement**

- enforce capability allowlist server-side
- enforce model allowlist server-side
- enforce request size/token ceilings server-side
- enforce trusted authorization/entitlement server-side
- add request telemetry and alerting for the callable

### High-severity operational gap — no durable AI observability

This is not the first blocker to fix, but it remains serious. The stack lacks durable AI request telemetry, alerting, and operational dashboards for live provider use.

---

## Go / no-go recommendation for current Wave 7 AI stack

**Recommendation:** **NO-GO**

Do **not** enable the current Wave 7 AI stack in production live mode yet.

### Why

- Client-side flagging/provider wiring is acceptable.
- Secret placement is acceptable.
- Read-only posture is acceptable.
- **But** the live callable boundary is not production-safe because server-side controls do not match the client-side assumptions.

### Re-enable consideration

Reassess after:

1. server-side callable hardening is shipped
2. AI invocation telemetry is durable
3. alerting/runbook basics are in place
4. a focused post-remediation validation confirms the live path is controlled end-to-end

---

## Final verdict

**FAIL**

**Critical blocker exists:** Yes  
**Critical blocker:** `aiComplete` can be directly invoked by any authenticated caller without sufficient server-side capability/role/model/input enforcement.  
**Report file created:** `directives/wave7-agent5-production-readiness.md`
