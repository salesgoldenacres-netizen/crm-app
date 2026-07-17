# Wave 7 Phase 1 — Agent 2: Manager Intelligence (Planning Only)

**Status:** **PLAN ONLY — documentation complete; no implementation**  
**Date:** 2026-07-14  
**App:** `telecaller-app/`  
**Audience:** Managers / Admin / Architecture Owner (Agent 0) / Agent 5 governance  
**DLS:** remains **v1.4** (no bump in this phase)  
**Constraint:** No production code, no AI providers, no Firestore/schema/DLS changes.

---

## Executive verdict

Manager Intelligence is the **team-level AI assistant** that sits on Wave 6 foundations (contracts, timeline, automation SLA, lead intelligence, daily priorities, leaderboard / admin analytics). It summarizes, explains, ranks coaching opportunities, and forecasts — **it never silently mutates CRM state**.

Wave 6 shipped **per-lead** intelligence (`lead-score-v1`, health, `next-action-v1`, daily priorities) and **per-agent productivity** (leaderboard formula, Agent Report Card, Call Quality audits). Wave 7 Agent 2 composes those into **managerial narratives and alerts**. Predictive numbers that need calibrated models (booking/revenue/churn at portfolio scale) are **consumed from Agent 3** when available; Agent 2 does not fork scoring formulas.

---

## Language (aligned)

| Term | Meaning in this plan |
| --- | --- |
| **Manager Intelligence** | Read-only + recommend-only AI surface for managerial roles; team/portfolio scope |
| **Daily Team Brief** | IST-day narrative: what happened yesterday, what’s due today, what’s at risk |
| **Pipeline Health** | Stage-distribution + health-band aggregation of owned leads (not a new scorer) |
| **Sales Forecast** | Expected bookings / revenue over a horizon — prefers Agent 3 Conversion / Revenue Forecast; rules fallback until then |
| **Rep Coaching** | Explainable coaching suggestions from activity gaps, SLA, call quality, conversion — not auto HR actions |
| **Missed Opportunity** | Detectable lost / delayed value (SLA breach, hot+critical idle, visit no-show, overdue FU on high score) |
| **Silent write** | Any CRM mutation without an explicit manager confirmation via existing shared APIs — **forbidden** |

---

## 1. Goals & non-goals

### 1.1 Goals

1. Give managers a **single morning brief** instead of stitching Admin KPIs + notifications + leaderboard manually.  
2. Surface **pipeline risk** using Wave 6 health / SLA / overdue signals — explainable.  
3. Produce **coaching cues** tied to evidence (activity, quality ratings, conversion gaps).  
4. Detect **missed opportunities** early enough to act (reassign, call-out, visit rescue) — action still human-confirmed.  
5. Keep AI as **assistant**: summarize / explain / recommend / prioritize only.

### 1.2 Non-goals (Phase 1 & early Phase 2+)

- No OpenAI / Gemini / Claude integration in this phase.  
- No Firestore collections, no score cache, no DLS redesign.  
- No change to `LeaderboardWidget` formula (`calls×10 + whatsapp×15 + bookings×100`) without separate product auth.  
- No forking of `lead-score-v1` / health / `next-action-v1` / `AUTOMATION_THRESHOLDS`.  
- No auto-reassign, auto-status change, auto-task creation, or silent notification spam from the AI layer.  
- No replacement of Admin Analytics / Agent Report Card — **augment**, do not rebuild dashboards.

---

## 2. Capability map

| ID | Capability | Definition | Primary inputs (Wave 6+) | Output | Consumer surfaces (concept) |
| --- | --- | --- | --- | --- | --- |
| **MI-1** | **Daily Team Brief** | IST-scoped narrative for the managerial scope (all leads or site/team filter) | Leads + intelligence snapshots, FU due/overdue, SLA breach notifications, attendance/status, leaderboard activity | `TeamBrief` (bullets + risk list + suggested focus) | Admin home / Manager Brief panel |
| **MI-2** | **Sales Forecast** | Expected bookings (and optional revenue) for 7/14/30d | Stage counts × `pBook` (v1 or Agent 3 v2), historical conversion from Admin reports, inventory if priced | `ForecastSlice[]` + confidence + method stamp | Admin Analytics strip; Brief footer |
| **MI-3** | **Pipeline Health** | Portfolio funnel + health aggregation | Status distribution, `LeadHealthBand` counts, critical/watch lists, stuck-threshold alignment | `PipelineHealthReport` (bands, stage gaps, top-N critical leads) | Admin Analytics; Leads manager view |
| **MI-4** | **Rep Coaching** | Per-rep coaching cards | Activity (calls/WA), conversion, overdue/SLA share, Call Audit stars + notes, idle agent signal | `CoachingCard[]` (focus, evidence, suggested talk track) | Agent Report Card adjacent; Coaching Tip store (manual publish only) |
| **MI-5** | **Missed Opportunity Detection** | Ranked opportunities where delay likely costs a booking | SLA breaches, hot+critical, high `score` + overdue, site-visit today without confirm, duplicate merge backlog | `MissedOpportunity[]` (leadId, type, urgency, explain) | Brief “Act now”; notification **suggestions** (not auto FCM) |
| **MI-6** | **Activity Summary** | Team activity rollup for a window | `callLogs` / timeline events, WhatsApp sends, bookings, attendance | `ActivitySummary` (counts, outliers, IST window) | Admin Analytics; printable report |
| **MI-7** | **Team Insights** | Cross-cutting patterns (not per-lead) | Aggregations across MI-2–6 + source/project slices | `TeamInsight[]` (pattern, evidence, recommendation) | Insights drawer / weekly digest |

### 2.1 Capability relationships

```
                    ┌─────────────────────────┐
                    │  Wave 6 truth layer     │
                    │  leads · timeline ·     │
                    │  automation · intel ·   │
                    │  leaderboard / admin    │
                    └───────────┬─────────────┘
                                │ read-only context builders
                    ┌───────────▼─────────────┐
                    │  Manager Intelligence   │
                    │  (compute + optional AI)│
                    └───────────┬─────────────┘
          ┌───────────┬─────────┼─────────┬───────────┐
          ▼           ▼         ▼         ▼           ▼
     Team Brief   Forecast  Pipeline   Coaching   Missed Opp
          │           │         │         │           │
          └───────────┴─────────┴────┬────┴───────────┘
                                     ▼
                              Team Insights
                                     │
                                     ▼
                         UI recommend-only → user confirm
                                     │
                                     ▼
                         Existing CRM / notification APIs
```

---

## 3. Architecture proposal

### 3.1 Layering (align with Agent 0)

| Layer | Responsibility | Owner |
| --- | --- | --- |
| **Context builders** | Assemble managerial scope: leads, users, IST day window, intelligence snapshots, SLA notify history, timeline digests | Agent 2 consume; Agent 0 owns shared builder interfaces |
| **Deterministic aggregators** | Pure functions: stage counts, health histograms, activity rollups, SLA breach counts, forecast rules fallback | Agent 2 implementation track (Phase 2+) |
| **AI narrative layer (optional)** | Turn aggregator JSON → prose brief / coaching language | Agent 0 provider abstraction; Agent 2 prompt contracts |
| **Tool / write gate** | No direct Firestore. Recommendations only. Confirmed actions call existing APIs (`updateLead`, assign, `publishNotification`, Call Audit, Coaching Tip store) | Hard safety rule |
| **Presentation** | DLS v1.4 panels — no new design system | Presentation track post-auth |

### 3.2 Deterministic-first hybrid

Same pattern as Wave 6 intelligence and Agent 3 predictive:

1. **Always** compute structured facts with pure aggregators (testable, explainable).  
2. **Optionally** pass facts into LLM for narrative polish (S1).  
3. If provider unavailable → show **rules brief** (S0) identical to aggregator bullets.  
4. Never let the model invent counts, statuses, or assignee names not present in context.

### 3.3 Version stamps (proposed — not implemented)

| Artifact | Version id | Notes |
| --- | --- | --- |
| Team brief rules | `team-brief-v1` | Bullet templates from aggregators |
| Forecast rules fallback | `mgr-forecast-v1` | Uses `pBook-v1` until Agent 3 supplies v2 |
| Pipeline health rollup | `pipeline-health-v1` | Histogram of Wave 6 health + stages |
| Coaching rules | `rep-coaching-v1` | Threshold cues; LLM optional |
| Missed opportunity | `missed-opp-v1` | Priority table below |
| Activity summary | `activity-summary-v1` | IST window rollup |
| Team insights | `team-insights-v1` | Pattern detectors over aggregators |

### 3.4 Safety rules (Manager Intelligence specific)

1. **No silent CRM writes** — no lead field updates, reassigns, status transitions, timeline emits, or FCM from AI without manager confirm.  
2. **No bypass** of `statusTransition`, timeline publishers, or automation idempotency.  
3. **No inventing business state** — if lead not in context, do not claim it.  
4. **Scope gate** — only managerial roles (`isManagerial`) invoke MI APIs; agents get Sales Copilot (Agent 1), not team briefs.  
5. **PII minimization** — context builders send lead ids + short digests, not full note dumps, unless manager expands.  
6. **Coaching Tip publish** — AI may *draft* tip text; writing to `useCoachingTipStore` requires explicit “Publish tip” action.  
7. **Notifications** — MI may *suggest* “Notify assignee about critical lead X”; sending uses existing `publishNotification` / automation paths with manager click.

---

## 4. Dependencies

### 4.1 Must consume (do not reinvent)

| Dependency | What MI uses | Source |
| --- | --- | --- |
| **Lead intelligence** | `score`, `health`, `nextAction`, `bookingProbability`, factors | `@/shared/contracts/leadIntelligence` + `features/leads/intelligence/*` |
| **Automation SLA** | First-touch breach signals, 24h threshold, manager escalation already shipped | `AUTOMATION_THRESHOLDS.SLA_FIRST_TOUCH_HOURS`, `AUTOMATION_JOB_TYPES.SLA_BREACH`, `functions/automation/slaBreachJobs.js` |
| **Automation FU / visit** | Overdue FU, visit reminders as risk inputs | Phase 2C jobs + thresholds (`LEAD_IDLE_DAYS`, visit reminder) |
| **Timeline** | Activity digests for briefs / insights (canonical events preferred over parsing `callLogs` tags) | Timeline publishers + `timelineEvents`; legacy `callLogs` as fallback |
| **Leaderboard / agent stats** | Productivity ranking context for coaching (formula **unchanged**) | `LeaderboardWidget` (`calls×10 + WA×15 + bookings×100`), `agentStats` badges |
| **Admin analytics** | Conversion KPI, date-range reports, agent status, report card | `AdminDashboard`, `AdminAnalyticsTab`, `AgentReportCardTab`, `CallQualityTab` |
| **Query scopes** | Managerial lead visibility / caps | `@/shared/contracts/queryScopes` (+ W7-P1 pagination when needed) |
| **Agent 0 AI platform** | Provider interface, prompt contracts, orchestration, tool allowlist | `wave7-agent0-architecture.md` / `wave7-ai-architecture.md` |
| **Agent 3 Predictive** | Booking Prob v2, Conversion / Revenue Forecast, confidence | `wave7-agent3-predictive-crm.md` — **additive**; MI forecast prefers these when stamped |
| **Agent 1 Copilot** | Per-lead brief / next action language — MI links out, does not duplicate | `wave7-agent1-sales-copilot.md` |

### 4.2 Soft dependencies / residuals

| ID | Item | Impact on MI |
| --- | --- | --- |
| **W7-OPS-1** | Deploy indexes + scheduled functions | SLA / FU signals incomplete if crons not live |
| **W7-P1** | Manager leads cursor >500 | Portfolio aggregations biased if hard-capped |
| **W7-P5** | Automation slice 2 (missed-call / stuck) | Richer missed-opp types when shipped |
| **SLA timeline event** | Still missing typed `sla_breach` timeline publish | Brief must also read notification/job idempotency or lead predicates — not only timeline |
| **CallLogs off lead docs** (W7-P3) | Long-term | Activity Summary should prefer timeline; keep dual-read until migration |

### 4.3 Explicit non-dependencies

- Do **not** wait on Knowledge Platform (Agent 4) for MI v1 — optional later for policy-aware coaching.  
- Do **not** require LLM for MI-3 Pipeline Health or MI-6 Activity Summary (fully deterministic).

---

## 5. Required APIs (proposed contracts — design only)

### 5.1 Read / compute APIs

```ts
// PROPOSAL ONLY — not in codebase

/** Managerial scope resolved from auth + optional filters */
interface ManagerScope {
  managerUserId: string;
  teamUserIds?: string[];       // empty = all non-managerial under tenant
  projectIds?: string[];
  asOfYmd: string;              // IST YYYY-MM-DD
}

interface TeamBriefRequest {
  scope: ManagerScope;
  includeNarrative?: boolean;   // S1 LLM; default false until provider live
}

interface TeamBrief {
  version: "team-brief-v1";
  asOfYmd: string;
  headlines: string[];          // ≤5 deterministic bullets
  risks: MissedOpportunity[];   // top N
  focusReps: { userId: string; reason: string }[];
  narrative?: { text: string; source: "rules" | "llm"; model?: string };
  computedAt: string;
}

interface PipelineHealthReport {
  version: "pipeline-health-v1";
  stageCounts: Record<string, number>;
  healthCounts: { healthy: number; watch: number; critical: number };
  criticalLeadIds: string[];    // capped
  watchLeadIds: string[];
  explain: string[];
}

interface ForecastSlice {
  horizonDays: 7 | 14 | 30;
  expectedBookings: number;
  expectedRevenue?: number;     // only if priced inventory available
  method: "mgr-forecast-v1" | "agent3-conversion-v2" | "agent3-revenue-v2";
  confidence: number;           // 0–1
  drivers: { label: string; delta: number }[];
}

interface CoachingCard {
  version: "rep-coaching-v1";
  userId: string;
  focus: "activity" | "conversion" | "sla" | "quality" | "follow_up_discipline";
  evidence: string[];
  suggestion: string;
  severity: "info" | "watch" | "critical";
}

type MissedOpportunityType =
  | "sla_first_touch"
  | "hot_critical_idle"
  | "high_score_overdue"
  | "visit_at_risk"
  | "duplicate_backlog"
  | "stuck_lead";               // when W7-P5 live

interface MissedOpportunity {
  version: "missed-opp-v1";
  type: MissedOpportunityType;
  leadId: string;
  urgency: number;              // sort key
  reason: string;
  suggestedAction: "call_now" | "reassign_review" | "visit_confirm" | "merge_review" | "coach_rep";
  // suggestedAction is advisory — never auto-executed
}

interface ActivitySummary {
  version: "activity-summary-v1";
  window: { fromYmd: string; toYmd: string };
  totals: { calls: number; whatsapp: number; bookings: number; visits: number };
  byUser: { userId: string; calls: number; whatsapp: number; bookings: number; score: number }[];
  // score uses existing leaderboard formula — do not invent a second one
}
```

### 5.2 Orchestration entrypoints (conceptual)

| API | Behavior |
| --- | --- |
| `buildManagerContext(scope)` | Agent 0-style context builder; PII-minimized |
| `computeTeamAggregates(context)` | Pure; returns structured facts |
| `generateTeamBrief(facts, opts)` | Rules always; LLM if `includeNarrative` + provider |
| `listMissedOpportunities(facts)` | Deterministic priority table |
| `listCoachingCards(facts)` | Deterministic + optional LLM polish on `suggestion` |
| `getSalesForecast(facts)` | Prefer Agent 3; else `mgr-forecast-v1` |

### 5.3 Write path (confirm-only tools)

Allowlisted tools for post-confirm actions (Agent 0 tool interface):

| Tool | Maps to existing | Notes |
| --- | --- | --- |
| `assignLead` | Existing assign / `updateLead` | Manager confirm modal |
| `publishCoachingTip` | `useCoachingTipStore` | Draft from AI; publish explicit |
| `openCallAudit` | Navigate / open `CallAuditRatingModal` | No auto-rating |
| `suggestNotify` | Existing notification publish | Manager must confirm send |
| `openLead` | Deep link Lead Detail | Read-only navigation |

**Forbidden tools:** silent `updateLead` status, silent timeline `recordTimelineEvent` from AI, inventing automation jobs, deleting leads.

---

## 6. Capability deep-dives

### 6.1 Daily Team Brief (MI-1)

**S0 (rules) template order:**

1. Counts: FU due today, overdue, SLA breaches (24h), critical health, bookings yesterday (IST).  
2. Top 3 missed opportunities.  
3. Reps below activity target or with high overdue share.  
4. Visits scheduled today.  
5. Optional: inventory / project hotspots if filters set.

**S1 (LLM):** Rewrite S0 JSON into ≤8 short sentences; must cite lead ids / usernames from payload only.

**Cadence:** On-demand + optional morning cache later (Phase 2+ ops) — **no new collection in Phase 1**.

### 6.2 Sales Forecast (MI-2)

**Fallback `mgr-forecast-v1`:**

```
expectedBookings(horizon) ≈ Σ lead.bookingProbability
  for non-terminal leads in scope
  with optional decay by staleDays
```

Stamp `method: "mgr-forecast-v1"` and low confidence until Agent 3 calibration exists.

**Prefer Agent 3** Conversion / Revenue Forecast when version stamps available; MI displays, does not recompute competing numbers.

### 6.3 Pipeline Health (MI-3)

Aggregate Wave 6 `decideLeadHealthBand` outputs + canonical status buckets. Flag:

- Critical share &gt; threshold (product-tunable; default suggest 15%).  
- Stage bottlenecks (e.g. interested with no site visit — reuse next-action reasons).  
- Unassigned active leads.

### 6.4 Rep Coaching (MI-4)

Evidence sources (priority order):

1. Overdue / SLA share of assigned portfolio.  
2. Conversion vs team median (Admin Report Card math).  
3. Call Quality average stars + recent coaching notes.  
4. Leaderboard activity vs call targets (`useCallTargetStore`).  
5. Agent idle (`AUTOMATION_THRESHOLDS.AGENT_IDLE_MINUTES`) if status board available.

Output **one primary focus** per rep (avoid tip spam). UI: card with “Copy talking points” / “Publish as Coaching Tip” — never auto-publish.

### 6.5 Missed Opportunity Detection (MI-5)

**Priority table (`missed-opp-v1`) — first match wins per lead; then sort by urgency:**

| Rank | Condition | Type | Urgency bias |
| --- | --- | --- | --- |
| 1 | `isSlaBreached` / SLA notify today | `sla_first_touch` | +40 |
| 2 | `priority===hot` AND health `critical` | `hot_critical_idle` | +35 |
| 3 | score ≥ 70 AND FU overdue ≥ 1d | `high_score_overdue` | +30 |
| 4 | site visit today/ overdue confirm | `visit_at_risk` | +28 |
| 5 | duplicateRisk possible/confirmed (managerial) | `duplicate_backlog` | +15 |
| 6 | stuck (when W7-P5) | `stuck_lead` | +20 |

Suggested actions remain **advisory**. Deep link to Lead Detail + Agent 1 NBA for execution language.

### 6.6 Activity Summary (MI-6)

IST window rollup mirroring leaderboard inputs so managers see **the same productivity language** they already trust. Prefer timeline event types when dense enough; fall back to `callLogs` + `[WhatsApp Sent]` tag (current LeaderboardWidget behavior).

### 6.7 Team Insights (MI-7)

Pattern detectors over aggregates, e.g.:

- “Paid source leads convert 2× organic but SLA breach rate higher.”  
- “Rep A high activity / low conversion — quality review.”  
- “Site-visit→booked drop vs last week.”  

Each insight requires **≥2 evidence bullets**. LLM may phrase; cannot add unsupported claims.

---

## 7. UI concepts (DLS v1.4 — no redesign)

**Principle:** Add **one Manager Brief composition** and light strips — do not redesign Admin Dashboard. Respect Form Contract / Modal / theme tokens; Light + Dark.

| Surface | Placement | Content |
| --- | --- | --- |
| **Manager Brief panel** | Admin Analytics top (above company overview) or Dashboard managerial tab | MI-1 headlines + risks + CTA “Refresh brief” |
| **Pipeline Health strip** | Under KPI cards | Health histogram + link to filtered critical queue |
| **Forecast chip** | Beside conversion KPI | Horizon toggle 7/14/30 + confidence + method stamp |
| **Missed Opportunities list** | Brief “Act now” section | Ranked rows → Lead Detail |
| **Coaching cards** | Agent Report Card sidebar / Training tab | Per-rep card; publish tip modal |
| **Activity Summary** | Custom date range reports adjacent | Table reusing leaderboard columns |
| **Team Insights drawer** | Optional secondary | Weekly patterns |

**Interaction rules:**

- Cards only where they wrap an interaction (confirm publish, open lead).  
- No hero redesign; managerial surfaces stay tool-dense and DLS-consistent.  
- Explainability: every score/forecast/coaching item shows method version + evidence.

---

## 8. Rollout phases

| Phase | Scope | Gate |
| --- | --- | --- |
| **Phase 1 (this doc)** | Architecture & capability plan | Wave 7 Phase 1 auth — **done for docs** |
| **Phase 2A — Aggregators** | Pure `computeTeamAggregates`, Pipeline Health, Activity Summary, Missed Opp v1 — **no LLM** | Wave 7 Phase 2 auth + Agent 0 context interfaces frozen |
| **Phase 2B — Brief UI** | Manager Brief panel (S0 rules only) on Admin Analytics | 2A PASS; DLS v1.4 only |
| **Phase 2C — Coaching + Forecast UI** | Coaching cards; `mgr-forecast-v1`; confirm-only tip publish | 2B PASS |
| **Phase 2D — Optional LLM narrative** | S1 brief / coaching polish via Agent 0 provider | Provider auth + privacy review (Agent 5) |
| **Phase 2E — Agent 3 wiring** | Swap forecast to Agent 3 methods; confidence display | Agent 3 v2 available |
| **Ops parallel** | W7-OPS-1 cron/index deploy | Does not block 2A design |

**Stop rule:** No Phase 2 coding until user authorizes **Wave 7 Phase 2 – AI Infrastructure & Copilot Foundation** (or equivalent).

---

## 9. Risks

| ID | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| R1 | Forecast treated as commitment | High | Always show method + confidence; label “estimate” |
| R2 | Coaching perceived as punitive | Med | Evidence-first; severity caps; human publish only |
| R3 | Double formulas vs leaderboard | Med | Reuse exact leaderboard score; document in UI |
| R4 | Incomplete SLA/timeline signals | Med | Dual-read notifications + predicates; track SLA timeline contract with Agent 0 |
| R5 | Manager lead cap (500) skews portfolio | High at scale | Depend W7-P1; stamp “partial portfolio” when capped |
| R6 | LLM hallucinated team facts | High | Ground on aggregator JSON; reject free-form tool writes |
| R7 | Overlap with Agent 1 / Agent 3 | Med | Agent 5 ownership matrix: MI = team; Copilot = lead; Predictive = models |
| R8 | Silent notify spam | High | Suggest-only; manager confirm; reuse automation idempotency if sending |
| R9 | PII in prompts | Med | Minimized context builders; Agent 5 privacy checklist |
| R10 | Ops crons not deployed | Med | Brief degrades gracefully; show “automation offline” when no SLA jobs |

---

## 10. Estimated implementation effort

| Slice | Effort (eng-days) | Notes |
| --- | --- | --- |
| Context builders + types (shared) | 2–3 | With Agent 0 |
| Aggregators + unit tests (MI-3,5,6) | 3–4 | Deterministic |
| Missed opp + coaching rules | 2–3 | |
| `mgr-forecast-v1` + Agent 3 adapter stub | 1–2 | |
| Manager Brief UI (S0) | 2–3 | DLS v1.4 |
| Coaching / forecast UI + confirm modals | 2–3 | |
| S1 LLM narrative wiring | 2–3 | After provider |
| Agent 3 forecast swap + polish | 1–2 | |
| **Total (to useful S0 MI)** | **~12–16** | Excludes provider procurement |
| **Total (with S1 + Agent 3)** | **~16–22** | |

---

## 11. Overlap & ownership (for Agent 5)

| Concern | Owner | Agent 2 stance |
| --- | --- | --- |
| Per-lead brief / NBA language | Agent 1 | Link / embed; don’t fork `next-action-v1` |
| Booking Prob / churn / revenue models | Agent 3 | Consume stamps; fallback only |
| Provider / prompts / tools | Agent 0 | MI registers prompt ids + allowlisted tools |
| Semantic search / policy docs | Agent 4 | Optional later for coaching citations |
| Governance / privacy / sequencing | Agent 5 | Validate this plan |

---

## 12. Success criteria (planning)

- [x] Capability map for MI-1…MI-7  
- [x] Architecture: deterministic aggregators + optional AI narrative  
- [x] Dependencies on leaderboard, automation SLA, timeline, Wave 6 intelligence  
- [x] Proposed APIs + confirm-only write gate (**no silent CRM writes**)  
- [x] UI concepts under DLS v1.4  
- [x] Rollout phases, risks, effort  

**Not in scope of this document:** production code, providers, Firestore, DLS bump.

---

## 13. Cross-references

| Doc | Role |
| --- | --- |
| [`wave7-execution-plan.md`](wave7-execution-plan.md) | Wave 7 master plan |
| [`wave7-ai-architecture.md`](wave7-ai-architecture.md) | Master AI platform (Agent 0) |
| [`wave7-agent0-architecture.md`](wave7-agent0-architecture.md) | Provider / safety / tools |
| [`wave7-agent1-sales-copilot.md`](wave7-agent1-sales-copilot.md) | Per-lead copilot |
| [`wave7-agent3-predictive-crm.md`](wave7-agent3-predictive-crm.md) | Forecast models |
| [`wave6-complete.md`](wave6-complete.md) | Wave 6 freeze |
| [`wave6-phase2d-notes.md`](wave6-phase2d-notes.md) | Intelligence v1 shipped |
| [`wave6-phase2c-agent2-notes.md`](wave6-phase2c-agent2-notes.md) | SLA automation |
| [`wave6-agent4-intelligence-audit.md`](wave6-agent4-intelligence-audit.md) | Lead vs agent score separation |

---

## STOP

**Agent 2 Manager Intelligence planning is complete.**  

Do **not** implement Manager Brief, forecasting UI, coaching automation, or provider calls.  
Do **not** begin Wave 7 Phase 2 until explicitly authorized.

Await Architecture Owner consolidation (Agent 0 / Agent 5) and user authorization for Phase 2.
