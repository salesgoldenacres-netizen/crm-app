# Wave 6 Phase 2E — Notes
## Performance & Scalability polish

**Status:** Phase 2E implementation complete — awaiting validation close + Wave 6 closeout auth  
**Date:** 2026-07-14  
**App:** `telecaller-app/`  
**Prior work:** Phase 2A Agent 3 already scoped leads / notifications / attendance / audit — **extended, not duplicated**  
**Forbidden skipped:** Intelligence (2D), automation cron redesign (2C), UI/DLS, new collections, Wave 7

---

## What shipped

| Area | Change | Path |
| --- | --- | --- |
| Notifications harden | Default **limit 100** on `buildUserNotificationsQuery` | `shared/contracts/queryScopes.ts` |
| Archived leads | Bounded list `orderBy archivedAt desc` + **limit 200** (was full collection) | `useArchivedLeadsStore.ts` + contract helper |
| Tasks | `where userId` + `orderBy createdAt` (was full collection + client filter) | `useTasksStore.ts` + contract |
| Leave requests | Bounded list (limit 200) + optional `userId`; `enabled` flag | `useLeaveRequestsStore.ts` + contract |
| Dashboard fan-out | Lazy-subscribe widget/admin stores only when widgets / training UI mounted | `Dashboard.tsx` + store `enabled` options |
| Audit write/list | Verified still write-only on Dashboard; list only Admin Settings → Audit | no change needed |
| Leads / attendance | Verified role-scoped leads + 90-day attendance still wired | no change needed |
| Evolution phone match | Indexed `phone ==` variants first; fallback scan **100** (was 500) | `functions/messaging/providers/evolution.js` |
| Conversation phone | Fallback scan **50** (was 200); equality path unchanged | `functions/messaging/store.js` |
| Bundle | `manualChunks` → dedicated `firebase` chunk | `vite.config.js` |
| Indexes | Added `tasks` (userId+createdAt), `leaveRequests` (userId+createdAt) | `firestore.indexes.json` |

---

## Dashboard lazy-subscribe matrix

| Store | Subscribes when |
| --- | --- |
| Call targets, goals, rosters, events, coaching tip, tasks, leave | `tab=leads` && `subtab=dashboard` (WidgetGrid) |
| Training | `tab=training` |
| Audit list | Never from Dashboard (write-only) |
| Leads / projects / users / notifications / attendance / agent status / IVR | Always (core shell) |

Admin tabs keep default `enabled: true` (independent mounts).

---

## Firestore indexes (`firestore.indexes.json`)

| Collection | Fields | Needed by |
| --- | --- | --- |
| *(prior 2A)* leads, notifications, attendance, siteVisit.date | — | Already present |
| `tasks` | `userId` ASC, `createdAt` ASC | User tasks listener |
| `leaveRequests` | `userId` ASC, `createdAt` DESC | Optional user-scoped leave list |

**Auto single-field sufficient:**

- `archivedLeads.archivedAt` DESC
- `leaveRequests.createdAt` DESC (all-users list path)
- `auditLogs.timestamp` DESC

### Deploy before relying on new listeners in prod

```bash
cd telecaller-app
npx firebase deploy --only firestore:indexes
```

Until `tasks` / `leaveRequests` composites build, those scoped listeners may fail with “requires an index”.

---

## Explicitly deferred (residuals)

1. **Manager leads still capped at 500** — cursor pagination not shipped (product UX + risk).  
2. **Attendance still all-users within 90d** — admin live board needs cross-user rows.  
3. **Broadcast notifications** — `userId == ""` still misses legacy missing-`userId` docs (2A escalation).  
4. **DataTable virtualization / Firestore cursor pages** — client slice already fine; no clear low-risk win.  
5. **Timeline “load older”** — not done (medium risk / UX).  
6. **phoneDigits denormalized field** — Evolution equality uses stored `phone` variants; full O(1) needs schema later.  
7. **Bundle analyzer script** — skipped (new dep); `manualChunks` only.  
8. **Automation slice 2** (missed-call / stuck notify) — frozen per Phase 2E authorization (perf-only).

---

## Out of scope (explicit)

- Intelligence / scoring changes  
- Automation cron redesign  
- UI redesign / DLS bump  
- New Firestore collections / callLogs off-document migration  
- Wave 7

---

## Validation

See `directives/wave6-phase2e-validation.md`.

---

## STOP

Phase 2E code complete. **Do not** auto-close Wave 6 or start Wave 7 without user authorization.
