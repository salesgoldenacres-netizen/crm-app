# Baseline Freeze — Executable SOP (§12)

**Program:** Golden Acres CRM Enterprise Remediation  
**Master blueprint:** [`enterprise-remediation-blueprint.md`](./enterprise-remediation-blueprint.md) §12  
**Gate position:** After Phase 0 manual smoke + **Production Sign-off** — **before Phase 3C authorization**  
**Artifact:** `.tmp/remediation-baselines-YYYY-MM-DD.json` (never commit; regenerate on re-freeze only with ER approval)

---

## Purpose

Capture an **immutable performance and quality snapshot** of the production-approved release (v0.0.61+) immediately after human validation. This baseline is the authoritative comparison point for Phase 4+ work — observability, type-safety rollout side effects, analytics offload, and Phase 6 re-audit.

**Baseline Freeze is not optional.** Phase 3C, Phase 4, and all subsequent performance-gated phases require a linked baseline artifact.

---

## Who runs it

| Role | Responsibility |
|------|----------------|
| **Operations / Engineering Lead** | Executes capture commands, records deploy state, signs artifact |
| **QA** | Confirms capture window matches signed Production Sign-off version |
| **Architecture** | Reviews listener inventory + read-count methodology for sanity |

One named executor must appear in the artifact `capturedBy` field. Co-sign optional but recommended for Production Sign-off alignment.

---

## When (gate sequence)

```text
Phase 0 ops complete (backfill, flag flip, OTA v0.0.61+)
        │
        ▼
Manual smoke checklist (Agent F — human)     ← does NOT require baseline
        │
        ▼
Production Sign-off table complete         ← does NOT require baseline
        │
        ▼
★ BASELINE FREEZE (this SOP) ★               ← BLOCKS Phase 3C authorization
        │
        ▼
Phase 3C — type safety rollout
        │
        ▼
Phase 4 → Phase 5 → Phase 6
```

**Do not capture baselines before Production Sign-off** — the signed version must match the frozen commit and OTA manifest.

**Do not start Phase 3C** until the baseline artifact exists and is linked in [`phase-f-completion-convergence.md`](./phase-f-completion-convergence.md) Operational DoD.

---

## Capture checklist

Run all items in a single session on the **same signed release**. Record every field in the JSON artifact (schema below).

### 1. Git commit SHA

```bash
git rev-parse HEAD
git log -1 --oneline
```

Record full SHA, branch name, and whether workspace was clean at capture time.

### 2. App version (v0.0.61+)

- Source: `telecaller-app/package.json` → `version`
- Live proof: https://golden-acres-projects.web.app/updates/manifest.json
- Record OTA bundle URL and rollback version (**v0.0.60**)

### 3. Functions version / deploy state

```bash
cd telecaller-app
npx firebase functions:list --project golden-acres-projects
```

Record:

- Last successful functions deploy date (if known)
- Whether unified deploy was skipped this window
- **Orphan remote functions** (not in local `functions/index.js` exports): `aiComplete`, `linkUserProfile`, `setManagerialClaim` — note as **deferred ops debt**, not baseline blockers
- Functions test count at capture: **88/88** expected

### 4. Environment

| Field | Value |
|-------|-------|
| Firebase project | `golden-acres-projects` |
| Hosting URL | `https://golden-acres-projects.web.app` |
| Auth domain | `golden-acres-projects.firebaseapp.com` |
| Capture surface | Production (preferred) or staging with ER approval |

Record `VITE_CALL_LOGS_EMBEDDED_FALLBACK` state from production bundle (`false` expected post v0.0.61).

### 5. Bundle size (Vite build output KB)

```bash
cd telecaller-app
npm run build
```

From Vite output, record:

- Total JS (gzip where reported)
- Largest chunk name + size
- CSS total (if split)
- `dist/` total KB (optional cross-check)

**Comparison rule (Phase 4+):** No regression beyond **≤ +2%** vs this baseline (blueprint §7 Performance Budget).

### 6. Firestore read baseline — dashboard startup read count

**Methodology:**

1. Open Chrome DevTools → **Network** tab; filter `firestore.googleapis.com` (or use Firebase Performance / Firestore debug logging if enabled).
2. Private window → log in as **admin** → land on **Dashboard** (default widgets loaded).
3. Wait until initial spinner/skeleton clears and KPI cards/widgets settle (~5 s idle).
4. Count **Firestore Listen/Write RPCs** (or document read units if using Firebase console debug) during first load only — **exclude** user-initiated navigation after idle.
5. Repeat **3 runs**; record median and range.

Also note: one-shot reads from `DatabaseContext` (projects/users) vs active listeners — see item 7.

**Comparison rule (Phase 4+):** Target **−40% reads** vs this baseline on dashboard startup (blueprint §10 KPIs). No increase allowed during Phase 3C unless ER-approved.

### 7. Active listener inventory (count on startup)

**Methodology:**

1. After Dashboard reaches idle (same session as item 6), open DevTools console.
2. If diagnostic hook available: `ListenerManager.getActiveCount()` and `ListenerManager.getDiagnostics()` (from `telecaller-app/src/shared/services/firebase/ListenerManager.ts`).
3. If not exposed in prod build, use Firebase debug + repository subscription audit: count distinct snapshot listeners registered by repositories on Dashboard load.
4. Record **total active listener keys** and top keys by ref-count.

**Comparison rule (Phase 4+):** **≤ 1 listener per collection type** where scoped (blueprint §10); no duplicate keys for identical query scopes.

### 8. Dashboard startup time methodology

**Methodology:**

1. Chrome DevTools → **Performance** panel (or Lighthouse → Performance).
2. Private window, cache disabled, throttling **None** (repeat with **Fast 3G** optional).
3. Mark: navigation start → Dashboard **LCP** or first meaningful paint of KPI strip.
4. **3 runs** on production; record median ms.

**Budget:** < 2 s (blueprint §7).

### 9. Lead creation latency methodology

**Methodology:**

1. Admin or agent flow: create single test lead with unique phone (staging/prod test prefix documented).
2. Measure: submit click → success toast / modal close → lead visible in list (LeadQueryService page 1 or agent queue).
3. Optional: Firestore write completion via DevTools timing on `leads` add mutation.
4. **5 runs**; record median, p95, env, and role used.

**Budget:** < 300 ms median (blueprint §7).

### 10. Webhook latency methodology

**Methodology:**

1. Staging or controlled Meta redelivery test (post Agent C) — same event must not duplicate lead.
2. Measure: HTTP POST received (Functions log `meta_ingest` timestamp) → lead document visible in Firestore / ingestEvents claim complete.
3. Source: Cloud Functions logs (`firebase functions:log` or GCP Console), structured `meta_ingest` entries.
4. **3+ samples**; record median ms and max.

**Budget:** < 500 ms processing (blueprint §7); no transaction counter contention on ingest path.

### 11. Lighthouse / performance metrics (optional manual)

```bash
# Optional — Chrome Lighthouse CLI or DevTools
npx lighthouse https://golden-acres-projects.web.app --only-categories=performance,accessibility --chrome-flags="--headless"
```

Record Performance score, LCP, TBT, CLS if captured. Not a gate for Baseline Freeze; useful for Phase 6 delta.

### 12. Test counts

```bash
cd telecaller-app
npm run typecheck    # expect 0 errors
npm run lint         # expect 0 errors
npm test             # expect 303/303 app
cd functions && npm test   # expect 88/88
```

Record exact counts and date in artifact.

### 13. TypeScript status

- Command: `npm run typecheck`
- **Gate:** **0 errors** at freeze time

### 14. ESLint status

- Command: `npm run lint`
- **Gate:** **0 errors** at freeze time (warnings allowed; record count)

---

## How to record

1. Create `.tmp/remediation-baselines-YYYY-MM-DD.json` using the schema below (`YYYY-MM-DD` = capture date).
2. Link artifact path in:
   - [`phase-f-completion-convergence.md`](./phase-f-completion-convergence.md) — Operational DoD → Baseline Freeze
   - Phase 3C kickoff note (when started)
3. Copy summary table (no secrets) into phase exit reports as needed.
4. **Do not commit** `.tmp/` artifacts — local evidence only.

### JSON schema (minimum fields)

```json
{
  "schemaVersion": "1.0",
  "program": "Golden Acres CRM Enterprise Remediation",
  "baselineType": "post-phase-0-production-sign-off",
  "capturedAt": "2026-07-19T21:30:00+05:30",
  "capturedBy": "<name>",
  "productionSignOffDate": "<date from phase-f table>",
  "git": {
    "sha": "<full sha>",
    "branch": "main",
    "clean": true
  },
  "release": {
    "appVersion": "0.0.61",
    "rollbackVersion": "0.0.60",
    "otaManifestUrl": "https://golden-acres-projects.web.app/updates/manifest.json",
    "callLogsEmbeddedFallback": false
  },
  "environment": {
    "firebaseProject": "golden-acres-projects",
    "surface": "production"
  },
  "functions": {
    "deployState": "hosting-only-window",
    "orphanRemoteFunctions": ["aiComplete", "linkUserProfile", "setManagerialClaim"],
    "testsPass": "88/88"
  },
  "bundle": {
    "totalJsKbGzip": null,
    "largestChunk": { "name": "", "kbGzip": null },
    "buildCommand": "npm run build"
  },
  "firestore": {
    "dashboardStartupReads": { "median": null, "runs": [], "methodology": "see SOP §6" }
  },
  "listeners": {
    "activeCountOnDashboardIdle": null,
    "diagnosticsKeys": {},
    "methodology": "see SOP §7"
  },
  "latency": {
    "dashboardStartupMs": { "median": null, "runs": [] },
    "leadCreationMs": { "median": null, "p95": null, "runs": [] },
    "webhookProcessingMs": { "median": null, "runs": [] }
  },
  "lighthouse": {
    "optional": true,
    "performanceScore": null,
    "lcpMs": null
  },
  "qualityGates": {
    "typescriptErrors": 0,
    "eslintErrors": 0,
    "eslintWarnings": 4,
    "vitestApp": "303/303",
    "vitestFunctions": "88/88"
  },
  "notes": ""
}
```

---

## Baseline Freeze sign-off

| Field | Value |
|-------|-------|
| Executor | |
| Date | |
| App version | |
| Artifact path | `.tmp/remediation-baselines-YYYY-MM-DD.json` |
| Linked in phase-f | [ ] |

**Baseline Freeze complete:** [ ] — unblocks Phase 3C authorization only when checked with valid artifact.

---

## Comparison rules (Phase 4+)

All subsequent phases compare against this frozen artifact unless Enterprise Review Board approves a **re-freeze** (new Production Sign-off required).

| Metric | Rule | Source |
|--------|------|--------|
| Bundle size | **No regression** beyond **≤ +2%** vs baseline | Blueprint §7, §10 |
| Firestore dashboard reads | **−40% or better** is Phase 4–6 KPI; **no increase** during Phase 3C without ER approval | Blueprint §10 |
| Active listeners | **≤ 1 per collection type** (scoped); no duplicate ListenerManager keys | Blueprint §10 |
| Dashboard startup | **< 2 s** median; no regression vs baseline | Blueprint §7 |
| Lead creation | **< 300 ms** median | Blueprint §7 |
| Webhook processing | **< 500 ms**; no ingest contention regression | Blueprint §7 |
| TypeScript / ESLint | **0 errors** maintained (Phase 14 gate) | Blueprint §14 |
| Tests | Count **≥ baseline**; no failing suites | Blueprint §14 |
| Memory | **≤ +5%** if measured | Blueprint §7 |

**"No regressions"** means: if a phase change increases any capped metric vs baseline, the phase exit report must document cause, mitigation, and ER waiver — otherwise the phase does not close.

Phase 4 **requires** baseline artifact linked before start. Phase 3C **requires** baseline before authorization (type-safety changes can affect bundle and lint surface).

---

## Related documents

| Document | Role |
|----------|------|
| [`enterprise-remediation-blueprint.md`](./enterprise-remediation-blueprint.md) | §12 metrics definition + program gates |
| [`phase-f-completion-convergence.md`](./phase-f-completion-convergence.md) | Production Sign-off + Operational DoD linkage |
| [`phase-0-audit-convergence.md`](./phase-0-audit-convergence.md) | Phase 0 exit — baseline post-sign-off |
| [`incident-runbook.md`](./incident-runbook.md) | Rollback if capture reveals production anomaly |

---

## Document control

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Created | 2026-07-19 |
| Authority | Executable SOP for §12 Baseline Freeze |
| Next action | Execute after Production Sign-off → link artifact → authorize Phase 3C |
