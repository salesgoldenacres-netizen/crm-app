# Wave 6 Phase 2D — Intelligence v1 Notes

**Status:** Complete — awaiting validation gate  
**Date:** 2026-07-14  
**App:** `telecaller-app/`  
**Authorization:** Phase 2C PASS + user "ok"  
**DLS:** unchanged (v1.4)  
**Contract edits:** Extended `leadIntelligence.ts` (frozen helpers + thresholds); no new Firestore collections

---

## Goal

Ship deterministic, explainable lead intelligence (score / health / next-action / daily priorities) as **compute-on-read** — no LLM, no rules engine, no auto-assignment, no schema redesign.

---

## What shipped

### 1. Shared contracts (Agent 0 style freeze)

`src/shared/contracts/leadIntelligence.ts`:

- Types: `LeadIntelligence`, score/health/next-action shapes (pre-existing, kept)
- Versions: `lead-score-v1`, `next-action-v1`, `pBook-v1`
- `LEAD_INTELLIGENCE_THRESHOLDS` — idle watch days **aligned to** `AUTOMATION_THRESHOLDS.LEAD_IDLE_DAYS` (3)
- Factor IDs, `scoreToBand`, `decideLeadHealthBand`, `decideNextActionV1`, `healthRankWeight`

### 2. Compute layer (pure functions)

`src/features/leads/intelligence/`:

| Module | Role |
| --- | --- |
| `leadScore.ts` | `leadScoreV1` — base 40 + deltas; booked=100 / not-interested=0 |
| `leadHealth.ts` | Healthy / Watch / Critical |
| `bookingProbability.ts` | Stage priors (`pBook-v1`) |
| `nextAction.ts` | Top-down decision table |
| `dailyPriorities.ts` | Ranked queue + Power Dialer order |
| `duplicateRisk.ts` | Phone digit / last-10 peer scan |
| `computeLeadIntelligence.ts` | Orchestrator + S0 rules brief |
| `leadIntelligence.test.ts` | Unit coverage |

**Persistence:** none — computed on read only.

### 3. Surfaces (minimal, DLS v1.4 tokens)

| Surface | Behavior |
| --- | --- |
| Lead Detail | `LeadIntelligenceStrip` under pipeline — score, health, next action, factors, dup banner |
| Leads list | Score chip + non-healthy health badge on `LeadsTableRow` |
| Leads workspace | `DailyPrioritiesStrip` (top 8 ranked) |
| Power Dialer | Queue ordered by `rankPowerDialerQueue` (health → score → overdue → FU) |

Manual `Lead.priority` remains editable via call logging. Leaderboard agent score untouched.

---

## Explicit non-goals (honored)

- No LLM / generative AI
- No full rules / task engine
- No auto-assignment / reassignment
- No Phase 2E performance rewrites
- No DLS bump / Wave 7
- No new Firestore collections for score cache

---

## Known residuals (non-blocking)

| ID | Finding | Severity | Notes |
| --- | --- | --- | --- |
| D1 | List chips recompute per row (no cache) | Low | Fine for current N; Agent 5 may advise denormalize later |
| D2 | Duplicate scan scoped to loaded leads | Medium | Full-collection peer set only if client already loaded them |
| D3 | Site-visit next-action ignores visit date ≤ today nuance | Low | Status-based match in v1 table |
| D4 | Daily priorities ranks **filtered** `myLeads`, not whole portfolio | Low | Intentional — respects active list filters |
| D5 | `Badge` `info` variant still light-only sky (pre-existing) | Low | Score chips use theme variants |

---

## STOP

Phase 2D implementation complete. Do **not** start Phase 2E or Wave 7 without authorization.
