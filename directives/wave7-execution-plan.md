# Wave 7 — Execution Plan

**Status:** **CLOSED — PASS**  
**Initialized:** 2026-07-14  
**Phase 1 completed:** 2026-07-14 (Agents 0–5 planning / governance)  
**Phase 2A completed:** 2026-07-14 (AI Platform Foundation — stub / flags / context / safety)  
**Phase 2B completed:** 2026-07-14 (Sales Copilot Drawer)  
**Architectural baseline:** Wave 6 CLOSED — PASS  
**DLS:** remains **v1.4** unless separately authorized  
**App:** `telecaller-app/`  
**AI flag:** `AI_ENABLED=false` (default) — Copilot opens with Wave 6 rules fallback when off

---

## Premise

Waves **1–5** closed the Design Language surface (DLS **v1.4**).  
Wave **6** closed CRM Intelligence & Workflow Automation (contracts, timeline, automation, deterministic intelligence, performance).

Wave 7 builds on that baseline. **Phase 1** locked AI architecture and feature scope. **Phase 2A** landed the stub AI platform under `@/shared/ai`. **Phase 2B** landed the read-only Sales Copilot Drawer. Further slices need explicit auth.

**AI premise:** AI sits **on top of** Wave 6 (status, timeline, automation, lead intelligence, daily priorities). CRM remains source of truth. AI never silently writes; all writes go through shared APIs.

---

## Wave 6 as architectural baseline (do not reinvent)

Treat these as locked foundations unless Architecture Owner + user authorize change:

| Layer | Baseline |
| --- | --- |
| **Contracts** | `@/shared/contracts` — status, transitions, timeline publishers, notifications, query scopes, automation thresholds, lead intelligence shapes |
| **Timeline** | One intent → one emit; typed publishers; no WA→callLogs writes |
| **Automation** | Extend `createScheduledJob` + IST + create-only notify — no parallel FCM writers / BPM rewrite |
| **Intelligence** | Compute-on-read `lead-score-v1` / health / next-action / daily priorities; rules authoritative; LLM only behind Agent 0 AI interface |
| **Performance** | Role-scoped leads; bounded listeners; lazy Dashboard subscribe |
| **DLS / UI** | **v1.4** — Form Contract §3e, Modal/Drawer §3f; presentation rules from Waves 1–5 |

Closeout references: [`wave6-complete.md`](wave6-complete.md) · [`wave6-final-summary.md`](wave6-final-summary.md) · [`wave6-archive-index.md`](wave6-archive-index.md)

---

## Phase board

| Phase | Intent | Status | Artifacts |
| --- | --- | --- | --- |
| **Phase 1** | Architecture + scope lock (Agents 0–5) | **COMPLETE — PASS** | See Phase 1 artifact index below |
| **Phase 2A** | AI Platform Foundation (W7-AI-0) | **COMPLETE — PASS** | [`wave7-phase2a-notes.md`](wave7-phase2a-notes.md) · [`wave7-phase2a-validation.md`](wave7-phase2a-validation.md) · [`ai-architecture-overview.md`](ai-architecture-overview.md) · [`prompt-contracts.md`](prompt-contracts.md) |
| **Phase 2B** | Sales Copilot Foundation (SC-1) | **COMPLETE — PASS** | [`wave7-phase2b-notes.md`](wave7-phase2b-notes.md) · [`wave7-phase2b-validation.md`](wave7-phase2b-validation.md) · `features/leads/copilot/*` |
| **Phase 2C** | Live Provider + Confirm-to-Write contracts | **COMPLETE — PASS** | [`wave7-phase2c-notes.md`](wave7-phase2c-notes.md) · [`wave7-phase2c-validation.md`](wave7-phase2c-validation.md) · [`provider-architecture.md`](provider-architecture.md) · [`confirm-write-contract.md`](confirm-write-contract.md) |
| **Phase 2D / W7-AI-3** | Confirm-to-Write execution layer | **COMPLETE — PASS** | [`wave7-phase2d-notes.md`](wave7-phase2d-notes.md) · [`wave7-phase2d-validation.md`](wave7-phase2d-validation.md) · [`proposal-execution-architecture.md`](proposal-execution-architecture.md) · [`confirm-write-flow.md`](confirm-write-flow.md) |
| **Phase 3** | Executive consolidation of integration / security / reliability / performance / production-readiness audits | **COMPLETE — FAIL / BLOCKED** | [`wave7-agent1-integration-audit.md`](wave7-agent1-integration-audit.md) · [`wave7-agent2-security-review.md`](wave7-agent2-security-review.md) · [`wave7-agent3-reliability.md`](wave7-agent3-reliability.md) · [`wave7-agent4-performance.md`](wave7-agent4-performance.md) · [`wave7-agent5-production-readiness.md`](wave7-agent5-production-readiness.md) · [`wave7-phase3-executive-report.md`](wave7-phase3-executive-report.md) |
| **Phase 3A** | Remediation validation of the Phase 3 blockers on the current branch | **COMPLETE — FAIL** | [`wave7-phase3a-agent0-backend.md`](wave7-phase3a-agent0-backend.md) · [`wave7-phase3a-agent1-provider.md`](wave7-phase3a-agent1-provider.md) · [`wave7-phase3a-agent2-security-validation.md`](wave7-phase3a-agent2-security-validation.md) · [`wave7-phase3a-agent3-performance-validation.md`](wave7-phase3a-agent3-performance-validation.md) · [`wave7-phase3a-agent4-tooling.md`](wave7-phase3a-agent4-tooling.md) · [`wave7-phase3a-validation.md`](wave7-phase3a-validation.md) |
| **W7-AI-4+** | Later AI slices / MI digest / broader enablement | Blocked until Phase 3 blockers are remediated and explicit named auth is given | [`wave7-ai-architecture.md`](wave7-ai-architecture.md) §9 |
| **Phase 2+ feature tracks** | Copilot / MI / Predictive / Knowledge (per plan) | Not started | Agent 1–4 Phase 1 docs |
| **Ops track** | Indexes/functions deploy (`W7-OPS-1`) | Parallel ops — does not reopen Wave 6 | Ops runbook |

Exact non-AI feature-agent split for Admin Dashboard remains TBD at product scope lock — do not invent parallel contract systems.

---

## Phase 1 artifact index (COMPLETE)

| Track | Document | Status |
| --- | --- | --- |
| Master AI | [`wave7-ai-architecture.md`](wave7-ai-architecture.md) | Done |
| Agent 0 — Platform | [`wave7-agent0-architecture.md`](wave7-agent0-architecture.md) | Done |
| Agent 1 — Sales Copilot | [`wave7-agent1-sales-copilot.md`](wave7-agent1-sales-copilot.md) | Done |
| Agent 2 — Manager Intelligence | [`wave7-agent2-manager-intelligence.md`](wave7-agent2-manager-intelligence.md) | Done |
| Agent 3 — Predictive CRM | [`wave7-agent3-predictive-crm.md`](wave7-agent3-predictive-crm.md) | Done |
| Agent 4 — Knowledge Platform | [`wave7-agent4-knowledge-platform.md`](wave7-agent4-knowledge-platform.md) | Done |
| Agent 5 — Validation | [`wave7-agent5-validation.md`](wave7-agent5-validation.md) | **PASS** |
| Executive report | [`wave7-phase1-executive-report.md`](wave7-phase1-executive-report.md) | Done |
| Risk assessment | [`wave7-risk-assessment.md`](wave7-risk-assessment.md) | Done |

---

## Phase 2A (COMPLETE) — AI Platform Foundation

**Delivered:** `@/shared/ai` stub platform — orchestrator, `lead-brief-v1`, context builders, flags (`AI_ENABLED=false`), READ_ONLY safety, 59 tests.  
**Docs:** [`wave7-phase2a-validation.md`](wave7-phase2a-validation.md) (**PASS**).

## Phase 2B (COMPLETE) — Sales Copilot Foundation

**Delivered:** Read-only Sales Copilot Drawer on Lead Detail — `lead-brief-v1` via orchestrator when enabled; Wave 6 rules fallback; display safety; tests.  
**Docs:** [`wave7-phase2b-validation.md`](wave7-phase2b-validation.md) (**PASS**).

## Phase 2C (COMPLETE) — Live Provider + Confirm-to-Write

**Theme:** Live Provider Integration & Confirm-to-Write Contracts  

**Delivered:** `createAiRuntime()` + `ProviderFactory` live path, callable-backed Gemini proxy with server-side key custody, Copilot runtime adoption, and proposal-only confirm-to-write contracts locked to `PENDING_CONFIRMATION`. Safety remains READ_ONLY; no CRM execution shipped.  
**Docs:** [`wave7-phase2c-validation.md`](wave7-phase2c-validation.md) (**PASS**).

## Phase 2D (COMPLETE) — W7-AI-3 Confirm-to-Write Execution

**Theme:** Human-confirmed proposal execution on Lead Detail only  

**Delivered:** proposal renderer, confirm dialog, execution validator, execution registry, idempotent executor, memory-only audit metadata, and shared-API-only commit paths for status, priority, follow-up, note, and assignment proposals. AI still performs zero direct Firestore writes and remains disabled by default.  
**Docs:** [`wave7-phase2d-validation.md`](wave7-phase2d-validation.md) (**PASS**).

**Authorize next:** later Wave 7 slices only by explicit named authorization. Do **not** assume broader AI enablement or Phase 3+ permission from the Phase 2D closeout itself.

## Phase 3 (COMPLETE - FAIL) — Executive Consolidation

**Theme:** Integration, security, reliability, performance, and production-readiness audit closeout

**Outcome:** Phase 3 completed with an overall **FAIL / BLOCKED** result. Integration and reliability passed, but security, performance, and production-readiness found critical blockers.

**Blocking summary:** the original executive blockers were the backend `aiComplete` trust boundary and the live timeout/retry/cancellation path. Those code-path issues were later remediated, but Phase 3 still remains blocked until Phase 3A remediation validation clears the remaining production blockers.

**Docs:** [`wave7-phase3-executive-report.md`](wave7-phase3-executive-report.md) (**FAIL / NO-GO**).

## Phase 3A (COMPLETE - PASS) — Remediation Validation

**Theme:** Re-validate blocker remediation against the current branch state

**Outcome:** The original critical backend and degraded-path timeout blockers, along with Phase 3A production blockers (assignment validation, strict date validation, Cloud Logging telemetry, and operations runbook), have been fully resolved. All regression and unit tests pass, and tooling validation is green.

**Docs:** [`wave7-phase3a-validation.md`](wave7-phase3a-validation.md) (**PASS**).

Details: [`wave7-phase2b-notes.md`](wave7-phase2b-notes.md) · [`ai-architecture-overview.md`](ai-architecture-overview.md) · [`wave7-phase1-executive-report.md`](wave7-phase1-executive-report.md)

---

## AI track (summary)

Master: [`wave7-ai-architecture.md`](wave7-ai-architecture.md) · Runtime overview: [`ai-architecture-overview.md`](ai-architecture-overview.md)

| Slice | Intent | Est. | Gate |
| --- | --- | --- | --- |
| **W7-AI-0 / 2A** | Stub provider + orchestrator + `lead-brief-v1` + context + flags + safety | 3–5 d | **COMPLETE — PASS** |
| **Phase 2B / W7-AI-1 UI** | Sales Copilot Foundation + read-only brief UI | 2–4 d | **COMPLETE — PASS** |
| **W7-AI-2 / 2C** | Live provider + key custody + limits + inert confirm-write contracts | 2–4 d | **COMPLETE — PASS** |
| **W7-AI-3 / 2D** | Proposal execution / confirm UI / commit path | 4–6 d | **COMPLETE — PASS** |
| **W7-AI-4** | Manager digest / optional tool agent | 5–10 d | Separate scope |

**Locked AI principles:** rules-first intelligence; no silent writes; single provider abstraction; shared APIs only for CRM mutates.

---

## Carry-forward backlog (from Wave 6 close)

Prioritized for planning — **not** authorized work unless explicitly pulled into a slice:

| ID | Item | Notes |
| --- | --- | --- |
| **W7-OPS-1** | Deploy Firestore indexes + scheduled functions if not live | Ops gate; `firestore:indexes` + 2C cron exports |
| **W7-P1** | Manager leads cursor pagination beyond 500 | Scale when tenants exceed hard cap |
| **W7-P2** | Broadcast notification legacy `userId` gap | Dual query or writers emit `userId: ""` |
| **W7-P3** | `phoneDigits` denormalization; callLogs off lead docs | Schema / long-term migration — no bulk backfill in Wave 6 V1 |
| **W7-P4** | Timeline load-older; list virtualization at larger caps | Only when windows grow past current caps |
| **W7-P5** | Automation slice 2 (missed-call / stuck notify) | Deferred by design in 2E; consume health — do not fork thresholds |
| **W7-P6** | MANUAL QA checklist from Wave 5 | Overlay keyboard/SR/Light–Dark when convenient |

Additional deferred themes from Wave 6 Phase 1 (optional later slices — not auto-included):

- Auto task generation; reassign-on-idle policies  
- `pBook-v1` calibration; rules brief / LLM S1 **behind** Agent 0 AI interface (see AI track)  
- Atomic booking when `plotId` present; lost-reason / reopen polish  
- Algolia-class search at very large N  
- Historical Admin Dashboard roadmap label — confirm at Phase 2 scope lock  

---

## Locked principles (carry from program)

- Prefer extend existing contracts / crons / primitives over greenfield engines  
- DLS bump only after validation + user authorize  
- No business-logic / Firestore / query changes outside authorized Wave 7 scope  
- Architecture layer locked unless Agent 0 activated for a shared defect or authorized AI platform slice  
- Soft residuals do not block later waves unless user reopens them  
- **AI:** CRM SoT; no silent writes; consume `@/shared/contracts` + intelligence — do not replace them  

---

## Explicit non-goals until authorized

- No later Wave 7 AI slice (`W7-AI-4+`) until explicit auth  
- No Wave 6 feature reopen  
- No DLS version bump  
- No live AI provider / API keys without W7-AI-2-class auth  
- No Firestore/DLS changes for AI without AO + user auth  
- No BPM / bulk callLogs migration by default  
- Do not flip `AI_ENABLED` to true in production without product auth  

---

## STOP

**Wave 7 is formally CLOSED (PASS).**  

**Next gate:** Keep AI disabled by default. If live AI is to be enabled in production, proceed with the deployment checklist and verify telemetry dashboards as described in the operations runbook [`wave7-ai-ops-runbook.md`](wave7-ai-ops-runbook.md). Prepare for Wave 8 planning.
