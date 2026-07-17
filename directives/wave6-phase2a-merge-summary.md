# Wave 6 Phase 2A — Merge Summary

**Date:** 2026-07-14  
**Agent:** 4 (Validation — read-only)  
**App:** `telecaller-app/`  
**Related:**  
- `directives/wave6-phase2a-validation-report.md` — **PASS**  
- `directives/wave6-phase2a-regression-report.md`  
**Phase 2B:** Not started — await authorization

---

## Agents

| Agent | Role | Status | Notes path |
| --- | --- | --- | --- |
| 0 | Architecture / frozen shared contracts | Complete | `directives/wave6-phase2a-agent0-notes.md` |
| 1 | Workflow foundation (status + site visit) | Complete | `directives/wave6-phase2a-agent1-notes.md` |
| 2 | Timeline foundation (feature adoption) | Complete | `directives/wave6-phase2a-agent2-notes.md` |
| 3 | Query scoping (listeners + indexes) | Complete | `directives/wave6-phase2a-agent3-notes.md` |
| 4 | Validation (this pass) | Complete | reports only — no production code |

---

## Primary files by agent

### Agent 0 — contracts + bleeding stops

| Path | Role |
| --- | --- |
| `src/shared/contracts/leadStatus.ts` | Canonical statuses |
| `src/shared/contracts/statusTransition.ts` | Transition planner + site-visit helper |
| `src/shared/contracts/timelinePublisher.ts` | Typed timeline publishers |
| `src/shared/contracts/notifications.ts` | Client notification helper |
| `src/shared/contracts/queryScopes.ts` | Scoped query builders |
| `src/shared/contracts/leadIntelligence.ts` | Intelligence **types only** |
| `src/shared/contracts/taskContract.ts` | Optional task field extensions |
| `src/shared/contracts/index.ts` | Barrel |
| `functions/notifications/publishNotification.js` | Server notification helper |
| `src/shared/services/firebase/repositories.ts` | `logCall` no longer overwrites `Lead.notes` |
| `src/features/leads/hooks/useLeadsStore.ts` | Typed publishers; FU diff-only; heuristic bleed-stop |
| `src/features/leads/config/leadListFilterConfig.ts` | `LEAD_STATUS_OPTIONS` ← `LEAD_STATUS_FILTER_OPTIONS` |

### Agent 1 — workflow

| Path | Role |
| --- | --- |
| `src/features/leads/components/SiteVisitScheduler.tsx` | `site-visit-confirmed` + typed site-visit publishers |
| `src/features/leads/pages/LeadDetailsPage.tsx` | Pipeline / call status via planner |
| `src/features/leads/components/LeadsTab.tsx` | Kanban via planner |
| `src/features/admin/components/AdminLeadsTab.tsx` | Admin stage via planner |
| `src/features/leads/components/BulkActionsPanel.tsx` | Bulk status via normalize + plan |

### Agent 2 — timeline adoption

| Path | Role |
| --- | --- |
| `src/features/leads/components/WhatsAppAssistant.tsx` | Deep-link only; no callLogs write |
| `src/features/leads/components/DiscountManager.tsx` | `publishDiscountRequested` |
| `src/features/leads/components/PendingDiscountsApprovals.tsx` | Discount approve/reject publishers |
| `src/features/admin/pages/AdminDashboard.tsx` | Discount publishers |
| `src/features/leads/components/CampaignBroadcastModal.tsx` | `publishNoteAdded` (campaign audit) |
| `src/features/admin/components/settings/MergeSettingsTab.tsx` | `publishLeadMerged` |
| `useLeadsStore` (overlap w/ 0) | `publishLeadMerged` + logCall heuristic guard |

### Agent 3 — query scoping

| Path | Role |
| --- | --- |
| `src/shared/services/DatabaseContext.tsx` | `buildRoleScopedLeadsQuery` listener |
| `src/App.tsx` | Passes `userRole` / `customRoles` into provider |
| `src/features/dashboard/hooks/useNotificationsStore.ts` | `buildUserNotificationsQuery` |
| `src/features/attendance/hooks/useAttendanceStore.ts` | `buildAttendanceDateRangeQuery` (90d) |
| `src/features/admin/hooks/useAuditLogsStore.ts` | Opt-in `buildAuditLogsListQuery` |
| `src/features/admin/components/AdminSettingsTabs.tsx` | `subscribeToList` when audit tab |
| `firestore.indexes.json` | Leads / notifications / attendance composites |

### Agent 4 — validation docs only

| Path | Role |
| --- | --- |
| `directives/wave6-phase2a-validation-report.md` | PASS/FAIL matrix |
| `directives/wave6-phase2a-regression-report.md` | Residuals / risks |
| `directives/wave6-phase2a-merge-summary.md` | This file |

---

## Merge order notes

1. **Agent 0 first (hard dependency)** — all feature agents import `@/shared/contracts`. Land contracts + repository/store bleed-stops before or with feature PRs; do not merge 1–3 without 0.  
2. **Agents 1 and 2** — largely independent after 0; both touch `SiteVisitScheduler` / discount / lead detail surfaces — prefer **sequential merge or single combined PR** if both edit the same files to avoid conflict thrash.  
3. **Agent 3 after 0** — depends on `queryScopes`; also touches `App.tsx` / `DatabaseContext` (coordinate with any Agent 0 provider changes). Indexes file can land with 3; **deploy indexes before cutover** of scoped listeners in prod.  
4. **Agent 4** — docs only; no code merge dependency.

**Suggested safe order:** `0 → (1 ∥ 2 with conflict awareness) → 3 → 4 docs`.

---

## Explicitly out of this merge (do not include)

- Phase 2B Timeline UI / callLogs pane collapse  
- DLS updates  
- Lead scoring / `LeadIntelligence` persistence  
- New SLA / overdue FU automation beyond existing Functions  
- Daily Priorities UI  

---

## Cutover checklist (ops)

- [ ] Merge Agent 0 contracts  
- [ ] Merge Agents 1–2 feature adoption  
- [ ] Merge Agent 3 listeners + `firestore.indexes.json`  
- [ ] Deploy indexes; wait until ready  
- [ ] Smoke: agent sees only assigned leads; manager sees capped list; notifications user-scoped; site visit → `site-visit-confirmed`; call log does not wipe profile notes  

---

## STOP

Phase 2A validation complete (**PASS**). Await authorization before Timeline Normalization (Phase 2B).
