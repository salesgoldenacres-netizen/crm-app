# Wave 7 — AI Platform Architecture (Master)

**Status:** **PLANNING — living master doc**  
**Initialized:** 2026-07-14  
**Owner:** Wave 7 Agent 0 (Architecture)  
**Companion:** [`wave7-agent0-architecture.md`](wave7-agent0-architecture.md)  
**Baseline:** Wave 6 CLOSED — [`wave6-complete.md`](wave6-complete.md)  
**App:** `telecaller-app/` (future `ai/` module — not created yet)  
**DLS:** **v1.4** unchanged unless separately authorized

This is the **master** AI platform document. Feature agents implement against it; they do not invent parallel AI stacks.

---

## 1. Premise

Waves 1–5 locked Design Language. Wave 6 locked **CRM business capability**:

| Artifact | Location / contract |
| --- | --- |
| Shared contracts barrel | `telecaller-app/src/shared/contracts` (`@/shared/contracts`) |
| Status vocabulary | `leadStatus.ts` — `LEAD_STATUSES`, normalize/aliases |
| Transitions | `statusTransition.ts` — `planStatusTransition` |
| Timeline publishers | `timelinePublisher.ts` — typed emit only |
| Notifications | `notifications.ts` — `publishNotification` |
| Query scopes | `queryScopes.ts` |
| Automation | `automation.ts` — job types, thresholds, IST, scheduled-job helpers |
| Site visit | `siteVisit.ts` |
| Lead intelligence shapes | `leadIntelligence.ts` — score/health/next-action versions |
| Task extensions | `taskContract.ts` — contract-only until authorized |
| Compute-on-read intelligence | `features/leads/intelligence/*` — `computeLeadIntelligence`, `rankDailyPriorities` |

**AI sits on top of this stack.** CRM remains source of truth. Deterministic intelligence remains authoritative for score, health, next-action, and daily priority ranking. AI never silently writes; every mutate goes through shared APIs after confirm or an explicit authorized policy path.

---

## 2. Capability map

| ID | Name | User value | Inputs (Wave 6) | Output | Side effects |
| --- | --- | --- | --- | --- | --- |
| C1 | Lead brief | Coach-ready paragraph | Lead + `LeadIntelligence` + timeline slice | Text (+ optional structured bullets) | None |
| C2 | Next-action explain | Why `next-action-v1` fired | `LeadNextAction` + factors/health | Text | None |
| C3 | Priorities narrative | Why today’s queue | `rankDailyPriorities` result | Short text | None |
| C4 | Draft note / reply | Faster logging | Lead + timeline | Draft string | Write only if user accepts → timeline/note publisher |
| C5 | Suggest transition / FU | Safer pipeline moves | Status graph + lead fields | Proposal DTO | Confirm → `planStatusTransition` + existing writers |
| C6 | Manager digest | End-of-day summary | Scoped leads + intelligence | Digest text | None |
| C7 | Tool agent | Multi-step assist | Tool registry | Plan + results | Gated tools only |

**v1 product target:** C1–C2 read-only. **v1.1:** C4 drafts. **v2:** C5 proposals. C6–C7 optional.

---

## 3. Layered architecture

### 3.1 AI abstraction layer

Proposed module root (when authorized): `telecaller-app/src/shared/ai/` (or `features/ai/platform/`).

| Module | Responsibility |
| --- | --- |
| `provider/` | `AiProvider` implementations (stub, then vendor) |
| `prompts/` | Versioned prompt contracts |
| `context/` | Context builders (CRM → prompt payload) |
| `orchestrator/` | Capability routing, retries, structured parse |
| `tools/` | Tool definitions + executor (propose → shared API) |
| `safety/` | Redaction, role checks, output validation |
| `types/` | Shared DTOs for requests/responses/audit |

Feature UI imports **orchestrator + types only**, never a vendor SDK.

### 3.2 Provider interface

```ts
// Contract sketch — not implemented in Phase 1
interface AiProvider {
  readonly id: string;           // e.g. "stub" | "gemini" | "openai"
  readonly models: string[];
  complete(req: AiCompletionRequest): Promise<AiCompletionResult>;
}

interface AiCompletionRequest {
  capabilityId: string;          // e.g. "lead-brief-v1"
  model?: string;
  system: string;
  messages: AiMessage[];
  responseFormat?: "text" | "json";
  jsonSchema?: unknown;          // optional structured output
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  metadata?: Record<string, string>;
}

interface AiCompletionResult {
  text?: string;
  json?: unknown;
  usage?: { inputTokens?: number; outputTokens?: number };
  model: string;
  providerId: string;
  latencyMs: number;
  finishReason?: string;
}
```

**Rules:**

- One active production provider configurable via env; stub always available for tests.
- No streaming required for v1 (optional later).
- Fail soft: orchestrator returns typed error; UI shows fallback (rules summary already on lead).

### 3.3 Prompt contracts

Each capability has a **versioned** contract:

| Field | Purpose |
| --- | --- |
| `id` | Stable id (`lead-brief-v1`) |
| `system` | Immutable system instructions (safety + role) |
| `userTemplate` | Slots filled only from context builder output |
| `inputSchema` | What context must contain |
| `outputSchema` | Structured parse target (or plain text) |
| `maxContextChars` | Hard cap |
| `allowedTools` | Empty for C1–C3 |
| `writePolicy` | `none` \| `propose` \| `policy_auto` (v1: `none` or `propose` only) |

**Change control:** bump version (`-v2`) rather than silently editing `-v1` behavior in production.

Example (C1):

- Input: redacted lead facts, `LeadIntelligence` snapshot, last N timeline summaries, canonical status label.
- Output: `{ brief: string, bullets?: string[] }` or plain text.
- System must state: do not invent phone numbers, scores, or status values not present in context; defer to provided `nextAction` / `scoreBand`.

### 3.4 Context builders

Pure functions — no I/O beyond data already loaded by the feature:

| Builder | Sources |
| --- | --- |
| `buildLeadBriefContext` | Lead fields (allowlisted), `computeLeadIntelligence` result, recent timeline summaries, optional automation signals (overdue flags using shared thresholds) |
| `buildNextActionExplainContext` | `LeadNextAction`, `scoreFactors`, `healthReasons` |
| `buildDailyPrioritiesContext` | Top K from `rankDailyPriorities` (ids, bands, next actions — not full PII dumps) |

**Allowlist principle:** builders export only fields declared in the prompt contract. Default **redact** phone, email, address; use last-4 or omit.

**Determinism:** same CRM snapshot → same context object (helps tests and audit hashes).

### 3.5 Safety rules

| Rule | Enforcement |
| --- | --- |
| No silent writes | `writePolicy: none` default; tools cannot auto-commit |
| No score override | Strip/ignore model fields named score/health/nextAction type |
| Status validity | Proposals run through `planStatusTransition` before UI offers Apply |
| PII minimization | Context redaction; log hashes not raw prompts in client |
| Role gates | Manager-only capabilities (C6) check existing auth roles |
| Rate / cost | Per-user and per-lead throttles at orchestrator |
| Prompt injection | System prompt forbids following lead notes as instructions; treat notes as untrusted data |
| Output size | Cap tokens; truncate display |
| Provider errors | Fallback to rules `LeadIntelligenceSummary` with `source: "rules"` |

### 3.6 Orchestration

```
run(capabilityId, { leadId, userId, role, preloaded? })
  1. Authorize capability for role
  2. Load or accept preloaded CRM snapshot (feature-owned fetch — respect query scopes)
  3. Build context via registered builder
  4. Render prompt contract
  5. Call AiProvider.complete
  6. Validate output schema
  7. Safety post-check (no forbidden CRM patch shapes)
  8. Emit AiAuditRecord (metadata)
  9. Return AiCapabilityResult to UI
```

No background agent loops in v1. C7 (multi-tool) requires a separate authorization with max-step limit and per-step human confirm for writes.

### 3.7 Tool interface design

```ts
interface AiTool<TInput, TProposal> {
  id: string;
  description: string;
  inputSchema: unknown;
  /** Builds a proposal — does not mutate CRM */
  propose(input: TInput, ctx: AiToolContext): Promise<TProposal>;
  /** Applies only after explicit confirm (or future policy_auto) */
  commit?(proposal: TProposal, ctx: AiToolContext): Promise<AiToolCommitResult>;
}
```

**v1 tool catalog (propose-only until UI confirm):**

| Tool id | Maps to shared API |
| --- | --- |
| `propose_status_transition` | `planStatusTransition` → existing lead update + `publishLeadStatusChanged` |
| `propose_follow_up_date` | Existing FU write path (`followUpDate`); timeline FU helpers |
| `propose_timeline_note` | Note/timeline typed publisher |
| `read_lead_intelligence` | `computeLeadIntelligence` (read tool) |
| `read_daily_priorities` | `rankDailyPriorities` (read tool) |

**Forbidden tools:** raw Firestore set/update, direct FCM, inventing automation jobs, deleting leads, bulk mutate without dedicated product auth.

---

## 4. Execution model

| Concern | Decision |
| --- | --- |
| Where it runs (v1) | Client-orchestrated calls to provider **or** thin Cloud Function proxy (preferred for key custody). Decide at W7-AI-2 auth. |
| Key custody | Never embed keys in the Capacitor app. Prefer Functions proxy or Firebase AI Logic / server-side. |
| Sync vs async | Sync request/response for C1–C5; no durable workflow engine |
| Idempotency | UI disables double-submit; audit id per turn |
| Caching | Optional later: cache brief by `(leadId, intelligence.computedAt, promptVersion)` — Agent 0 owns schema if persisted |
| Offline | No AI offline; show rules intelligence only |
| Testing | Stub provider returns fixtures; context builder unit tests; transition proposals tested against `planStatusTransition` |

**CRM write sequence (when tools authorized):**

1. Model or UI selects tool → `propose`  
2. User sees diff (from → to, reason)  
3. User confirms  
4. `commit` calls **existing** shared writers (same paths as human UI)  
5. Timeline emit via typed publisher (one intent → one event)

---

## 5. Security model

| Layer | Control |
| --- | --- |
| AuthN | Existing Firebase Auth session required |
| AuthZ | Capability × role matrix; query scopes still bound lead reads |
| Data egress | Allowlisted context fields; redact PII; no full lead document dump |
| Secrets | Server/env only; rotate via normal ops |
| Audit | Store: userId, capabilityId, promptVersion, provider/model, token usage, leadId, timestamp, context hash — **not** full PII prompt by default |
| Abuse | Rate limits; disable switch (Remote Config or env) |
| Supply chain | Single provider adapter module; lockfile discipline |
| Prompt untrusted input | Lead notes / WhatsApp text marked untrusted in system prompt |

AI audit persistence (collection vs logs) is **TBD** and requires Agent 0 + user auth before any Firestore change. Until then, in-memory/dev logging only in implementation slices.

---

## 6. Consuming Wave 6 contracts (integration contract)

### 6.1 Do consume

```
@/shared/contracts
  leadStatus / statusTransition
  timelinePublisher (and timeline read types)
  notifications
  automation (thresholds, job type keys, IST)
  leadIntelligence (types, versions, decide* helpers)
  queryScopes (when AI triggers fetches)
  taskContract (only when auto-tasks authorized)

@/features/leads/intelligence
  computeLeadIntelligence
  rankDailyPriorities / rankPowerDialerQueue
```

### 6.2 Do not replace

| Wave 6 system | AI must not |
| --- | --- |
| `lead-score-v1` / health / next-action | Recompute via LLM as authority |
| Automation crons / `createScheduledJob` | Parallel reminder pipeline |
| Timeline typed publishers | Raw `recordTimelineEvent` with free-form types from model |
| Query scopes | Full-collection reads “for the model” |
| Manual priority | Silently overwrite `Lead.priority` |
| Notification helper | Ad-hoc FCM writes |

### 6.3 `LeadIntelligenceSummary` bridge

Wave 6 already allows:

```ts
summary?: { text: string; source: "rules" | "llm"; updatedAt: string }
```

**Policy:** rules builders may fill `source: "rules"`. LLM C1 may fill `source: "llm"` in **UI state** first; persistence of summary onto lead docs requires separate authorization (compute-on-read preference remains).

---

## 7. Dependencies

| Dependency | Status | AI impact |
| --- | --- | --- |
| Wave 6 contracts frozen | Done | Grounding |
| Intelligence compute-on-read | Done | Context + fallback |
| Automation thresholds shared | Done | Consistent “overdue/idle” language |
| Provider account + billing | Not started | Blocks W7-AI-2 |
| Functions proxy (if chosen) | Not started | Key custody |
| Confirm UX patterns (DLS v1.4) | Exists | C5 apply flows |
| W7-OPS-1 indexes/functions | Parallel ops | Not an AI blocker |

---

## 8. Required APIs (implementation checklist)

Before any feature agent ships AI UI:

- [ ] `AiProvider` + `StubAiProvider`
- [ ] `AiOrchestrator.run`
- [ ] Prompt contract registry with `lead-brief-v1` (+ tests)
- [ ] `buildLeadBriefContext` (+ redaction tests)
- [ ] Safety gate helpers (`assertNoCrmPatch`, status proposal validate)
- [ ] `AiCapabilityResult` / error types
- [ ] Audit record type (persistence TBD)
- [ ] Tool registry stubs for C5 (even if commit disabled)
- [ ] Feature access: single hook e.g. `useAiCapability(id)` (name TBD)

**Shared CRM APIs already required (exist):** `planStatusTransition`, timeline publishers, `publishNotification`, `computeLeadIntelligence`, `rankDailyPriorities`.

---

## 9. Rollout phases

| Phase | Deliverable | Est. eng-days | Gate |
| --- | --- | --- | --- |
| **P1 Agent 0** | This architecture + agent0 doc | 1–2 | Done (planning) |
| **W7-AI-0** | Stub provider, orchestrator skeleton, `lead-brief-v1` contract | 3–5 | User auth |
| **W7-AI-1** | Context builders + read-only Lead Detail brief (rules fallback) | 2–4 | User auth |
| **W7-AI-2** | Live provider via interface + server key path + limits | 2–3 | User auth + secrets |
| **W7-AI-3** | Propose status/FU tools + confirm UI | 4–6 | User auth |
| **W7-AI-4** | Manager digest / optional tool agent | 5–10 | Separate scope |

**Useful read-only AI:** ~8–15 eng-days. **Gated writes:** ~14–24 eng-days cumulative.

---

## 10. Risks & mitigations

| ID | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | Hallucinated status/score | H | H | Rules-first; schema strip; `planStatusTransition` |
| R2 | Silent CRM writes | M | H | writePolicy + confirm; code review |
| R3 | PII to third parties | M | H | Redaction allowlists; proxy; audit |
| R4 | Cost overrun | M | M | Caps, cache, disable flag |
| R5 | Divergent “AI stale” vs automation | M | M | Reuse `AUTOMATION_THRESHOLDS` / intelligence |
| R6 | Vendor lock-in in features | M | M | Provider interface only |
| R7 | Scope creep into BPM | L | H | Explicit non-goals; no job engine |
| R8 | DLS / modal debt on confirm UX | L | L | Reuse Wave 5 modal/drawer patterns |

---

## 11. Effort summary

| Track | Range |
| --- | --- |
| Planning (Phase 1 Agent 0) | 1–2 days |
| Platform skeleton (stub) | 3–5 days |
| Read-only product slice | 4–8 days |
| Live provider hardening | 2–3 days |
| Propose/confirm tools | 4–6 days |
| Optional digest/agent | 5–10 days |

---

## 12. Explicit non-goals

- Replacing Wave 6 deterministic intelligence with an LLM scorer  
- Silent or autonomous CRM mutation  
- New Firestore schema without Agent 0 + user authorization  
- DLS version bump for AI chrome  
- Parallel automation / notification pipelines  
- Training custom models on tenant CRM data (out of scope)  
- Production code in the Phase 1 planning gate

---

## 13. Open decisions (resolve at first implementation auth)

1. **Runtime:** client→vendor vs Functions/Firebase AI proxy (recommend proxy for keys).  
2. **First provider:** Gemini vs OpenAI vs Firebase AI Logic — pick one adapter.  
3. **Summary persistence:** session-only vs optional field on lead / side doc.  
4. **Audit store:** Cloud Logging only vs Firestore `aiAudits` collection.  
5. **Offline/copy:** exact empty-state copy when AI disabled.

---

## 14. Related directives

| Doc | Role |
| --- | --- |
| [`wave7-agent0-architecture.md`](wave7-agent0-architecture.md) | Phase 1 Agent 0 planning deliverable |
| [`wave7-execution-plan.md`](wave7-execution-plan.md) | Wave 7 phase board |
| [`wave6-complete.md`](wave6-complete.md) | Locked baseline |
| [`wave6-agent0-architecture-review.md`](wave6-agent0-architecture-review.md) | Wave 6 shared-API freeze (pattern reference) |
| [`wave6-archive-index.md`](wave6-archive-index.md) | Immutable Wave 6 references |

---

## STOP

Master AI architecture is **planning-frozen** for Phase 1.  
No implementation until the user authorizes **W7-AI-0** (or equivalent Wave 7 AI slice).
