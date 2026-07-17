# Wave 7 — Risk Assessment (Phase 1 Governance)

**Status:** **ACTIVE register** (planning freeze)  
**Date:** 2026-07-14  
**Owner:** Agent 5 (Governance)  
**Scope:** AI platform + feature tracks planned in Wave 7 Phase 1  
**Baseline:** Wave 6 CLOSED — PASS  
**Companion:** [`wave7-agent5-validation.md`](wave7-agent5-validation.md)

---

## Risk rating key

| Level | Meaning |
| --- | --- |
| **Critical** | Stop ship / block live provider until mitigated |
| **High** | Must mitigate before that slice ships |
| **Medium** | Mitigate in same slice or immediate follow-up |
| **Low** | Monitor; accept with documentation |

Likelihood: L / M / H. Impact: L / M / H.

---

## 1. Platform & write-path risks

| ID | Risk | L | I | Severity | Mitigation | Gate |
| --- | --- | --- | --- | --- | --- | --- |
| **WR-1** | Silent CRM writes from AI/tools | M | H | **Critical** | `writePolicy: none` default; tools propose only; confirm Dialog; code review | Before any tool commit |
| **WR-2** | Model invents status / score / NBA | H | H | **Critical** | Rules-first; strip forbidden fields; `planStatusTransition` before Apply | W7-AI-1+ |
| **WR-3** | Parallel FCM / automation / timeline bus | L | H | **High** | Forbidden tools; reuse publishers + automation only | All impl |
| **WR-4** | Feature agents import vendor SDKs | M | M | **High** | Lint/review: SDKs only under `shared/ai` (or AO module) | W7-AI-0 |

---

## 2. Privacy & security

| ID | Risk | L | I | Severity | Mitigation | Gate |
| --- | --- | --- | --- | --- | --- | --- |
| **PR-1** | PII (phone/email/notes) sent to third-party LLM | M | H | **Critical** | Context allowlists; redact; prefer Functions proxy | W7-AI-2 |
| **PR-2** | Knowledge ACL leak across agents | M | H | **Critical** | Index metadata + server re-check; two-agent tests | Knowledge 2B |
| **PR-3** | Prompt injection via lead notes / WA text | H | M | **High** | Mark untrusted; system forbids following notes as instructions | W7-AI-1 |
| **PR-4** | API keys in client / Capacitor bundle | L | H | **Critical** | Server/env only; never embed | W7-AI-2 |
| **PR-5** | Audit logs store full prompts with PII | M | M | **Medium** | Hash context; metadata-only by default | Audit schema auth |
| **PR-6** | Ungrounded policy/pricing answers | M | H | **High** | Citations required; refuse if no sources; extractive-first | Knowledge 2C |

---

## 3. Product / trust & overlap

| ID | Risk | L | I | Severity | Mitigation | Gate |
| --- | --- | --- | --- | --- | --- | --- |
| **TR-1** | Forked NBA vs `next-action-v1` | M | H | **High** | Single adapter; unit assert equality | Copilot SC-1 |
| **TR-2** | Competing forecasts (MI vs Predictive) | M | M | **Medium** | A3 owns stamps; A2 displays + fallback method label | MI 2C / A3 R4 |
| **TR-3** | Forecast treated as booking commitment | M | H | **High** | Method + confidence + “estimate” label | Forecast UI |
| **TR-4** | Coaching perceived as punitive | M | M | **Medium** | Evidence-first; human publish only | MI coaching |
| **TR-5** | UI clutter / second intelligence product | M | M | **Medium** | Drawer assistive; strip remains SoR for score | Copilot UI |
| **TR-6** | Dual search confuses agents | M | L | **Low** | Clear Filters vs Ask CRM modes | Knowledge 2B |
| **TR-7** | “Lost lead” labels hurt morale | L | M | **Medium** | Soft copy; manager-only harsh predictors | Predictive R3 |

---

## 4. Cost, ops & scale

| ID | Risk | L | I | Severity | Mitigation | Gate |
| --- | --- | --- | --- | --- | --- | --- |
| **CO-1** | LLM cost overrun (every Lead Detail open) | M | M | **High** | Flags default off; throttle; cache by hash later | W7-AI-2 |
| **CO-2** | Embed every WA message | M | H | **High** | Windowed chunks; skip media; budget alarms | Knowledge 2B |
| **CO-3** | Manager 500-lead cap skews portfolio AI | H@scale | H | **High** | Stamp “partial portfolio”; prioritize W7-P1 | MI / Forecast |
| **CO-4** | Automation crons not deployed (W7-OPS-1) | M | M | **Medium** | Graceful degrade; “automation offline” | MI Brief |
| **CO-5** | List perf from per-row predictors | M | M | **Medium** | Detail-first; list opt-in; no cache without auth | Predictive R3 |
| **CO-6** | Vendor lock-in | M | M | **Medium** | Single `AiProvider` interface | Ongoing |

---

## 5. Scope & program risks

| ID | Risk | L | I | Severity | Mitigation | Gate |
| --- | --- | --- | --- | --- | --- | --- |
| **SC-1** | Scope creep into BPM / workflow engine | L | H | **High** | Explicit non-goals; Agent 5 reject | Any slice |
| **SC-2** | Pressure for Firestore vector collections | M | M | **Medium** | External index only unless AO revises | Knowledge 2A |
| **SC-3** | Admin Dashboard rewrite under AI banner | M | M | **Medium** | Additive panels only; separate Admin auth | Phase 2 scope |
| **SC-4** | Wave 6 reopen via “AI needs schema” | M | H | **High** | No schema without AO + user; compute-on-read default | All |
| **SC-5** | DLS bump for AI chrome | L | L | **Low** | Reuse v1.4 Modal/Drawer | UI slices |
| **SC-6** | Naming collision (W7-AI-* vs SC-* vs MI-*) | M | L | **Low** | Phase 2 auth uses platform IDs first | Auth wording |

---

## 6. Residual Wave 6 carry-forward (interaction with AI)

| ID | Item | AI interaction |
| --- | --- | --- |
| W7-OPS-1 | Indexes + scheduled functions | Incomplete SLA/FU signals for MI briefs |
| W7-P1 | Manager cursor >500 | Portfolio forecast / aggregations biased |
| W7-P3 | phoneDigits / callLogs migration | Knowledge phone exact match weaker until done |
| W7-P5 | Automation slice 2 | Richer missed-opp / churn consumers — separate auth |

These do **not** block W7-AI-0.

---

## 7. Risk acceptance for Phase 1

| Statement | Accepted? |
| --- | --- |
| Planning docs sufficient; open decisions deferred to first impl auth | **Yes** |
| No live provider / keys in Phase 1 | **Yes** |
| Critical write/PII risks remain theoretical until code — mitigations specified | **Yes** |
| Phase 2 may start with W7-AI-0 without resolving Knowledge vendor | **Yes** |

---

## 8. Pre-flight checklist (before live provider)

- [ ] W7-AI-0 stub + orchestrator tests green  
- [ ] Context redaction tests for lead brief  
- [ ] Key custody path chosen (proxy recommended)  
- [ ] Rate limits + kill switch  
- [ ] Privacy review signed off (Agent 5 / AO)  
- [ ] Feature flag default **off**  

---

## STOP

Risk register is frozen for Phase 1 planning. Update this file when a Phase 2 slice ships or a new Critical risk is discovered. Do not begin implementation without named user authorization.
