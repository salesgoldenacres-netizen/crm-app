# Wave 7 Phase 1 — Agent 0: AI Platform Architecture

**Status:** **PLANNING — Phase 1 in progress**  
**Date:** 2026-07-14  
**Role:** Architecture Owner (AI platform surface)  
**Scope:** Planning docs only — **no production code, no AI providers, no Firestore/DLS changes**  
**Baseline:** Wave 6 **CLOSED — PASS** ([`wave6-complete.md`](wave6-complete.md))  
**Master doc:** [`wave7-ai-architecture.md`](wave7-ai-architecture.md)  
**Execution plan:** [`wave7-execution-plan.md`](wave7-execution-plan.md)

---

## Purpose

Freeze the **AI platform surface** so later Wave 7 agents do not invent parallel LLM clients, silent CRM writers, forked intelligence formulas, or ad-hoc prompt/context shapes.

Wave 6 delivered the business-capability floor. Wave 7 AI **sits on top of** that floor. It does **not** replace it.

| Wave 6 floor (locked) | AI role |
| --- | --- |
| Canonical status + transitions | Consume for grounding; propose changes only via shared transition APIs |
| Timeline one-intent → one emit | Read for context; never invent timeline events outside typed publishers |
| Automation (FU / SLA / site-visit) | Read job types / thresholds; do not fork reminder writers |
| Lead intelligence v1 (deterministic) | Prefer rules outputs; optional LLM summary/assist **behind** abstraction |
| Daily priorities / Power Dialer rank | Consume ranked queues; do not re-score with opaque models |
| CRM + shared write APIs | **Source of truth** — AI never silently writes |

---

## Language (Agent 0 freeze)

| Term | Meaning |
| --- | --- |
| **AI Platform** | Shared abstraction: provider interface, prompt contracts, context builders, orchestration, tools, safety — not a feature UI |
| **Provider** | Pluggable model backend (OpenAI, Gemini, Vertex, local stub). Feature code never imports a vendor SDK directly |
| **Prompt contract** | Versioned system/user prompt schema + output schema for one capability (e.g. `lead-brief-v1`) |
| **Context builder** | Pure function packing CRM facts (status, timeline slice, intelligence, automation signals) into a bounded prompt payload |
| **Tool** | Declared, allowlisted CRM action the orchestrator may *propose*; execution goes through shared write APIs with human/policy gate |
| **Silent write** | Any CRM mutate without explicit user confirm or authorized policy path — **forbidden** |
| **Rules-first intelligence** | `lead-score-v1` / health / next-action remain authoritative; LLM may explain or draft, not redefine scores |

---

## Capability map (Phase 1 planning)

Capabilities are **declared** here; none are implemented in Phase 1.

| ID | Capability | Mode | Wave 6 inputs | Writes? |
| --- | --- | --- | --- | --- |
| **C1** | Lead brief / coaching summary | Read → draft text | `LeadIntelligence`, timeline slice, status | No (display only) |
| **C2** | Next-action explain | Read → natural language over `next-action-v1` | `decideNextActionV1` / `computeLeadIntelligence` | No |
| **C3** | Daily priorities narrative | Read → short “why these” over ranked list | `rankDailyPriorities` | No |
| **C4** | Reply / note draft | Draft → user paste/send | Lead + recent timeline | Optional note only via typed publisher after user accept |
| **C5** | Suggested status / FU change | Propose → confirm UI | `planStatusTransition`, FU fields | Yes — only via transition / FU APIs after confirm |
| **C6** | Manager digest (optional later) | Batch read → digest | Scoped leads + intelligence | No |
| **C7** | Tool-using agent (optional later) | Orchestrated multi-step | Tools over shared APIs | Yes — gated tools only |

**Phase 1 ships:** this architecture + contracts sketch.  
**First implementable slice (post-auth):** C1–C2 behind stub provider (no live keys required for CI).

---

## Architecture (Agent 0 view)

```
┌─────────────────────────────────────────────────────────────┐
│  Feature UI (Lead Detail, Priorities, Manager views)         │
└───────────────────────────┬─────────────────────────────────┘
                            │ ask / propose / confirm
┌───────────────────────────▼─────────────────────────────────┐
│  AI Orchestrator (Wave 7)                                    │
│  · capability router · prompt contract · safety gate         │
│  · tool allowlist · audit log of AI turns                    │
└───────┬─────────────────────┬───────────────────┬───────────┘
        │                     │                   │
        ▼                     ▼                   ▼
┌───────────────┐   ┌─────────────────┐   ┌──────────────────┐
│ Context       │   │ Provider        │   │ Tool executor    │
│ builders      │   │ interface       │   │ (propose only →  │
│ (CRM facts)   │   │ (stub / vendor) │   │  shared APIs)    │
└───────┬───────┘   └─────────────────┘   └────────┬─────────┘
        │                                          │
        ▼                                          ▼
┌──────────────────────────────────┐    ┌──────────────────────┐
│ Wave 6 contracts & intelligence  │    │ Shared write surface │
│ @/shared/contracts               │    │ planStatusTransition │
│ timeline publishers (read path)  │    │ timeline publishers  │
│ computeLeadIntelligence          │    │ publishNotification  │
│ rankDailyPriorities              │    │ (never raw Firestore)│
│ automation thresholds / jobs     │    └──────────────────────┘
└──────────────────────────────────┘
```

**Invariant:** arrows into CRM writes always pass **shared APIs**. Provider output is never applied as a Firestore patch directly.

Full layering, prompt/tool schemas, security, and rollout live in [`wave7-ai-architecture.md`](wave7-ai-architecture.md).

---

## How AI consumes Wave 6 (without replacing it)

### Status & transitions

- **Read:** `normalizeLeadStatus`, `LEAD_STATUSES`, labels from `@/shared/contracts/leadStatus`.
- **Propose:** build a `PlanStatusTransitionInput`; call `planStatusTransition` — if `ok === false`, surface error; never force unless product policy + manager role.
- **Write:** existing feature write paths that already apply `leadPatch` + typed timeline (`publishLeadStatusChanged`, etc.). AI does not add a second status writer.

### Timeline

- **Read:** bounded recent events for context builders (cap count + summary length; respect existing summary ≤ 200 chars discipline).
- **Write:** only typed helpers in `@/shared/contracts/timelinePublisher` after user/policy accept. No raw `type` strings. One intent → one emit remains law.

### Automation

- **Read:** `AUTOMATION_JOB_TYPES`, `AUTOMATION_THRESHOLDS`, IST helpers — for explanations (“overdue per 2C rules”).
- **Non-goal:** AI must not schedule parallel FCM/notification writers or invent new job types without Agent 0 + automation slice auth.
- Slice-2 automation (missed-call / stuck) stays Wave 7 backlog (`W7-P5`); AI may *narrate* health, not replace crons.

### Lead intelligence & daily priorities

- **Authoritative:** `computeLeadIntelligence`, `lead-score-v1`, health, `next-action-v1`, `rankDailyPriorities` / `rankPowerDialerQueue`.
- **LLM:** may set `LeadIntelligenceSummary` with `source: "llm"` **only** when a prompt contract is authorized; must not overwrite `score`, `scoreFactors`, `health`, or `nextAction` from model output.
- Manual `Lead.priority` remains the human override (Wave 6 UX contract).

### Notifications / tasks

- Notifications: `publishNotification` / server twin only; typed `NOTIFICATION_TYPES`.
- Tasks: `TaskItemExtensions` remain contract-only until auto-tasks authorized; AI must not invent a parallel task store.

---

## Required APIs (to exist before feature AI work)

Planning freeze — implement in later authorized slices:

| API | Owner | Notes |
| --- | --- | --- |
| `AiProvider` interface | Agent 0 | `complete(request) → structured | text`; stub for tests |
| `AiOrchestrator.run(capability, input)` | Agent 0 | Routes capability → context → provider → safety |
| Prompt contracts registry | Agent 0 | Versioned IDs; input/output Zod-or-equivalent schemas |
| Context builders | Agent 0 + feature | `buildLeadBriefContext`, `buildPrioritiesContext`, … |
| `AiTool` registry | Agent 0 | Allowlisted tools; each maps to one shared write/read API |
| Safety / policy gate | Agent 0 | PII redaction rules, max tokens, role checks, no-silent-write |
| AI audit record | Agent 0 | Store turn metadata (capability, model, hashes) — schema TBD; **no** lead-field overwrite |

**Do not invent:** second intelligence scorer, second timeline bus, vendor SDK in feature folders.

---

## Dependencies

| Depends on | Why |
| --- | --- |
| Wave 6 CLOSED contracts in `@/shared/contracts` | Grounding vocabulary |
| `features/leads/intelligence/*` | Rules-first scores / priorities |
| Typed timeline + `recordTimelineEvent` | Context + gated emits |
| Existing auth / roles | Security model |
| Secrets / env (later) | Provider keys — **not** in Phase 1 |
| Ops: indexes/functions (`W7-OPS-1`) | Unrelated parallel track; not AI blocker |

**Blocks:** Live provider wiring, any CRM write from AI, DLS bump, Firestore rules for AI collections (until schema authorized).

---

## Rollout phases (AI track)

| Phase | Intent | Gate |
| --- | --- | --- |
| **W7-P1-A0** (now) | Architecture docs + capability map | This document |
| **W7-AI-0** | Stub provider + orchestrator skeleton + one prompt contract (C1) | Explicit auth |
| **W7-AI-1** | Context builders wired to Wave 6 intelligence/timeline (read-only UI) | Auth + review |
| **W7-AI-2** | First live provider behind interface; cost/safety limits | Auth + secrets |
| **W7-AI-3** | Propose-only tools (status/FU) with confirm UI | Auth |
| **W7-AI-4** | Optional manager digest / multi-tool agent | Separate scope |

Ops and non-AI backlog (`W7-P1`…`W7-P6`) remain independent.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Model invents status / score | Rules-first; reject unstructured CRM patches; validate via `planStatusTransition` |
| Silent or bulk writes | Hard policy: tools propose; executor requires confirm or explicit policy flag |
| PII leakage to providers | Context builders redact phones/emails by default; allowlist fields per contract |
| Cost / latency | Cap context size; cache briefs optionally later; stub in CI |
| Forked “AI health” vs automation | Force consumption of `AUTOMATION_THRESHOLDS` / intelligence helpers |
| Prompt drift | Versioned prompt contracts; changelog in directives |
| Feature agents bypass abstraction | Lint/review rule: no vendor SDK outside `ai/` platform module |

---

## Effort estimates (planning)

| Slice | Effort (eng-days) | Notes |
| --- | --- | --- |
| Architecture + contracts freeze (this phase) | 1–2 | Docs only |
| Stub provider + orchestrator + C1 contract | 3–5 | No live vendor |
| Context builders (lead + priorities) | 2–4 | Pure functions + tests |
| Read-only UI surfaces | 2–4 | DLS v1.4 patterns |
| Live provider + secrets + limits | 2–3 | After auth |
| Propose tools + confirm flows | 4–6 | Highest risk slice |
| **Total to useful read-only AI** | **~8–15** | Through W7-AI-1/2 |
| **Total to gated write tools** | **~14–24** | Through W7-AI-3 |

Estimates assume no Firestore schema redesign and no DLS bump.

---

## Explicit non-goals (Phase 1 / Agent 0)

- No production code in `telecaller-app/` or `functions/`
- No provider API keys, no network calls to model hosts
- No Firestore collection for AI, no rules/index changes
- No DLS bump; no Wave 6 feature reopen
- No replacing `lead-score-v1` with an LLM scorer
- No BPM / parallel automation engine

---

## Decisions locked for later agents

1. **CRM is source of truth** — AI is advisory + gated actuator.  
2. **All writes via shared APIs** — status, timeline, notifications, tasks.  
3. **Rules-first intelligence** — LLM may summarize/explain, not redefine score/health/next-action.  
4. **Single AI abstraction** — one provider interface; features call orchestrator only.  
5. **Wave 6 contracts remain frozen** — extend, don’t fork.

Open items (resolve at first implementation auth): provider choice, where AI audit logs live, whether `LeadIntelligence.summary` with `source: "llm"` is persisted or session-only.

---

## Deliverables checklist

| Artifact | Path | Status |
| --- | --- | --- |
| Agent 0 architecture (this file) | `directives/wave7-agent0-architecture.md` | Written |
| Master AI platform architecture | `directives/wave7-ai-architecture.md` | Written |
| Wave 7 execution plan update | `directives/wave7-execution-plan.md` | Updated — Phase 1 planning in progress |

---

## STOP

**Phase 1 Agent 0 is planning-complete for the AI platform surface.**  
Await explicit authorization before **W7-AI-0** (stub/orchestrator) or any production code.
