# Wave 7 Phase 1 — Agent 3: Predictive CRM (PLAN ONLY)

**Status:** **PLAN ONLY — No implementation.**  
**Date:** 2026-07-14  
**App:** `telecaller-app/`  
**DLS:** remains **v1.4** unless separately authorized  
**Architectural baseline:** Wave 6 CLOSED — PASS ([`wave6-complete.md`](wave6-complete.md))  
**Parent plan:** [`wave7-execution-plan.md`](wave7-execution-plan.md)

---

## Premise

Wave 6 Intelligence v1 shipped **deterministic, explainable, compute-on-read** lead intelligence:

| Artifact | Version | Role |
| --- | --- | --- |
| Lead score | `lead-score-v1` | 0–100 intent / urgency |
| Lead health | `lead-health-v1` (via helpers) | Healthy / Watch / Critical |
| Booking probability | `pBook-v1` | Stage-prior P(book) |
| Next action | `next-action-v1` | Single recommended step |
| Daily priorities | ranked queue | Power Dialer + workspace strip |
| Rules brief | S0 `summary.source: "rules"` | Short history brief |

**Wave 7 Agent 3** designs **Predictive CRM v2**: additive forecasts and risk signals on top of that baseline.  
**Deterministic v1 stays.** New predictors are versioned alongside v1; they do not replace or mutate `leadScoreV1` / `bookingProbabilityV1` formulas.

Hybrid stance: **Rules are primary** (always available, explainable, free). **AI is optional** (calibration assist, narrative, anomaly hints) behind an Architecture Owner (Agent 0) AI interface — never the sole ranking or CRM write path.

---

## Language (working definitions)

Confirm before implementation; treat as locked for this plan:

| Term | Meaning |
| --- | --- |
| **Rules primary** | Every predictor has a pure-function / table-driven path that runs offline of any LLM or paid API. |
| **AI optional** | LLM or model calls may refine confidence, draft narratives, or suggest prior recalibration — gated, never required for UI to render. |
| **Additive v2** | New version stamps (`pBook-v2`, `churn-risk-v1`, …) and fields; v1 modules and contracts remain callable and testable. |
| **Confidence** | 0–1 (or Low / Med / High band) expressing how much evidence supports the estimate — not “how likely the event is.” |
| **Forecast horizon** | Explicit window (e.g. 7d / 30d / month) stamped on every revenue / conversion aggregate. |
| **Compute-on-read (default)** | Prefer pure client (or shared) functions; persist only if Agent 0 + perf authorize caching. |

---

## 1. Capability map

| Capability | Definition | Primary inputs (existing + light joins) | Output (conceptual) | Primary consumers |
| --- | --- | --- | --- | --- |
| **Booking Probability v2** | P(booked \| state) extending `pBook-v1` | Stage prior, days-in-stage, site visit, FU timing, idle, source, connect rate, score factors | `pBook` 0–1, `version: pBook-v2`, factors[], confidence | Lead Detail, list sort hint, Admin funnel |
| **Churn Risk** | P(go cold / disengage) for active non-terminal leads | Health, staleDays, overdue, RNR streak, missing FU, priority | `churnRisk` 0–1, band, reasons[], confidence | Lead Detail, Daily Priorities rescue, automation slice 2 later |
| **Lost Lead Prediction** | P(close as not-interested / lost) before it happens | Status path, objections in notes (rules keywords), idle after interest, dup risk | `lostLeadProb` 0–1, reasons[], confidence | Manager coaching, close_lost next-action affinity |
| **Visit Probability** | P(site visit confirmed/completed in horizon) | Status, interest, prior visit obj, geography/proximity if present, call momentum | `pVisit` 0–1, horizon, confidence | Site-visit ops, telecaller push |
| **Conversion Forecast** | Expected bookings count over horizon for a portfolio | Σ `pBook` (or calibrated) over scoped leads | `expectedBookings`, horizon, confidence | Admin / manager dashboard |
| **Revenue Forecast** | Expected revenue over horizon | Conversion forecast × plot/avg deal value (when known) | `expectedRevenue`, currency, horizon, confidence | Admin analytics (Wave 7 Admin track) |
| **Confidence Scores** | Cross-cutting evidence quality | Sample size (calibration), missing fields, rule coverage, AI agreement | `confidence` + `confidenceBand` on each predictor | Tooltips, “low confidence” badges, hide aggressive sorts |

### Explicit non-capabilities (this agent plan)

- Replacing `lead-score-v1` or manual `Lead.priority`.
- Changing leaderboard **agent** productivity score.
- Training opaque ML as the only ranker.
- Auto-writing CRM fields from AI (status, FU, booking).
- BPM / new workflow engine.
- Bulk schema redesign (`callLogs` off-document, etc.) — remains W7-P3 backlog.

---

## 2. Architecture — Rules primary, AI optional

```
┌─────────────────────────────────────────────────────────────┐
│ Surface (DLS v1.4)                                          │
│ LeadIntelligenceStrip · Forecast chips · Admin Forecast panel│
└────────────────────────────▲────────────────────────────────┘
                             │ read-only projection
┌────────────────────────────┴────────────────────────────────┐
│ Orchestrator (extend computeLeadIntelligence — additive)    │
│ predictLeadIntelligenceV2(lead, portfolioCtx?)              │
└──────────┬─────────────────────────┬────────────────────────┘
           │ always                 │ optional (flag + budget)
           ▼                        ▼
┌──────────────────┐      ┌──────────────────────────────────┐
│ Rules layer (v2) │      │ AI layer (Agent 0 interface)     │
│ pBook-v2         │      │ - Narrative explain              │
│ churn-risk-v1    │      │ - Confidence adjust (bounded)    │
│ lost-lead-v1     │      │ - Prior recalibration suggestions│
│ visit-prob-v1    │      │ Never sole source of numbers     │
│ portfolio Σ      │      │ Never writes Firestore CRM docs  │
└────────▲─────────┘      └────────────────▲─────────────────┘
         │                                 │
         │ consumes                        │ optional enrich
┌────────┴─────────────────────────────────┴─────────────────┐
│ Wave 6 Intelligence v1 (LOCKED — still compute-on-read)    │
│ lead-score-v1 · health · next-action-v1 · pBook-v1 · S0    │
└────────────────────────────────────────────────────────────┘
         │
┌────────┴───────────────────────────────────────────────────┐
│ Contracts (Agent 0) · Timeline (2B) · Automation health (2C)│
└────────────────────────────────────────────────────────────┘
```

### Design rules

1. **v1 immutable for callers** — `leadScoreV1`, `bookingProbabilityV1`, `computeLeadIntelligence` keep current semantics; tests remain green.
2. **v2 additive** — new functions / optional fields on an extended snapshot (e.g. `LeadPredictiveIntelligence`) or parallel `predictors` map keyed by version.
3. **Explainability** — every predictor returns 2–5 human factors / reasons (same trust bar as Wave 6).
4. **Confidence required** — no naked probability without confidence (or explicit `confidence: "n/a"` for terminals).
5. **AI never gates UX** — if AI fails / disabled, rules path still paints chips.
6. **AI never mutates CRM** — summaries and suggestions only; status/FU/booking remain human or existing automation.
7. **Threshold reuse** — idle / overdue / visit windows align with `LEAD_INTELLIGENCE_THRESHOLDS` and `AUTOMATION_THRESHOLDS`; no parallel magic numbers.
8. **Persistence default off** — compute-on-read until Agent 5 / Agent 0 authorize denormalized cache for large N.

### Hybrid AI use cases (optional slices)

| Slice | AI role | Bound |
| --- | --- | --- |
| **S1 Narrative** | Expand rules brief with “why churn is elevated” in plain language | Cap tokens; stamp `source: "llm"`; fallback S0 |
| **S2 Confidence nudge** | ± bounded delta on confidence (not on pBook itself) when notes contradict stage | Clamp; log for audit |
| **S3 Calibration assist** | Offline / Admin: propose new stage priors from historical outcomes | Human approve before `pBook-v2` prior table change |
| **Non-goal** | End-to-end “AI score replaces rules” | Rejected |

---

## 3. Predictor designs (rules sketches)

### 3.1 Booking Probability v2 (`pBook-v2`)

**Extends** `pBook-v1` stage priors; does not delete them.

| Layer | Behavior |
| --- | --- |
| Base | Same stage prior table as v1 (or calibrated table once Admin job lands) |
| Deltas (additive vs v1) | Days-in-stage decay; connect-rate lift; source paid lift; score-band affinity (hot → +ε); consecutive RNR → −ε |
| Terminals | `booked → 1.0`, `not-interested → 0.0` (unchanged) |
| Confidence | Higher when stage + visit + recent connect present; lower when sparse callLogs / unknown source |
| Coexistence | UI may show `pBook-v1` in tooltip “legacy” or only v2 once validated; code retains both |

**Calibration path (rules, not LLM):** offline or Admin report — realized book rate by stage × source × idle bucket → update prior table under new version stamp. Aligns with Wave 6 deferred “`pBook-v1` calibration.”

### 3.2 Churn Risk (`churn-risk-v1`)

**Definition:** risk that an **active** lead becomes unworkable (idle critical, repeated RNR, or silent drop) within a short horizon (default **7d**).

| Signal | Direction |
| --- | --- |
| Health critical / watch | ↑ |
| staleDays ≥ IDLE_WATCH / CRITICAL | ↑ |
| Overdue FU | ↑ |
| Missing FU | ↑ |
| Recent connect + FU today | ↓ |
| Terminal booked / not-interested | exclude or force 0 |

**Relationship to health:** Health is categorical ops signal; churn is continuous forecast. Prefer deriving churn **from the same signals** health uses — do not fork thresholds.

**Consumers:** Daily Priorities “rescue” boost; later W7-P5 stuck/missed-call automation may consume churn band (do not implement automation here).

### 3.3 Lost Lead Prediction (`lost-lead-v1`)

**Definition:** P(lead ends as `not-interested` / explicit lost) vs continues or books.

| Signal | Direction |
| --- | --- |
| Long idle after `interested` / visit stages | ↑ |
| Keyword objections in recent notes (rules lexicon: budget, location, “not interested”) | ↑ |
| Duplicate risk confirmed | ↑ (data quality → fake pipeline) |
| Reserved / visit completed with recent connect | ↓ |
| Already `not-interested` | 1.0 |

**Guardrail:** Never auto-set status to not-interested. At most affinity toward existing `next-action` type `close_lost` when confidence ≥ Med and manager role.

### 3.4 Visit Probability (`visit-prob-v1`)

**Definition:** P(site-visit confirmed or completed within horizon, default **14d**).

| Signal | Direction |
| --- | --- |
| Status `interested` | base prior |
| `siteVisit` object already present | high / near 1 for confirmed |
| Score hot + recent connect | ↑ |
| Geography / proximity insights (if Lead Proximity exists) | mild ↑ |
| RNR streak / no phone connect | ↓ |

Feeds site-visit reminder value and telecaller “push visit” coaching — does not replace 2C reminder crons.

### 3.5 Conversion Forecast (portfolio)

**Definition:** For a scoped set of leads (agent / team / project),  

`expectedBookings(horizon) ≈ Σ pBook_i` (active, non-terminal)  

with optional stage-filtered views.

| Output | Notes |
| --- | --- |
| `expectedBookings` | float; show as range using confidence (e.g. p10/p50/p90 later) |
| `horizon` | `7d` \| `30d` \| `month` |
| `leadCount` / `coverage` | how many leads contributed |

**v1 simplicity:** sum of independent probabilities (naive). Document independence assumption; improve later with calibration.

### 3.6 Revenue Forecast

**Definition:**  

`expectedRevenue ≈ expectedBookings × avgDealValue`  

| Deal value source (priority) | Notes |
| --- | --- |
| Lead-linked `plotId` / known price | Best |
| Project average booking value | Admin config / historical |
| Tenant-wide default | Lowest confidence |

If no value source → emit conversion forecast only; revenue chip hidden or “—”.

### 3.7 Confidence Scores (cross-cutting)

Every predictor returns:

```ts
// CONCEPTUAL — Agent 0 owns final shape
confidence: number;           // 0–1
confidenceBand: "low" | "med" | "high";
confidenceReasons?: string[]; // e.g. "Sparse call history", "Uncalibrated priors"
```

| Driver | Effect on confidence |
| --- | --- |
| Missing FU / empty callLogs | ↓ |
| Terminal status | high (deterministic) |
| Calibrated priors available for stage×source | ↑ |
| Rules + AI disagree beyond bound | ↓ + flag |
| Portfolio N &lt; threshold | ↓ on aggregate forecasts |

**UI rule:** Low confidence → show estimate but disable aggressive sort / automation consumption.

---

## 4. Dependencies on Wave 6 intelligence

| Wave 6 asset | Predictive CRM use |
| --- | --- |
| `lead-score-v1` + factors | Affinity inputs for pBook-v2 / visit; **do not rewrite** |
| `pBook-v1` | Baseline prior; v2 extends |
| Health + `staleDays` + thresholds | Churn / lost-lead primary drivers |
| `next-action-v1` | Optional affinity (close_lost / schedule_visit); do not fork decision table without Agent 0 |
| `computeLeadIntelligence` | Extension point for additive predictors |
| S0 rules brief | Fallback narrative when AI off |
| Daily priorities / Power Dialer | May later blend churn rescue; rank formula change needs explicit auth |
| Automation thresholds (2C) | Shared idle/visit constants — consume, don’t fork |
| Timeline discipline (2B) | Optional richer features from timeline events later; not required for rules v1 predictors |
| Contracts `leadIntelligence.ts` | Agent 0 extends types / version stamps |

**Blocked without:** Wave 6 close (done).  
**Soft-blocked for revenue:** plot/price availability and Admin config — ship conversion-only first if needed.

---

## 5. APIs (proposed — Agent 0 freezes before code)

### 5.1 Version stamps

| Constant | Purpose |
| --- | --- |
| `LEAD_BOOKING_PROB_VERSION_V2 = "pBook-v2"` | Extended booking probability |
| `CHURN_RISK_VERSION_V1 = "churn-risk-v1"` | Churn |
| `LOST_LEAD_VERSION_V1 = "lost-lead-v1"` | Lost prediction |
| `VISIT_PROB_VERSION_V1 = "visit-prob-v1"` | Visit probability |
| `CONVERSION_FORECAST_VERSION_V1 = "conv-forecast-v1"` | Portfolio conversion |
| `REVENUE_FORECAST_VERSION_V1 = "rev-forecast-v1"` | Portfolio revenue |

Keep existing `lead-score-v1` / `pBook-v1` / `next-action-v1` stamps unchanged.

### 5.2 Conceptual types

```ts
// PROPOSAL ONLY — Architecture Owner freezes before implementation

interface PredictorConfidence {
  value: number; // 0–1
  band: "low" | "med" | "high";
  reasons?: string[];
}

interface PredictorFactor {
  id: string;
  label: string;
  delta?: number; // for additive models
}

interface ScalarPredictor {
  value: number; // probability 0–1 or money amount
  version: string;
  factors: PredictorFactor[];
  confidence: PredictorConfidence;
  horizonDays?: number;
}

interface LeadPredictiveIntelligence {
  // v1 snapshot retained or embedded
  intelligence: LeadIntelligence; // existing Wave 6 shape

  bookingProbabilityV2: ScalarPredictor;
  churnRisk?: ScalarPredictor;      // omit on terminals
  lostLeadProb?: ScalarPredictor;
  visitProbability?: ScalarPredictor;

  computedAt: string;
  predictorsVersion: string; // bundle stamp e.g. "predictive-crm-v1"
}

interface PortfolioForecast {
  scope: { type: "agent" | "team" | "project" | "tenant"; id?: string };
  horizonDays: number;
  expectedBookings: number;
  expectedRevenue?: number;
  currency?: string;
  leadCount: number;
  coverage: number; // 0–1 fraction with usable inputs
  confidence: PredictorConfidence;
  version: string;
}
```

### 5.3 Pure function surface (feature folder)

Prefer extend `src/features/leads/intelligence/`:

| Module (proposed) | Responsibility |
| --- | --- |
| `bookingProbabilityV2.ts` | `pBook-v2` |
| `churnRisk.ts` | `churn-risk-v1` |
| `lostLeadPrediction.ts` | `lost-lead-v1` |
| `visitProbability.ts` | `visit-prob-v1` |
| `portfolioForecast.ts` | conversion + revenue aggregates |
| `confidence.ts` | shared band helpers |
| `computeLeadPredictiveIntelligence.ts` | orchestrator (calls v1 + v2) |

**AI interface (Agent 0):** e.g. `enrichPredictiveNarrative(input) → { text, source: "llm" }` — feature agents call only this; no raw SDK sprawl.

### 5.4 Persistence / Functions

| Path | Default |
| --- | --- |
| Client compute-on-read | **Yes** for lead-level predictors |
| Scheduled portfolio snapshot | Optional later for Admin home (Cloud Function) |
| Firestore fields on lead | **No** unless Agent 0 + perf authorize |

---

## 6. UI concepts (DLS v1.4 — presentation only)

No DLS bump in this plan. Patterns follow existing intelligence strip / chips.

| Surface | Concept |
| --- | --- |
| **Lead Detail** | Extend `LeadIntelligenceStrip`: show **pBook %** (v2), **Churn** band, optional **Visit %**; expand factors on tap; confidence as subtle label (“Med confidence”) |
| **Leads list** | Optional compact pBook or churn glyph when non-healthy / hot — avoid chip overload; prefer one secondary signal |
| **Daily Priorities** | Optional “At risk” subsection ranked by churn (flagged rollout) |
| **Admin / manager** | **Forecast panel**: expected bookings + revenue for horizon toggle (7d / 30d); coverage + confidence footer |
| **Tooltips** | Always list top factors; never show bare % without why |
| **AI narrative** | Collapsible “AI note” under strip when flag on; clearly labeled vs rules |

**Do not:** cards-in-hero, purple glow, new dashboard chrome that fights Wave 1–5 Design Language. Prefer strip / inline / existing widget grid slots.

**Override policy unchanged:** Manual `Lead.priority` still wins for agent workflow; predictors are advisory.

---

## 7. Rollout plan

| Stage | Scope | Gate |
| --- | --- | --- |
| **R0 — Plan freeze** | This doc + Agent 0 contract sketch | User authorizes Wave 7 Phase 1 / Agent 3 build |
| **R1 — Contracts** | Version stamps + types in `leadIntelligence` (or sibling contract) | Agent 0 review |
| **R2 — Rules predictors** | `pBook-v2`, churn, visit, lost-lead pure functions + unit tests | Vitest parity with Wave 6 2D bar |
| **R3 — Orchestrator + Detail UI** | Additive strip fields; v1 still rendered | Visual QA Light/Dark; no DLS bump |
| **R4 — Portfolio forecast** | Manager/Admin conversion forecast (revenue if deal value exists) | Scope + perf check on N |
| **R5 — Calibration** | Offline/Admin prior update path for stage×source | Data science / ops approve table |
| **R6 — Optional AI** | S1 narrative behind flag + Agent 0 interface | Cost + hallucination review |
| **R7 — Consume in automation** | Only if W7-P5 authorized — churn → stuck notify | Separate auth; low-confidence excluded |

**Feature flags (recommended):** `predictiveCrmRules`, `predictiveCrmForecastPanel`, `predictiveCrmAiNarrative`.

**Rollback:** Flags off → UI falls back to Wave 6 strip only; v1 functions untouched.

---

## 8. Risks & mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Agents distrust new % | Adoption fail | Factors + confidence; keep v1 score primary for dial order initially |
| Double-counting score and pBook in sorts | Unstable queues | Single consumer ranking policy; document precedence |
| Naive Σ probabilities overstates bookings | Bad manager forecasts | Show confidence + coverage; later calibration / dependence |
| Missing deal values → empty revenue | Confusion | Hide revenue; show conversion-only |
| AI hallucination drives actions | Bad CRM writes | AI read-only; no auto status; rules primary numbers |
| Threshold fork vs automation | Divergent SLA | Import shared thresholds only |
| List perf (more compute per row) | Jank at scale | Compute strip on Detail first; list opt-in; cache only with Agent 5 |
| Version sprawl | Support burden | Bundle stamp `predictive-crm-v1`; deprecate via flags not deletes |
| Legal / fairness on “lost” labels | Agent morale | Soft language (“elevated lost risk”) + manager-only surfaces for harsh predictors |

---

## 9. Effort estimate (implementation — post-auth)

Rough engineering only; not authorized work.

| Workstream | Size | Notes |
| --- | --- | --- |
| Agent 0 contracts + version stamps | **S** | Types, confidence helper, freeze |
| `pBook-v2` + tests | **S–M** | Extends existing module |
| Churn + lost-lead + visit + tests | **M** | Shared signal helpers |
| Orchestrator wiring | **S** | Additive; keep `computeLeadIntelligence` |
| Lead Detail / list UI | **S–M** | DLS v1.4 strip extension |
| Portfolio forecast + Admin panel | **M** | Needs scope queries; revenue optional |
| Calibration job / Admin priors | **M** | Can defer to R5 |
| Optional AI narrative | **M** | Depends on Agent 0 AI interface + budget |
| Automation consumer (W7-P5) | **S** | Separate slice |

**Suggested MVP (first implementation auth):** R1–R3 with `pBook-v2` + churn + confidence + Detail UI.  
**Defer:** revenue, AI, automation consume, list glyphs, full calibration.

---

## 10. Acceptance criteria (future implementation)

Documentation checklist — **do not execute** until authorized:

- [ ] `leadScoreV1` / `bookingProbabilityV1` / existing 2D tests still pass unchanged.
- [ ] `pBook-v2` returns version stamp, factors, confidence; terminals 0/1.
- [ ] Churn / visit / lost predictors omit or zero correctly on terminals.
- [ ] Portfolio forecast stamps horizon + coverage + confidence.
- [ ] UI never requires AI to render predictors.
- [ ] Manual priority + leaderboard agent score untouched.
- [ ] Shared thresholds reused (no forked idle/overdue constants).
- [ ] Feature flags can disable all v2 surfaces without code revert.
- [ ] No new Firestore lead fields unless Agent 0 authorized.
- [ ] DLS remains v1.4 unless separately authorized.

---

## 11. Ownership

| Concern | Owner |
| --- | --- |
| Contract shapes / AI interface / persistence decision | Architecture Owner (Agent 0) |
| Rules predictors + unit tests | Agent 3 (this track) |
| Lead Detail / list presentation | Agent 3 + DLS v1.4 rules |
| Admin Forecast panel | Align with Wave 7 Admin Dashboard scope when locked |
| Automation consumption of churn | W7-P5 / automation track — separate auth |
| Calibration data / prior tables | Ops + Agent 3; human approve |
| Perf / cache | Agent 5 patterns from Wave 6 |

---

## 12. Source index

| Area | Reference |
| --- | --- |
| Wave 6 close | `directives/wave6-complete.md` |
| Wave 6 intelligence notes | `directives/wave6-phase2d-notes.md` |
| Wave 6 intelligence audit | `directives/wave6-agent4-intelligence-audit.md` |
| Wave 7 plan | `directives/wave7-execution-plan.md` |
| Contracts | `telecaller-app/src/shared/contracts/leadIntelligence.ts` |
| v1 scorers | `telecaller-app/src/features/leads/intelligence/*` |
| pBook-v1 | `bookingProbability.ts` |
| Orchestrator | `computeLeadIntelligence.ts` |

---

## STOP

**Planning only.** No application code, no contract edits, no DLS bump, no LLM wiring.

Await explicit authorization (e.g. **“Authorize Wave 7 Phase 1”** / Agent 3 implementation) before R1+.
