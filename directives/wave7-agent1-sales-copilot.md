# Wave 7 Phase 1 — Agent 1: Sales Copilot (PLAN ONLY)

**Status:** **PLAN ONLY — no implementation**  
**Date:** 2026-07-14  
**Role:** Feature planning (Sales Copilot)  
**App:** `telecaller-app/`  
**DLS:** **v1.4** (unchanged unless separately authorized)  
**Parent plan:** [`wave7-execution-plan.md`](wave7-execution-plan.md)  
**Baseline:** Wave 6 CLOSED — PASS ([`wave6-complete.md`](wave6-complete.md))

---

## Purpose

Design a **Sales Copilot** that sits on Lead Detail (and optionally Dialer / pre-call) and helps agents sell: briefs, summaries, follow-ups, objections, booking readiness, next best action, and meeting prep.

**Hard product rule:** Copilot **recommends only**. It never silently mutates CRM state. Any write (status, follow-up, note, site visit, call log, WhatsApp) goes through **existing CRM write paths** only after **explicit user confirm**.

This document is planning. Do **not** implement until Wave 7 Phase 1 (and this agent slice) is explicitly authorized.

---

## Language (aligned)

| Term | Meaning |
| --- | --- |
| **Sales Copilot** | Assistive UI + optional LLM layer that proposes actions/copy; not an autonomous agent |
| **Recommend** | Display suggestion + rationale; no Firestore write |
| **Confirm → write** | User accepts a suggestion; app calls existing `updateLead` / `logCall` / site-visit / timeline publishers |
| **Next Best Action (NBA)** | Same semantic as Wave 6 `next-action-v1` (`LeadNextAction`); Copilot may **explain / enrich** but must **not fork** the decision table |
| **S0 / S1 / S2** | Rules brief (shipped) → LLM brief → coaching (objections / prep); from Wave 6 Agent 4 audit |
| **Booking readiness** | Explainable readiness from `pBook-v1` + stage / visit / docs signals — not a new score formula |

---

## Capability map

| Capability | User job | Primary inputs | Output shape | Write on confirm? |
| --- | --- | --- | --- | --- |
| **1. Lead Brief** | 10-second “who is this?” before dial | Lead fields, score/health, NBA, project | 3–5 bullets + badges | No (read-only) |
| **2. Customer Summary** | Stable profile of the person | Name, phone, source, project/plot interest, budget signals, family/decision notes from history | Structured card (not free-form dump) | Optional: “Save as note” → note/timeline only |
| **3. Conversation Summary** | Catch up on call/WA history | Timeline events + last N `callLogs` notes | Chronological bullets or S1 LLM brief | Optional: pin/save summary text as note |
| **4. Suggested Follow-up** | Propose next FU date/time + channel | NBA, overdue/idle health, IST calendar, last connect | `{ channel, dueAtIst, reason, draftMessage? }` | Yes → `followUpDate` (+ optional WA/call) via existing APIs |
| **5. Objection Handling** | Live coaching on common pushbacks | Status, notes keywords, project context; S0 cheat sheet → S2 LLM | Objection → response pairs + CTA | Optional: log objection tag via `logCall` / note |
| **6. Booking Readiness** | “How close to book?” | `pBook-v1`, stage, site visit, discount, reserved signals | Band + checklist gaps + next gate | Yes only if user acts on a gap (e.g. schedule visit) |
| **7. Next Best Action** | Single primary move | **Frozen** `decideNextActionV1` / `nextActionV1` | Same `LeadNextAction` + Copilot rationale / script hook | Yes → open Call / WA / Site Visit / Merge flows — never invent new action types without Agent 0 |
| **8. Meeting Preparation** | Prep for site visit / family meeting | Visit datetime, project, plot, prior objections, attendees notes | Agenda, talk track, checklist, materials | Optional: confirm visit / add note |

### Capability → Wave 6 reuse

```
Lead Brief ──────────────► lead-score-v1 + health + S0 summary + next-action-v1
Customer Summary ────────► Lead model + timeline + callLogs (S0/S1)
Conversation Summary ────► Timeline one-intent events + S0 → S1
Suggested Follow-up ─────► health idle/overdue + NBA channel + IST helpers
Objection Handling ──────► SmartCallScript cheat sheet (S0) → S2 coaching
Booking Readiness ───────► pBook-v1 + status/visit/discount signals
Next Best Action ────────► next-action-v1 ONLY (enrich, do not fork)
Meeting Preparation ─────► siteVisit + project + conversation summary
```

---

## Architecture proposal

### Principles

1. **Extend, don’t fork** — consume `@/shared/contracts` intelligence + timeline + status transitions; no parallel NBA table.
2. **Recommend / confirm / write** — Copilot service returns `CopilotSuggestion[]`; UI confirms; writers are existing CRM APIs.
3. **Deterministic first** — S0 rules ship without LLM; S1/S2 behind Architecture Owner AI interface + feature flag.
4. **Compute-on-read** — no new Firestore intelligence collections unless Agent 0 authorizes cache.
5. **Presentation on DLS v1.4** — Drawer / Modal / Dialog + Form Contract §3e; no third overlay system.

### Proposed layers

```
┌─────────────────────────────────────────────────────────┐
│  UI (DLS v1.4)                                           │
│  SalesCopilotDrawer | PreCallBrief | Confirm Dialogs     │
└───────────────────────────┬─────────────────────────────┘
                            │ read suggestions / confirm
┌───────────────────────────▼─────────────────────────────┐
│  Copilot orchestration (feature)                         │
│  assembleBrief | suggestFollowUp | meetingPrep | …       │
│  maps NBA → UI CTAs; never mutates lead directly         │
└─────────────┬───────────────────────────┬───────────────┘
              │ deterministic              │ optional LLM
┌─────────────▼─────────────┐   ┌─────────▼───────────────┐
│ Wave 6 intelligence       │   │ Agent 0 AI interface     │
│ computeLeadIntelligence   │   │ S1 brief / S2 coaching   │
│ next-action-v1, pBook-v1  │   │ never auto-writes CRM    │
└─────────────┬─────────────┘   └─────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────┐
│  Existing CRM writers (confirm path only)                │
│  updateLead · logCall · planStatusTransition             │
│  SiteVisitScheduler · timeline publishers · WA send      │
└─────────────────────────────────────────────────────────┘
```

### Suggested (non-persisted) suggestion contract (planning shape)

Agent 0 should freeze this before Phase 2 code — sketch only:

| Field | Role |
| --- | --- |
| `id` | Stable suggestion id for UI confirm |
| `capability` | `lead_brief` \| `follow_up` \| … |
| `kind` | `info` \| `action` |
| `title` / `body` | Human-readable |
| `rationale` | Why (cite score factor / health reason / NBA reason) |
| `alignedNextAction?` | Copy of `LeadNextAction` when capability = NBA |
| `proposedWrite?` | Declarative patch intent (e.g. `{ followUpDate }`) — **executed only via CRM APIs** |
| `source` | `rules` \| `llm` |
| `confidence?` | Optional for LLM tiers |

### Confirm → write flow

1. Copilot shows suggestion + primary CTA (“Apply follow-up”, “Open call log”, “Schedule visit”).
2. User confirms via **Dialog** (FormActions: Secondary Cancel → Primary Confirm).
3. Host calls **existing** writer (`updateLead`, `logCall`, site-visit planner, etc.).
4. Timeline emit remains **one intent → one event** (Wave 6 2B).
5. Copilot refreshes from compute-on-read (no optimistic invent of score/NBA).

**Forbidden:** Copilot Cloud Function that writes `status` / `priority` / `followUpDate` without a user-confirm UI path; silent LLM overwrite; forking `decideNextActionV1`.

---

## Dependencies on Wave 6 systems

| Wave 6 system | How Copilot depends | Constraint |
| --- | --- | --- |
| **Contracts** (`leadIntelligence`, status transitions, automation thresholds) | NBA, health, score, pBook shapes | Do not fork thresholds or next-action table |
| **Intelligence v1** (`computeLeadIntelligence`, strips) | Lead Brief / NBA / Booking Readiness base | Extend S0 summary; keep version stamps |
| **Timeline normalization (2B)** | Conversation Summary quality | Prefer typed events over note scraping |
| **Automation (2C)** | Follow-up / visit reminders stay SoR for overdue | Copilot suggests; crons still own notify |
| **Performance (2E)** | Lead Detail already loads lead + peers | Avoid full-collection scans; reuse loaded peers for dup |
| **DLS v1.4** | Drawer / Dialog / FormActions | No DLS bump; no parallel Sheet |

**Carry-forward awareness (not Copilot blockers):** W7-OPS-1 indexes/functions; W7-P5 automation slice 2 — Copilot must not invent parallel overdue logic.

**Wave 6 deferred that Copilot partially fulfills:** optional LLM S1 behind Agent 0 AI interface; richer rules brief / coaching (S2).

---

## Required APIs

### Already exist — consume

| API / surface | Path / owner | Copilot use |
| --- | --- | --- |
| `computeLeadIntelligence` | `features/leads/intelligence/` | Brief, NBA, booking readiness, health |
| `decideNextActionV1` / `nextActionV1` | `shared/contracts` + `nextAction.ts` | **Canonical NBA** |
| `LeadIntelligenceStrip` / Daily Priorities | UI | Pattern for badges; Copilot expands |
| `updateLead` | `useLeadsStore` | Confirm: FU date, status patches, visit fields |
| `logCall` | `useLeadsStore` | Confirm: outcome + notes (call persistence only) |
| `planStatusTransition` | `@/shared/contracts` | Confirm: status changes — never raw status string writes |
| Site visit schedule path | `SiteVisitScheduler` + transition helpers | Confirm: schedule / confirm visit |
| Timeline publishers | `timelinePublisher.ts` | Emit via existing writers — Copilot does not call raw `recordTimelineEvent` with free strings |
| `SmartCallScript` | Lead Detail | S0 objection + script seed (replace/upgrade in Copilot panel) |
| WhatsApp templates / assistant | Messaging feature | Suggested Follow-up / NBA `whatsapp` channel |
| IST date helpers | contracts / automation | Follow-up + meeting prep times |

### Need Agent 0 (before feature code)

| API | Why | Notes |
| --- | --- | --- |
| **AI interface (S1/S2)** | LLM brief + objection coaching | Architecture Owner–owned; feature-flagged; never auto-write |
| **`CopilotSuggestion` contract** | Shared confirm payload | Freeze fields; version string e.g. `copilot-suggest-v1` |
| **NBA enrichment adapter** | Map `LeadNextActionType` → CTA + default writer intent | Must call into existing flows, not new writers |
| **Prompt / context pack builder** | Timeline + notes truncation, PII hygiene | Deterministic packing before LLM |

### Explicit non-APIs

- No new BPM / rules engine  
- No Copilot-owned Firestore collection for “agent memory” in v1  
- No auto-assignment / reassignment from Copilot  
- No schema redesign for scores  

---

## UI concepts (DLS v1.4)

### Placement

| Surface | Pattern | Content |
| --- | --- | --- |
| **Lead Detail** | Primary: `Drawer` (right, `md`/`lg`) “Sales Copilot”; secondary: compact strip under / beside Intelligence | All 8 capabilities, tabbed or accordion sections |
| **Pre-call / Dialer** | Compact **Lead Brief** + NBA CTA only | Avoid full Drawer mid-dial |
| **Confirm** | `Dialog` + `FormActions` | Apply follow-up, save note, schedule visit |
| **Meeting day** | Same Drawer → Meeting Preparation section auto-focused when visit ≤ today | |

### Visual rules (locked)

- Reuse `card-premium` / `Badge` / `WidgetHeader` patterns from Intelligence strip — **quiet Command Surface**, not a second dashboard.
- Theme: all `bg-*` / `text-*` / `border-*` with `dark:` parity (`ui-registry.md`).
- Overlay: **Modal / Dialog / Drawer only** (§3f) — no parallel Sheet.
- Forms: shared `Input` / `Select` / `Textarea` + `FormActions` (§3e).
- Label generative content: badge `Rules` vs `AI` (`source: rules | llm`).
- Show **NBA reason** from `next-action-v1` verbatim; Copilot “coaching” is additive below, not a replacement label.
- Do **not** put Copilot chrome in the first viewport of non-Lead pages; Lead Detail keeps pipeline + Intelligence as SoR, Copilot as assistive drawer.

### Section layout (Drawer body — one job per section)

1. **Lead Brief** (always first)  
2. **Next Best Action** (primary CTA group)  
3. **Booking Readiness** (checklist)  
4. **Suggested Follow-up**  
5. **Conversation Summary** / **Customer Summary** (tabs)  
6. **Objection Handling**  
7. **Meeting Preparation** (when visit exists or NBA = schedule/host visit)

### CTA mapping (NBA → existing UI)

| `LeadNextActionType` | Primary CTA | Writer on confirm |
| --- | --- | --- |
| `call` | Start / Log call | `logCall` (+ optional status via transition plan) |
| `whatsapp` | Open WA assistant / template | Existing WA send path |
| `schedule_visit` | Open Site Visit scheduler | `updateLead` + transition |
| `log_outcome` | Open Call Logging | `logCall` |
| `request_discount` | Open Discount manager | `updateLead` discountRequest |
| `close_lost` | Confirm lost Dialog | `planStatusTransition` → `updateLead` |
| `merge_review` | Deep link merge / admin | Existing merge flow |

---

## Rollout phases

| Phase | Scope | Gate | Effort (rough) |
| --- | --- | --- | --- |
| **W7-SC-0** | Agent 0: freeze `CopilotSuggestion` + AI interface stub; flag `salesCopilot` | Arch + user auth | S |
| **W7-SC-1** | **S0 Copilot Drawer** — Lead Brief, NBA panel (wired to `next-action-v1`), Booking Readiness (`pBook-v1` + gaps), Suggested Follow-up (rules), Objection S0 (migrate/upgrade SmartCallScript), Meeting Prep checklist (rules) | Phase auth | M |
| **W7-SC-2** | Confirm → write for FU / note / open scheduler / call log — Dialogs only; no new writers | SC-1 PASS | S–M |
| **W7-SC-3** | Conversation + Customer Summary S0 polish; optional pin-as-note | SC-2 PASS | S |
| **W7-SC-4** | **S1 LLM** Conversation / Lead Brief enrichment behind AI interface + flag | Timeline quality OK + cost OK | M |
| **W7-SC-5** | **S2** Objection Handling + Meeting Prep generative coaching | S1 quality validated | M |
| **W7-SC-6** | Dialer / pre-call compact Brief | Optional | S |

**Recommended first ship:** SC-0 → SC-1 → SC-2 (deterministic Copilot with confirm writes). Defer LLM until authorized.

**Parallel ops (not this agent):** W7-OPS-1 if reminders must be live for follow-up trust.

---

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Forking NBA vs `next-action-v1` | High | Single adapter; unit tests assert Copilot NBA === `nextActionV1` |
| Silent / accidental CRM writes | High | Recommend-only default; Dialog confirm; no server auto-apply |
| LLM hallucination (wrong FU/status) | High | S1/S2 suggest text only; writes still user-confirmed structured fields |
| LLM cost / latency on every Lead Detail open | Med | Flag off by default; cache brief per lead+hash; S0 always available |
| PII in prompts | Med | Agent 0 context pack: redact/minimize phone; no secrets in logs |
| UI clutter / second “intelligence” product | Med | Drawer not permanent page chrome; reuse Intelligence strip as SoR for score |
| Conflict with automation reminders | Med | Copilot proposes FU; automation thresholds unchanged |
| SmartCallScript amber one-off styling drift | Low | Restyle into DLS tokens when migrating into Copilot |
| Duplicate of Daily Priorities | Low | Copilot is per-lead assist; priorities remain queue SoR |

---

## Effort summary

| Slice | Size | Notes |
| --- | --- | --- |
| Contracts + AI stub (Agent 0) | **S** | Suggestion shape + interface |
| S0 Drawer + 6 deterministic capabilities | **M** | Brief, NBA, readiness, FU suggest, objections S0, meeting prep |
| Confirm → existing writers | **S–M** | Dialogs + intent mapping |
| S1 LLM summaries | **M** | Interface, packing, flag, eval |
| S2 coaching | **M** | After S1 |
| Dialer compact | **S** | Optional |

**Overall to useful production (SC-0…SC-2):** ~**M** (one focused feature slice).  
**Full generative coaching (through SC-5):** ~**L**, gated on AI interface + cost.

---

## Acceptance criteria (for a future implementation — not executed now)

- [ ] Copilot never writes CRM fields without an explicit confirm Dialog / FormActions path.  
- [ ] Displayed NBA `type` / `reason` / `channel` match `nextActionV1` for the same lead snapshot.  
- [ ] Booking readiness uses `pBook-v1` + explainable gaps — no parallel probability model.  
- [ ] Follow-up apply uses `updateLead` (and IST date helpers); status changes use `planStatusTransition`.  
- [ ] Call outcomes use `logCall` only for call persistence; no `Lead.notes` overwrite regressions (Wave 6 rule).  
- [ ] Timeline remains one intent → one emit.  
- [ ] S0 works with LLM flag off.  
- [ ] S1/S2 go through Agent 0 AI interface only; UI labels `source`.  
- [ ] UI uses Drawer / Dialog / FormActions per DLS **v1.4**; Light + Dark theme classes.  
- [ ] No DLS version bump; no Wave 6 feature reopen; no new intelligence Firestore collection without auth.

---

## Explicit non-goals (this plan)

- Autopilot that dials, sends WA, or changes status without confirm  
- Replacing Leaderboard agent score or Daily Priorities ranking  
- Admin Dashboard (historical Wave 7 label) — separate track  
- BPM engine, Algolia, callLogs-off-document migration  
- Reopening Wave 6 closed features  

---

## Source index

| Area | Reference |
| --- | --- |
| Wave 7 parent | `directives/wave7-execution-plan.md` |
| Wave 6 close | `directives/wave6-complete.md`, `wave6-final-summary.md` |
| Intelligence audit / S0–S2 | `directives/wave6-agent4-intelligence-audit.md` |
| Intelligence notes | `directives/wave6-phase2d-notes.md` |
| Contracts | `telecaller-app/src/shared/contracts/leadIntelligence.ts` |
| Compute | `telecaller-app/src/features/leads/intelligence/*` |
| NBA UI today | `LeadIntelligenceStrip.tsx` |
| Scripts / objections S0 | `SmartCallScript.tsx` |
| Arch AI rule | `directives/wave6-agent0-architecture-review.md` |
| DLS | `ui-registry.md` v1.4 (§3e Form, §3f Modal/Drawer) |

---

## STOP

**Planning complete for Agent 1 Sales Copilot.**  

No application code. Await explicit authorization (e.g. **“Authorize Wave 7 Phase 1”** / **“Authorize Sales Copilot SC-0”**) before Agent 0 contract freeze or any implementation.
