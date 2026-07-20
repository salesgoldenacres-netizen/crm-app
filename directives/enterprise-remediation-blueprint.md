# Master Enterprise Remediation Blueprint

**Program:** Golden Acres CRM — Enterprise Remediation (Phase 3+ Governance)  
**Status:** Active governance document — Baseline Freeze gate added 2026-07-19  
**Baseline release:** **v0.0.61** live (`golden-acres-projects.web.app`); rollback bundle **v0.0.60**  
**Re-audit verdict:** **Conditional Pass** — 2026-07-19 (non-security, four-stream consensus)  
**Executable Phase 0 SOP:** [`directives/phase-0-audit-convergence.md`](./phase-0-audit-convergence.md)

This document is the master execution blueprint and program governance plan to remediate weaknesses, technical debt, and scalability issues identified in the Enterprise Software Audit for Golden Acres CRM.

---

## Reconciliation (2026-07-19, smoke attestation 2026-07-20)

**Governance pass:** Blueprint updated to match the **repository as authoritative** — not the reverse.

| Field | Value |
|-------|-------|
| Reconciliation date | **2026-07-19** (smoke attestation sync **2026-07-20**) |
| Overall readiness score | **76 / 100** *(was 72 — +4 smoke attestation; Production Sign-off + Baseline Freeze manual metrics remain)* |
| Prior blueprint version | 1.1 (reconciled) |
| This version | **1.2 (baseline freeze gate)** |
| Phase 0 ops sync | **2026-07-19 ~21:04 IST** — agent `1197b7bf` (backfill apply/verify, flag flip, OTA v0.0.61) |
| Phase 0 smoke attestation | **2026-07-20** — User attested smoke passed, prod v0.0.61 |

**What changed:** Subagent reconciliation verified implementation state against grep proofs, CI gates, and file inventory. Completed workstreams are marked **COMPLETED** with evidence paths. Stale claims (e.g. "~25 feature files import Firestore") are removed. Dependency graph corrected where code landed without the originally documented ordering (notably Phase 2C without blocking on 1B). Remaining execution order reflects **unfinished work only**.

**Phase 0 ops sync (2026-07-19):** Backfill `--apply` (217 logs / 200 leads, 0 errors) + `--verify` (exit 0, missing docs 0); `VITE_CALL_LOGS_EMBEDDED_FALLBACK=false` in `.env.production`; OTA **v0.0.61** live (manifest verified). **Smoke attested 2026-07-20.** **Still pending:** Production Sign-off table (Architecture / QA / Ops / Eng Lead), Baseline Freeze manual browser metrics, orphan remote functions ops note (`aiComplete`, `linkUserProfile`, `setManagerialClaim` — functions deploy skipped this window). Agent D orphan widgets **archived** (2026-07-20).

**Evidence directives:** [`baseline-freeze-sop.md`](./baseline-freeze-sop.md), [`phase-f-completion-convergence.md`](./phase-f-completion-convergence.md), [`phase-0-audit-convergence.md`](./phase-0-audit-convergence.md)

---

**Scope definition (solve it):** Eliminate all correctness, reliability, and scalability issues identified in the audit while preserving the existing architecture and minimizing regressions.

- Fix all Critical findings  
- Fix all High findings  
- Address Medium findings that directly improve production stability or remove architectural blockers  
- No framework migration  
- No redesign of DLS / Wave 10 UI  
- No feature expansion unless required to support a fix  

**Production-ready guarantees:**

- No silent data loss  
- No silent data truncation  
- Deterministic writes (idempotency where concurrent delivery is possible)  
- Observable failures (structured logs + optional Sentry)  
- Architecture acceptance gate maintained (LeadQueryService / LeadRepository / CallLogsRepository)  

**Completed in code (do not re-propose):**

| Area | Status | Evidence |
|------|--------|----------|
| **Phase F convergence** | **COMPLETED** | [`phase-f-completion-convergence.md`](./phase-f-completion-convergence.md) — LeadQueryService, LeadRepository, productivity single-writer, CI green, Tier 2 `AggregateUnavailable`, v0.0.60 deploy |
| **Phase 1A — Repository boundary** | **COMPLETED** | 0 `firebase/firestore` imports in `src/features/**` (grep verified 2026-07-19); ESLint `no-restricted-imports` → `error` in `telecaller-app/eslint.config.js` |
| **Phase 1B — ListenerManager** | **COMPLETED** | `telecaller-app/src/shared/services/firebase/ListenerManager.ts`; wired via `ListenerManager.subscribe<T>()` throughout `repositories.ts` |
| **Phase 1C — Functions modularization** | **COMPLETED** | `functions/index.js` exports-only; logic in `controllers/`, `routes/`, `triggers/`, `jobs/`, `services/`, `webhooks/` |
| **Phase 0 Agent B — CallLogs query** | **COMPLETED** | `CallLogsRepository.ts` + `functions/helpers/callLogsRepository.js` → `orderBy("date", "desc")`; regression tests |
| **Phase 0 Agent C — Meta TOCTOU** | **COMPLETED** | `claimIngestEvent` in `functions/helpers/firestoreWrites.js`; `functions/webhooks/metaLeadgen.test.js`, `firestoreWrites.test.js` |
| **Phase 0 Agent E — Accessibility** | **COMPLETED** | Skip link + `<main>` on Dashboard/Admin/Login; Kanban keyboard in `LeadsKanbanBoard.tsx` |
| **Phase 2B — Point-read elimination** | **COMPLETED** | `Promise.all` in `archiveLeadsByIds` / `restoreLeadsByIds` / `mergeLeads` — `repositories.ts` |
| **Phase 2C — DatabaseContext scoping** | **COMPLETED** | One-shot `getDocs` for projects/users in `DatabaseContext.tsx`; bounded agent open-leads listener; no collection-wide realtime for users/projects |
| **ADR 2 — ListenerManager** | **COMPLETED** | Same as Phase 1B |
| **R3 — Functions modularization** | **CLOSED** | Same as Phase 1C |
| **R6 — Meta TOCTOU** | **CLOSED** | Same as Phase 0 Agent C |

**Partially complete (remaining work tracked below):**

| Area | Status | Remaining |
|------|--------|-----------|
| **Phase 0 — ops** | **NEAR COMPLETE** | Ops done (backfill apply/verify, flag flip, OTA v0.0.61). Smoke attested 2026-07-20. Residual: Production Sign-off table, Baseline Freeze manual metrics, orphan remote functions cleanup (ops note only) |
| **Phase 2A — ULID `leadReference`** | **PARTIAL** | Backend (`functions/triggers/leads.js`, `functions/helpers/ulid.js`); UI search/display + CSV export parity pending |
| **Phase 2D — Analytics** | **PARTIAL** | `AggregateUnavailable` correct until Reports / summary-doc wiring |
| **Phase 3A — LeadDetails** | **PARTIAL** | Hooks extracted (`useLeadData`, `useLeadDialer`, `useLeadCallLog`); page ~447 LOC (target ≤ 250) |
| **Phase 3B — Theme** | **PARTIAL** | Semantic tokens on extracted files incomplete |
| **Phase 3C — Type safety** | **PARTIAL** | `@typescript-eslint/no-explicit-any` still `off` in `eslint.config.js` |

**Doc sign-off pending:** Phase 1 is **complete in code**; formal Phase 1 exit report and Review Board checkbox remain open until §15 gates close.

---

## Remaining Execution Order (unfinished only)

**Phase 1 and Phase 2 are largely complete in code — do NOT re-open** (1A/1B/1C, 2B/2C done). Residual 2A UI parity and 2D Reports may proceed in parallel with later phases per capacity; they are not blockers for the sequence below.

```text
1. Phase 0 residual (QA / debt only)
   ✓ backfill --apply + --verify (2026-07-19 ~21:04 IST)
   ✓ VITE_CALL_LOGS_EMBEDDED_FALLBACK=false + OTA v0.0.61 live
   ✓ manual smoke sign-off attested (2026-07-20)
   ✓ orphan widget files archived (Agent D — 2026-07-20)
   ⧗ Production Sign-off table

2. ★ Baseline Freeze (§12) — GATE before Phase 3C
   • Executable SOP: directives/baseline-freeze-sop.md
   • Artifact: .tmp/remediation-baselines-YYYY-MM-DD.json
   • Runs AFTER Production Sign-off; BLOCKS Phase 3C authorization

3. Phase 3C — type safety
   • no-explicit-any warn → fix → error
   • requires Baseline Freeze artifact linked

4. Phase 4 — observability (4A Sentry sampling + 4B coverage)
   • requires §12 baselines for before/after comparison

5. Phase 5 — archive isolation

6. Phase 6 — enterprise re-audit + sign-off

(Optional / parallel when capacity allows — do not re-open Phase 1/2 foundations)
   • Phase 2A — ULID UI/export parity
   • Phase 2D — Reports / aggregation offload
   • Phase 3A — LeadDetailsPage ≤ 250 LOC
   • Phase 3B — theme on touched files
```

---

## Recommended Roadmap (Steps 1–6)

```text
Step 1 — COMPLETED (governance)
────────
Finalize Blueprint + Phase F convergence + §15 pre-checks (Phase F + Phase 1)

        │
        ▼

Step 2 — NEAR COMPLETE (Phase 0)
────────
Phase 0 Audit Convergence
✓ Agents B, C, D, E (code)
✓ Agent A ops (backfill apply/verify, flag flip, OTA v0.0.61 — 2026-07-19)
✓ Agent F (manual smoke attested — 2026-07-20)
⧗ Production Sign-off table

        │
        ▼

Step 2b — PARTIAL (Baseline Freeze gate)
────────
§12 Baseline Freeze — AFTER Production Sign-off, BEFORE Phase 3C
⧗ Automated artifact captured → .tmp/remediation-baselines-2026-07-20.json
⧗ Manual browser/ops metrics + sign-off pending
⧗ Executable SOP: baseline-freeze-sop.md

        │
        ▼

Step 3 — COMPLETED in code (do NOT re-open)
────────
Phase 1 Architecture Foundation
✓ 1A Repository boundaries
✓ 1B ListenerManager
✓ 1C Functions modularization

        │
        ▼

Step 4 — PARTIAL
────────
Phase 2 Database & Performance
✓ 2B Point-read elimination
✓ 2C DatabaseContext scoping
⧗ 2A ULID UI/export parity
⧗ 2D Analytics (Reports)

        │
        ▼

Step 5 — NOT STARTED (blocked on Baseline Freeze)
────────
Phase 3C — Type safety rollout
⧗ Requires Baseline Freeze artifact
⧗ no-explicit-any warn → fix → error

(Optional — parallel if capacity: 3A LeadDetails thin, 3B theme)

        │
        ▼

Step 6 — NOT STARTED
────────
Phase 4 — Observability (4A/4B — needs §12 baselines)
Phase 5 — Archive isolation
Phase 6 — Enterprise re-audit + sign-off
```

---

## 1. Enterprise Engineering Principles

All implementation work must follow these principles:

1. **Correctness over speed:** Ensure correctness of architecture and type safety.  
2. **Incremental refactoring over large rewrites:** Refactor code chunks progressively to minimize runtime regression risks.  
3. **Backward compatibility:** Existing integrations, schemas, and historical data formats must be preserved unless an ADR explicitly states otherwise.  
4. **Measurable performance improvements:** Any performance-related changes must be tested and quantified against the baseline.  
5. **Stability first:** Stability, security, and maintainability take precedence over adding new features.  
6. **Shared services before duplicated logic:** Reuse components, utilities, and services before introducing new implementations.  
7. **Documented justification:** Every architectural decision must have documented justification.  
8. **Approved repository boundaries:** No feature-level code may bypass the approved repository boundaries.  
9. **Cleaner codebase:** Every change must leave the codebase cleaner than it was found.  
10. **Technical debt reduction:** Every completed phase must reduce the overall technical debt of the system.  

---

## 2. Multi-Agent Coordination Protocol

To ensure seamless execution across multiple specialist AI agents, the following collaboration guidelines must be enforced:

- **Ownership:** Every agent must claim ownership of one workstream before modifying files.  
- **No parallel conflict:** Agents must never modify files owned by another active agent without synchronization.  
- **Dependency checks:** Complete all dependency checks before beginning work on a task.  
- **Sync before implementation:** Rebase against the latest approved state before implementing changes.  
- **Completion report:** Publish a completion report for every task including: files changed, tests executed, performance impact, risks introduced, rollback status.  
- **Conflict resolution:** Cross-agent conflicts must be resolved by the Architecture Agent.  

Phase 0 agent ownership is defined in [`phase-0-audit-convergence.md`](./phase-0-audit-convergence.md).

---

## 3. Definition of "No Architectural Drift"

Architectural drift in this repository is defined as:

- Direct Firestore client SDK imports outside repositories in the `src/features/` folders.  
- Duplicate business logic across client-side modules.  
- Duplicate real-time collection snapshot listeners.  
- Parallel implementations of the same feature or data mapping.  
- Bypassing shared services for logging, analytical tracking, or network calls.  
- Introducing new helper utilities where approved services exist.  
- Dead code without clear ownership.  
- New feature flags that bypass active architecture checks.  

**Current state (reconciled 2026-07-19): CLOSED for feature-layer Firestore imports.**

| Check | Result | Evidence |
|-------|--------|----------|
| `firebase/firestore` in `src/features/**` | **0 imports** | `rg "from ['\"]firebase/firestore" telecaller-app/src/features` → no matches |
| ESLint enforcement | **error** | `telecaller-app/eslint.config.js` — `no-restricted-imports` on `src/features/**/*.{ts,tsx}` |
| Architecture acceptance gate | **pass** | Grep proofs in [`phase-f-completion-convergence.md`](./phase-f-completion-convergence.md) |

Do not re-open Phase 1A unless a regression introduces direct Firestore imports in features. Remaining drift risks: orphan dead files (Phase 0 Agent D), client-side aggregation (Phase 2D), and `any` usage (Phase 3C).

---

## 4. Architectural Decision Records (ADRs)

### ADR 1: Lead Numbering System

- **Context:** The legacy `settings/counters` transaction creates a write hotspot on Meta/Google Ads webhook ingestion.  
- **Decision:** Introduce a new `leadReference` field based on a ULID (or equivalent time-sortable unique identifier) selected after validating compatibility with search, exports, integrations, and reporting requirements. Retain the legacy `leadNumber` field and map it as a fallback for backward compatibility with existing reports, exports, and integrations.  
- **Consequence:** Webhook ingestion becomes stateless and highly concurrent; historical data is preserved.  
- **Status:** **PARTIAL** — backend implemented (`functions/triggers/leads.js`, `functions/helpers/ulid.js`); UI search/display + CSV export parity pending (Phase 2A)  

### ADR 2: Repository-Owned Listener Architecture

- **Context:** Collection-wide snapshot listeners for `users` and `projects` in `DatabaseContext` trigger excessive read billings and layout updates.  
- **Decision:** Centralize listener lifecycles into a `ListenerManager` singleton class managed exclusively by the Repository layer.  
- **Consequence:** Exclude raw Firestore listeners from components or React contexts, preventing duplication and ensuring clean cleanup.  
- **Status:** **COMPLETED** — `ListenerManager.ts` with generic `subscribe<T>()`; integrated across `repositories.ts`; `DatabaseContext.tsx` uses one-shot reads for projects/users  

### ADR 3: Observability Sampling

- **Context:** High performance monitoring rates add telemetry cost and overhead.  
- **Decision:** Sample Sentry tracing dynamically via environment variables (`1.0` in dev, `0.2` in staging, `0.05–0.10` in production).  
- **Phase:** 4A (not started)  

---

## 5. Enterprise Change Control Policy

The remediation program is a stabilization initiative, not a feature initiative. The following are prohibited unless explicitly approved by the Enterprise Review Board:

- New business features  
- UI redesigns  
- Firestore schema redesign beyond documented ADRs  
- Authentication changes outside approved remediation  
- New third-party dependencies without justification  
- New architectural patterns not described in this plan  
- Large-scale rewrites where incremental refactoring is sufficient  

All changes must directly map to one or more audit findings.

---

## 6. No Silent Regression Rule

For every modified module:

- Existing tests must pass.  
- New behavior must be covered by tests.  
- Existing public APIs must remain compatible unless an ADR explicitly allows change.  
- Any breaking change requires documented migration steps.  

---

## 7. Performance Budget

| Surface | Budget |
|---------|--------|
| Dashboard startup | < 2 seconds |
| Lead search | < 250 ms |
| Lead creation | < 300 ms |
| Webhook processing | < 500 ms |
| Bundle increase | ≤ 2% |
| Memory increase | ≤ 5% |
| Firestore reads | Must not exceed baseline |

All performance comparisons require §12 baseline metrics recorded before the phase that introduces the change (mandatory before Phase 4).

---

## 8. Technical Debt Policy

No new technical debt may be introduced. If a change introduces unavoidable debt:

- Document it  
- Assign ownership  
- Assign priority  
- Assign target release  
- Add it to the debt register  

Untracked debt is prohibited.

---

## 9. Risk Register

| ID | Risk | Severity | Status | Mitigation |
|----|------|----------|--------|------------|
| **R1** | Lead reference migration affects exports | High | Open | Maintain dual-field compatibility (`leadReference` and `leadNumber`) until UI/export parity completes (Phase 2A). |
| **R2** | Listener refactor causes stale UI | Medium | Mitigated | ListenerManager integrated; repository-level subscriptions in production. Monitor on Phase 6 re-audit. |
| **R3** | Functions modularization breaks deployment | High | **CLOSED** | `index.js` exports-only; functions tests 88/88 (2026-07-19). |
| **R4** | `no-explicit-any` checks block builds | Medium | Open | Enable rule as warning first, clean up sequentially, then upgrade to errors (Phase 3C). |
| **R5** | Call-log dual-read removal before backfill | High | **Mitigated** | Backfill apply + verify complete (217/200, 0 errors); `VITE_CALL_LOGS_EMBEDDED_FALLBACK=false` + OTA v0.0.61 live. Residual: dual-read merge path removal after manual smoke; rollback OTA **v0.0.60**. |
| **R6** | Meta ingestEvents TOCTOU duplicates leads | High | **CLOSED** | Transactional `claimIngestEvent`; tests in `metaLeadgen.test.js`, `firestoreWrites.test.js`. |

---

## 10. Success Metrics (KPIs)

| Metric | Baseline | Target |
|--------|----------|--------|
| Firestore reads on dashboard | §12 baseline (not yet captured) | −40% or better |
| Active listeners | §12 baseline (not yet captured) | ≤ 1 per collection type |
| Lead creation latency | §12 baseline | < 300 ms |
| Webhook throughput | §12 baseline | No transaction counter contention |
| Bundle size | §12 baseline | No increase (or ≤ +2%) |
| TypeScript `any` count | 150+ (audit) | 0 new; legacy significantly reduced |
| Test coverage | Current | Increased coverage across active paths |
| Overall audit score | 76/100 (Phase 0 smoke attestation) | > 90/100 at Phase 6 |

---

## 11. Dependency Graphs

### Program-level phase order (reconciled)

```text
Phase F — COMPLETED
        │
        ▼
Phase 0 — NEAR COMPLETE (ops ✓, smoke attested 2026-07-20; Production Sign-off + Baseline Freeze remain)
        │
        ├──► Baseline Freeze (§12) — GATE (post sign-off, pre Phase 3C)
        │
        ├──► Phase 1 — COMPLETED in code (1A → 1B → 1C) — do NOT re-open
        │
        ├──► Phase 2 — PARTIAL (2B ✓, 2C ✓; 2A/2D optional parallel)
        │
        └──► Phase 3C — BLOCKED until Baseline Freeze
                │
                ▼
        Phase 4 — NOT STARTED (requires §12 baselines)
                │
                ▼
        Phase 5 — NOT STARTED
                │
                ▼
        Phase 6 — NOT STARTED
```

### Architecture & listeners dependency flow (actual)

```text
Repository Boundary Enforcement (Phase 1A) — COMPLETED
             │
             ├──► ListenerManager (Phase 1B) — COMPLETED
             │         │
             │         └──► Repository-Owned Listeners — COMPLETED
             │
             └──► DatabaseContext Refactor (Phase 2C) — COMPLETED
                  (one-shot projects/users; no hard dependency on 1B)
```

### Lead reference & functions dependency flow

```text
      Lead Reference Field (Phase 2A) — backend done
             │
             ├──► UI Search & Display — pending
             └──► CSV Exports — pending

Functions Monolith Splitting (Phase 1C) — COMPLETED
```

### Cross-phase dependency (reconciled)

| Dependent | Requires | Reason | Status |
|-----------|----------|--------|--------|
| Phase 1 | Phase F gate | Architecture acceptance before refactor | **Met** |
| Phase 2A (ULID UI) | Phase 2A backend | Dual-field contract exists | Backend **done** |
| Phase 2C (scoped listeners) | — | Implemented via one-shot reads in DatabaseContext | **Done** (1B not blocking) |
| Phase 3 Workstream 3 (ListenerManager generics) | Phase 1B | Generics on existing class | **Unblocked** — `subscribe<T>()` exists |
| **Baseline Freeze (§12)** | **Production Sign-off complete** | Immutable snapshot before Phase 3C | **Partial** — automated artifact + smoke attestation done; manual metrics + sign-off pending. SOP: [`baseline-freeze-sop.md`](./baseline-freeze-sop.md) |
| Phase 3C | **Baseline Freeze artifact linked** | Type safety rollout without unmeasured drift | **Pending** |
| Phase 4 | **§12 baselines recorded** | Performance budget comparisons | **Pending** |
| Phase 6 | Phases 0–5 exit gates | Final enterprise sign-off | **Pending** |

**Removed (stale):** "Phase 2C requires Phase 1B" and "Phase 3 WS3 step 2 requires Phase 1B" — both contradicted repository state at reconciliation.

---

## 12. Baseline Metrics — Baseline Freeze (Pre-Remediation Checkpoints)

**Status:** **PARTIAL** — automated capture **2026-07-20** in [`.tmp/remediation-baselines-2026-07-20.json`](../.tmp/remediation-baselines-2026-07-20.json) (git/quality/bundle/functions + smoke attestation complete); **Production Sign-off, manual browser/ops metrics, and Baseline Freeze sign-off pending**. Still **blocks Phase 3C authorization** until sign-off complete.

**Executable SOP:** [`baseline-freeze-sop.md`](./baseline-freeze-sop.md) — full capture checklist, JSON schema, sign-off, and comparison rules.

Before executing Phase 3C (type safety) or Phase 4 (observability), record metrics from the signed production release. Store results in `.tmp/remediation-baselines-YYYY-MM-DD.json` (never commit secrets; summary may be copied into phase exit reports). **Current artifact:** `.tmp/remediation-baselines-2026-07-20.json`.

| Metric | How to capture |
|--------|----------------|
| Git commit SHA | `git rev-parse HEAD` at signed release |
| App version (v0.0.61+) | `package.json` + live OTA manifest |
| Functions deploy state | `firebase functions:list`; note orphan remotes |
| Environment | `golden-acres-projects` production |
| Bundle size (KB) | `npm run build` → Vite gzip output |
| Firestore reads (dashboard startup) | DevTools network — median of 3 runs (methodology in SOP §6) |
| Active listeners (startup count) | `ListenerManager.getActiveCount()` / diagnostics (SOP §7) |
| Dashboard startup time (ms) | Performance panel / LCP — median of 3 runs (SOP §8) |
| Lead creation latency (ms) | 5-run median on prod test lead (SOP §9) |
| Webhook processing latency (ms) | Functions `meta_ingest` logs (SOP §10) |
| Lighthouse (optional) | Manual CLI or DevTools |
| Test counts | 303 app / 88 functions; tsc + lint 0 errors |

### Gate sequence (mandatory)

| Gate | Requirement |
|------|-------------|
| **Baseline Freeze** | Production Sign-off complete → capture artifact → link in phase-f Operational DoD |
| **Phase 3C** | **MUST NOT begin** until Baseline Freeze artifact exists |
| **Phase 4** | **MUST NOT begin** until §12 baselines recorded and linked in phase exit report |

**Comparison rules (Phase 4+):** No regressions vs frozen baseline; bundle **≤ +2%**; Firestore dashboard reads KPI **−40%**; listeners **≤ 1 per collection type**; latency budgets per §7. See SOP for full matrix.

Recommended capture window: immediately after **Production Sign-off** (post manual smoke, backfill + flag flip + OTA v0.0.61) so call-log and listener scoping improvements are included. Ops complete as of **2026-07-19 ~21:04 IST**; smoke attested **2026-07-20** — Baseline Freeze awaits Production Sign-off + manual browser metrics.

---

## 13. Execution Backlog & Phases

### Phase 0 — Audit Convergence

**Goal:** Close all P0/P1 items from the 2026-07-19 Conditional Pass re-audit.  
**Overall status:** **NEAR COMPLETE** — code A–F complete; smoke attested 2026-07-20; Production Sign-off + Baseline Freeze manual metrics remain.  
**Deploy window:** OTA **v0.0.61** live (2026-07-19); rollback bundle **v0.0.60**. Functions deploy skipped (orphan remote functions — ops note only).  
**Executable SOP:** [`phase-0-audit-convergence.md`](./phase-0-audit-convergence.md)

| Workstream | Agent | Status | Summary |
|------------|-------|--------|---------|
| Call log migration | A | **OPS COMPLETE** | Backfill apply: 217 logs / 200 leads, 0 errors (~21:04 IST); verify exit 0, missing docs 0; `VITE_CALL_LOGS_EMBEDDED_FALLBACK=false`; OTA v0.0.61 manifest verified |
| CallLogsRepository query fix | B | **COMPLETED** | `orderBy("date", "desc")` client + server; regression tests |
| Meta webhook TOCTOU fix | C | **COMPLETED** | Transactional `claimIngestEvent` |
| UI cleanup | D | **COMPLETED** | Orphan widgets archived in `components/.archive/` (2026-07-20); grep proof; CallLogsWidget on collection path |
| Accessibility | E | **COMPLETED** | Skip link, `<main>`, Kanban keyboard |
| QA & validation | F | **COMPLETED** | CI green; manual smoke attested 2026-07-20; Production Sign-off table pending |

**Ops evidence (agent `1197b7bf`, 2026-07-19):** [`.tmp/phase0-call-log-migration-report.md`](../.tmp/phase0-call-log-migration-report.md)

**Orphan widgets (Agent D — archived 2026-07-20):**

- `components/.archive/TeamsGoalsWidget.tsx`  
- `components/.archive/AdminPipelineFunnelWidget.tsx`  
- `components/.archive/AcquisitionChannelsWidget.tsx`  
- `components/.archive/AgentReportCardTab.tsx`  
- `components/.archive/CustomDateRangeReports.tsx`  
- `components/.archive/ProjectInventoryDashboard.tsx`  

**Phase 0 exit gate:** Ops + smoke complete; Production Sign-off table + Baseline Freeze manual metrics still open; no open P0/P1 from re-audit once sign-off closes; CI green.

**Related directives:** [`phase-c-call-logs-migration.md`](./phase-c-call-logs-migration.md), [`phase-f-completion-convergence.md`](./phase-f-completion-convergence.md), [`incident-runbook.md`](./incident-runbook.md)

---

### Phase 1 — Architecture Foundation

**Overall status:** **COMPLETED in code** — formal exit report / Review Board sign-off pending.

#### 1A. Repository Boundary Enforcement — **COMPLETED**

- **Evidence:** 0 direct `firebase/firestore` imports in `src/features/**`; ESLint `no-restricted-imports` → `error`.  
- **Files:** `telecaller-app/eslint.config.js`, all feature modules routing through `src/shared/services/firebase/`.

#### 1B. ListenerManager Contract Implementation — **COMPLETED**

- **Evidence:** `ListenerManager.ts` with ref-counting, deduplication, generic `subscribe<T>()`; used throughout `repositories.ts`.  
- **Files:** `telecaller-app/src/shared/services/firebase/ListenerManager.ts`, `repositories.ts`.

#### 1C. Cloud Functions Modularization — **COMPLETED**

- **Evidence:** `functions/index.js` exports-only; modular `controllers/`, `routes/`, `triggers/`, `jobs/`, `services/`, `webhooks/`.  
- **Tests:** Functions suite 88/88 (2026-07-19).

**Phase 1 exit gate:** 1A + 1B + 1C DoD met in code; Architecture Acceptance Gate grep proofs pass; no new drift. **Documentation sign-off remains open.**

---

### Phase 2 — Database & Performance Hardening

**Overall status:** **PARTIAL** — 2B and 2C complete; 2A and 2D remain.

#### 2A. Lead Reference Migration — **PARTIAL**

- **Completed:** `leadReference` generation via ULID in `functions/triggers/leads.js`; `functions/helpers/ulid.js`.  
- **Remaining:** UI search/display on both fields; CSV export parity; dual-field lookup verification in client.  
- **Rollback plan:** Restore `settings/counters` transaction; fall back to legacy sequential IDs.  

#### 2B. Point-Read Loop Elimination — **COMPLETED**

- **Evidence:** `Promise.all` in `archiveLeadsByIds`, `restoreLeadsByIds`, `mergeLeads` — `repositories.ts` lines ~135, ~161, ~195.  
- **Rollback plan:** Revert repository functions to sequential point reads.  

#### 2C. Real-time Query Scoping — **COMPLETED**

- **Evidence:** `DatabaseContext.tsx` — one-shot `getDocs` for projects and users; scoped agent open-leads listener (bounded); managers use empty `openLeads` + LeadQueryService for lists.  
- **Note:** Delivered without blocking on ListenerManager in DatabaseContext (reconciled dependency).  
- **Rollback plan:** Restore full snapshot listeners inside `DatabaseContext.tsx`.  

#### 2D. Analytics & Aggregation Offloading — **PARTIAL**

- **Completed (interim):** Tier 2 widgets show honest `AggregateUnavailable` / See Reports — not fake zeros.  
- **Remaining:** Pre-computed summary documents or `getCountFromServer()` when Reports surface is ready.  
- **Files:** `AggregateUnavailable.tsx`, `AdminDashboard.tsx`, analytics tabs.  
- **Rollback plan:** Re-enable client-side aggregation helper logic.  

**Phase 2 exit gate:** 2A–2D DoD; webhook throughput meets KPI; agent dialer bounded queue intact.

---

### Phase 3 — Frontend & Code Quality

**Overall status:** **PARTIAL** — hooks extracted; theme and type safety remain.

**Prerequisite (met):** Phase 1A complete. ListenerManager generics **unblocked** — `subscribe<T>()` already implemented (Phase 1B).

#### 3A. LeadDetailsPage Decomposition — **PARTIAL**

- **Completed:** Hooks extracted — `useLeadData.ts`, `useLeadDialer.ts`, `useLeadCallLog.ts`.  
- **Remaining:** Thin page container — current ~447 LOC (target ≤ 250); optional per execution order.  
- **Presentation components:** `LeadDetailsHeader.tsx`, `LeadDetailsBottomBar.tsx` (verify extraction state on next pass).  

#### 3B. Touched-Files Theme Migration — **PARTIAL**

- **Scope:** Files created/modified during Phase 3 decomposition.  
- **Remaining:** Full semantic `bg-theme-*` / `text-theme-*` + `dark:` parity on extracted files.  

#### 3C. Type Safety Prioritization & Strict Lint Rollout — **NOT STARTED**

- **Prerequisite:** **Baseline Freeze complete** — artifact linked per [`baseline-freeze-sop.md`](./baseline-freeze-sop.md)
- **Current:** `@typescript-eslint/no-explicit-any: 'off'` in `eslint.config.js`.  
- **Rollout:** warn → fix → error.  
- **Priority 1:** `repositories.ts`, `ListenerManager.ts`, `ModalRegistryContext.tsx`  
- **Priority 2:** Analytics providers  
- **Priority 3:** Feature pages & UI  

#### Phase 3 workstream details

| Workstream | Ownership | Status | Steps |
|------------|-----------|--------|-------|
| 1 — LeadDetails decomposition | Architecture + Frontend | **PARTIAL** | Hooks ✓ → thin page ⧗ |
| 2 — Touched-files theme | Design System Agent | **PARTIAL** | Semantic tokens incomplete |
| 3 — Type safety & linting | Type Safety Agent | **NOT STARTED** | Warn mode → repositories → error mode |

**Removed (stale):** "Phase 3 Workstream 3 step 2 requires Phase 1B" — generics already exist on `ListenerManager.subscribe<T>()`.

#### Verification & quality gate matrix (Phase 3)

| Target area | Verification | Success metrics | Status |
|-------------|--------------|-----------------|--------|
| LeadDetails refactoring | `npm test` + manual profiling | Page LOC ≤ 250; render count regression = 0 | **PARTIAL** (~447 LOC) |
| Theme / A11y | Keyboard traversal + Lighthouse | Focus trapping; contrast ≥ 4.5:1 | **PARTIAL** |
| Type safety & lint | `npm run lint` + `tsc --noEmit` | Zero ESLint errors; zero new `any` | **NOT STARTED** |
| Performance | `npm run build` + memory logs | Bundle ≤ +0.5%; reads unchanged vs §12 | **Pending §12** |

#### Phase 3 exit criteria

- [x] Zero architectural drift in **touched** Phase 3 files (no direct Firestore in new hooks)  
- [x] Zero repository bypass in Phase 3 scope  
- [x] Phase 0 shell a11y fixes maintained  
- [ ] LeadDetailsPage LOC ≤ 250 (optional)  
- [ ] Zero visual regressions (render state matrix verified)  
- [ ] Zero performance regressions vs §12 baseline  
- [ ] Zero bundle size drift > 0.5%  
- [x] All tests passing  
- [ ] `@typescript-eslint/no-explicit-any` at `error` for cleaned scope  
- [ ] Documentation updated (hook hierarchy, debt register)  

---

### Phase 4 — Observability & DevOps

**Status:** **NOT STARTED**  
**Prerequisite:** **§12 baseline metrics recorded** (mandatory gate).

#### 4A. Environment-Driven Tracing

- Sentry sample rates per ADR 3.  
- **Rollback:** Hardcoded sample rate 0.  

#### 4B. Test Coverage Expansion

- Vitest coverage across relevant `src/` directories.  
- **Rollback:** Restore restricted coverage config.  

**Phase 4 exit gate:** 4A + 4B DoD; before/after metrics documented vs §12.

---

### Phase 5 — Historical Archive Isolation

**Status:** **NOT STARTED**

- Verify `.archive/reporting/` has no active imports or path aliases.  
- Add `README.md` in archive with restoration rules.  

**Phase 5 exit gate:** Grep proof + README present.

---

### Phase 6 — Enterprise Re-Audit & Final Verification

**Status:** **NOT STARTED**

- Re-run comprehensive audit across all areas (non-security scope as agreed).  
- Target overall score > 90/100 vs current **76/100** baseline (Phase 0 smoke attestation sync).  
- **Deliverables:** Architecture diagrams, before/after metrics, Firestore cost comparison, listener inventory, bundle analysis, coverage report, production readiness report, debt register, executive summary.  

**Phase 6 exit gate:** Enterprise Review Board sign-off; §15 checklist complete.

---

## 13a. Optional Technical Debt Backlog (non-blocking)

Tracked debt that does **not** block Baseline Freeze or Phase 3C authorization unless escalated by ER. Do **not** re-open Phase 1/2 foundation work to address these — schedule in parallel or post-Phase 3C as capacity allows.

| ID | Item | Owner | Target | Notes |
|----|------|-------|--------|-------|
| TD-1 | **Orphan admin widgets** (6 files) | Agent D | **Done 2026-07-20** | Archived in `components/.archive/` with grep proof |
| TD-2 | **Orphan remote functions** | Ops | Post-unified-deploy | `aiComplete`, `linkUserProfile`, `setManagerialClaim` — block `firebase deploy --only functions`; cleanup or archive in GCP |
| TD-3 | **Call-log dual-read removal** | Engineering | Post smoke confidence | Remove `mergeCallLogsDualRead` / embedded branch in `CallLogsRepository` / `callLogIds.ts` after human UI spot-check |
| TD-4 | **Deprecated productivity export** | Engineering | Phase 3C+ | `updateAgentProductivity` still exported for emergency tooling — do not re-wire to `logCall`; remove when ER approves |
| TD-5 | **Tier 2 analytics** | Phase 2D | Reports surface | Replace `AggregateUnavailable` with summary docs / `getCountFromServer()` when Reports ready |

---

## 14. Enterprise Phase Quality Gate

Before any phase is marked complete, all of the following must pass:

1. TypeScript compiles with zero errors  
2. ESLint passes with zero errors  
3. All unit, integration, and regression tests pass  
4. Production build completes successfully  
5. No performance regressions vs §12 baseline (when baselines exist)  
6. No increase in Firestore read/write costs vs baseline  
7. No increase in bundle size beyond agreed threshold  
8. Documentation updated for the phase  
9. Backward compatibility maintained  
10. Peer review and Review Board approval completed  

---

## 15. Enterprise Completion Checklist

**Status:** Reconciled 2026-07-19 — partial credit from Phase F + Phase 1 code completion. Items marked `[~]` are substantially satisfied in code but await formal sign-off or dependent phases.

| # | Item | Exit gate(s) | Status |
|---|------|--------------|--------|
| 1 | All Critical findings resolved | Phase 0 + Phase 6 re-audit | [ ] |
| 2 | All High findings resolved | Phase 0 + Phases 1–3 + Phase 6 | [~] Architecture high items closed in code; ops + type safety remain |
| 3 | Architecture review passed | Phase 1 exit + Phase 6 | [~] Phase 1 complete in code; Review Board sign-off pending |
| 4 | Performance review passed | Phase 2 exit + Phase 4 (§12) + Phase 6 | [ ] |
| 5 | Database review passed | Phase 0 (call logs, Meta) + Phase 2 exit + Phase 6 | [~] Meta + query fix + backfill/flag flip + smoke attestation done; Production Sign-off pending |
| 6 | Frontend review passed | Phase 3 exit + Phase 6 | [ ] |
| 7 | Backend review passed | Phase 0 (Meta) + Phase 1C + Phase 2 + Phase 6 | [~] 1C + Meta done; 2A UI parity pending |
| 8 | Accessibility review passed | Phase 0 (E) + Phase 3 A11y + Phase 6 | [~] Phase 0 E done; Phase 3 LeadDetails a11y matrix pending |
| 9 | Testing review passed | Phase 0 (F) + Phase 4 exit + Phase 6 | [~] CI automated gates pass; smoke attested 2026-07-20; Production Sign-off + Phase 4 coverage pending |
| 10 | Documentation review passed | Phase 0 SOP + Phases 4–5 + Phase 6 deliverables | [~] SOPs exist; Phase 6 deliverables pending |
| 11 | No unresolved production blockers | **Phase 0 exit gate** | [~] Backfill + flag flip + smoke attestation done; Production Sign-off pending |
| 12 | Production readiness approved by Enterprise Review Board | **Phase 6 exit gate** | [ ] |
| 13 | Overall audit score exceeds 90/100 | **Phase 6 exit gate** | [ ] Current: 76/100 |
| 14 | Technical debt trend is downward | Phase 6 debt register vs baseline | [ ] |
| 15 | Performance metrics meet or exceed targets | §12 baselines + Phase 4–6 verification | [ ] §12 not captured |

### Pre-check items satisfied by Phase F + Phase 1 (do not re-verify unless regressing)

- [x] LeadQueryService / LeadRepository canonical paths (Phase F grep proofs)  
- [x] Productivity single-writer + idempotency (Phase F)  
- [x] CI green — tsc, lint 0 errors, Vitest + functions tests (2026-07-19)  
- [x] Zero `firebase/firestore` imports in `src/features/**` (Phase 1A)  
- [x] ListenerManager wired in repositories (Phase 1B)  
- [x] Functions `index.js` exports-only (Phase 1C)  
- [x] Tier 2 honest `AggregateUnavailable` placeholders (Phase F)  

### Checkbox quick reference

- [ ] All Critical findings resolved → **Phase 6**  
- [~] All High findings resolved → **Phase 6** (architecture/backend high items closed in code)  
- [~] Architecture review passed → **Phase 1** code done, **Phase 6** formal  
- [ ] Performance review passed → **Phase 2**, **Phase 4**, **Phase 6**  
- [~] Database review passed → **Phase 0** Production Sign-off remain, **Phase 2**, **Phase 6**  
- [ ] Frontend review passed → **Phase 3**, **Phase 6**  
- [~] Backend review passed → **Phase 0** Meta ✓, **Phase 1C** ✓, **Phase 2**, **Phase 6**  
- [~] Accessibility review passed → **Phase 0** E ✓, **Phase 3**, **Phase 6**  
- [~] Testing review passed → CI ✓, smoke attested 2026-07-20, **Phase 0** Production Sign-off, **Phase 4**, **Phase 6**  
- [~] Documentation review passed → SOPs ✓, **Phase 5**, **Phase 6**  
- [~] No unresolved production blockers → **Phase 0** Production Sign-off pending  
- [ ] Production readiness approved by Enterprise Review Board → **Phase 6**  
- [ ] Overall audit score exceeds 90/100 → **Phase 6** (from 76/100)  
- [ ] Technical debt trend is downward → **Phase 6**  
- [ ] Performance metrics meet or exceed targets → **§12**, **Phase 4**, **Phase 6**  

---

## Related directives

| Document | Role |
|----------|------|
| [`baseline-freeze-sop.md`](./baseline-freeze-sop.md) | §12 Baseline Freeze executable SOP |
| [`phase-0-audit-convergence.md`](./phase-0-audit-convergence.md) | Phase 0 executable SOP |
| [`phase-f-completion-convergence.md`](./phase-f-completion-convergence.md) | Phase F acceptance gate + smoke checklist |
| [`phase-b-lead-query-migration.md`](./phase-b-lead-query-migration.md) | LeadQueryService canonical path |
| [`phase-c-call-logs-migration.md`](./phase-c-call-logs-migration.md) | Call logs extraction model |
| [`phase-d-bulk-counters.md`](./phase-d-bulk-counters.md) | Bulk import + counters |
| [`phase-e-hardening-checkpoint.md`](./phase-e-hardening-checkpoint.md) | Phase E debt checkpoint |
| [`incident-runbook.md`](./incident-runbook.md) | Production incident response |

---

## Document control

| Field | Value |
|-------|-------|
| Version | **1.2 (baseline freeze gate)** |
| Created | 2026-07-19 |
| Reconciled | **2026-07-19** |
| Prior version | 1.1 (reconciled) |
| Baseline Freeze SOP | [`baseline-freeze-sop.md`](./baseline-freeze-sop.md) — added v1.2 |
| Re-audit reference | Conditional Pass, 2026-07-19, v0.0.60 baseline → **v0.0.61** live; smoke attested **2026-07-20** |
| Readiness score | **76 / 100** *(+4 smoke attestation; Production Sign-off + Baseline Freeze manual metrics remain)* |
| Authority | **Repository is authoritative** — blueprint reflects repo state |
| Next action | **Production Sign-off** → **Baseline Freeze manual metrics** → Phase 3C authorization |
| Rollback OTA | **v0.0.60** bundle (`golden-acres-projects.web.app/updates/bundle-0.0.60.zip`) |
| Ops note | Orphan remote functions (`aiComplete`, `linkUserProfile`, `setManagerialClaim`) blocked functions deploy this window — cleanup deferred |
