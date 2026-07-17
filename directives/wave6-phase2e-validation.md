# Wave 6 Phase 2E — Validation Report

**Date:** 2026-07-14  
**Agent:** Performance & Scalability polish  
**App:** `telecaller-app/`  
**Scope:** High-ROI leftovers from Agent 5 audit beyond Phase 2A Agent 3  
**DLS:** unchanged (v1.4)  
**Next:** Recommend Wave 6 close — **await user authorization** (do not start Wave 7)

---

## Verdict

**PASS** — Phase 2E performance exit criteria met for the authorized perf-only slice. Core CRM listeners remain scoped; remaining full-collection hot spots capped or lazy-subscribed; Evolution phone path prefers equality; indexes documented for deploy.

---

## Exit criteria matrix

| # | Criterion | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Agents do not subscribe to full `leads` | **PASS** | `DatabaseContext` → `buildRoleScopedLeadsQuery` (verified; 2A) |
| 2 | Notifications scoped by `userId` (+ bounded) | **PASS** | Default limit 100 on contract query |
| 3 | Attendance date-scoped | **PASS** | 90-day range query (verified; 2A) |
| 4 | Audit list not on every Dashboard visit | **PASS** | Write-only `useAuditLogsStore()` on Dashboard |
| 5 | Remaining full-collection risks reduced | **PASS** | Archived ≤200; tasks by userId; leave ≤200 |
| 6 | Dashboard fan-out reduced (safe) | **PASS** | Widget/training stores gated by `enabled` |
| 7 | Evolution phone match improved | **PASS** | Equality variants first; scan 500→100 |
| 8 | Bundle trivial win | **PASS** | `manualChunks` firebase split (~562 kB chunk) |
| 9 | Indexes complete + deploy documented | **PASS** | `firestore.indexes.json` + notes deploy cmd |
| 10 | No Intelligence / automation / UI redesign | **PASS** | Perf-only diff |
| 11 | Tooling tsc / build | **PASS** | See tooling table |

---

## Tooling

| Check | Result | Notes |
| --- | --- | --- |
| `npx tsc --noEmit` | **PASS** (exit 0) | Clean |
| `npx vitest run src/shared/contracts` | **PASS** | 18 tests |
| `npm run build` | **PASS** (exit 0) | ~2.2s; firebase chunk split; size warning on firebase itself (expected) |
| `npm run lint` | Not re-gated | Pre-existing residuals from earlier phases |

---

## Residuals (non-blocking)

| ID | Finding | Severity | Recommended next |
| --- | --- | --- | --- |
| E1 | Manager leads hard-cap 500 | Medium (scale) | Cursor pagination when tenants exceed cap |
| E2 | Attendance all-users in 90d window | Low | Agent-only `userId` option for telecaller paths |
| E3 | Broadcast notifs miss legacy missing `userId` | Low | Writers emit `userId: ""` or dual query |
| E4 | Evolution fallback still scans ≤100 | Low | Denormalize `phoneDigits` later |
| E5 | No timeline load-older / list virtualization | Low | Only if windows grow past caps |
| E6 | Indexes must be deployed to prod | Ops | `npx firebase deploy --only firestore:indexes` |
| E7 | Pre-existing lint noise | Low | Same as 2C/2D |

---

## Blockers

**None.**

---

## Deliverables

1. Implementation (contracts + stores + Dashboard + Functions + vite + indexes)  
2. `directives/wave6-phase2e-notes.md`  
3. `directives/wave6-phase2e-validation.md` (this file)  
4. `directives/wave6-complete.md` — **draft only**, awaiting user close authorization  
5. `memory.md` updated  

---

## Recommendation

**Recommend Wave 6 close** after user review of 2A–2E. Phase 1 audits + 2A–2E implementation cover the gated roadmap for status/timeline/automation/intelligence/performance. Deferred items (E1–E5, callLogs migration, LLM, Algolia) belong in Wave 7+ / optional phases — not blockers for Wave 6 close.

---

## STOP

Phase 2E validation complete. **Await authorization** for Wave 6 closeout and/or Wave 7. Do not auto-close.
