# Wave 6 Phase 2A — Agent 3 Notes
## Query Scoping (listeners + indexes)

**Status:** Phase 2A Agent 3 complete — scoped listeners wired  
**Date:** 2026-07-13  
**App:** `telecaller-app/`  
**Contracts used:** `@/shared/contracts` → `queryScopes.ts` (no contract API changes)  
**Forbidden skipped:** automation jobs, AI/scoring, dashboard redesign, Phase 2B

---

## What shipped

| Area | Change | Path |
| --- | --- | --- |
| Role-scoped leads | `onSnapshot(buildRoleScopedLeadsQuery(...))` replaces full `leadsRef` | `src/shared/services/DatabaseContext.tsx` |
| Provider props | `userRole` + `customRoles` passed from App | `src/App.tsx` |
| Notifications | `buildUserNotificationsQuery(uid)` replaces full-collection + client filter | `src/features/dashboard/hooks/useNotificationsStore.ts` |
| Attendance | `buildAttendanceDateRangeQuery` — rolling **90-day** window | `src/features/attendance/hooks/useAttendanceStore.ts` |
| Audit list vs write | List subscribe **opt-in** via `subscribeToList`; writes always via repository | `src/features/admin/hooks/useAuditLogsStore.ts` |
| Audit UI only | `subscribeToList: tab === "audit"` | `src/features/admin/components/AdminSettingsTabs.tsx` |
| Indexes | Composites added for scoped queries | `firestore.indexes.json` |

---

## Behavior details

### 1. Leads (`buildRoleScopedLeadsQuery`)

- **Agent:** `assignedTo == uid` + `orderBy updatedAt desc`
- **Managerial:** `orderBy updatedAt desc` + **limit 500** (contract default)
- Demo seed runs **only** when a managerial query sees `snapshot.empty` (agent empty ≠ empty collection)
- Docs mapped with `{ id: d.id, ...d.data() }` because query helpers do not attach converters

### 2. Notifications (`buildUserNotificationsQuery`)

- Listener: `userId == uid` + `createdAt desc`
- **Removed:** full-collection fan-out and client-side `userId` filter
- Writes unchanged (`NotificationsRepository`)

### 3. Attendance (`buildAttendanceDateRangeQuery`)

- List listener: `date` in `[today-90d, today]` (all users — preserves admin live board / report cards)
- Today doc still: `doc(attendanceRef, `${date}_${userId}`)`
- Personal tabs still filter `allAttendance` by `userId` client-side within the window

### 4. Audit (list ≠ write)

| Caller | Before | After |
| --- | --- | --- |
| Dashboard / most admin tabs | Full `auditLogs` snapshot for `logAuditEvent` only | **No list listener**; write-only |
| Admin Settings → Audit | Full snapshot | `buildAuditLogsListQuery` (limit 100) when `tab === "audit"` |

---

## Firestore indexes (`firestore.indexes.json`)

| Collection | Fields | Needed by |
| --- | --- | --- |
| `leads` | `assignedTo` ASC, `updatedAt` DESC | Agent leads listener |
| `leads` | `followUpDate` ASC, `assignedTo` ASC | Future FU jobs (documented in Agent 0; not wired here) |
| `notifications` | `userId` ASC, `createdAt` DESC | User notifications listener |
| `attendance` | `userId` ASC, `date` ASC | Optional user-scoped attendance (helper ready) |

**Not added (auto single-field sufficient):**

- `attendance.date` range + `orderBy date` (current list path)
- `auditLogs.timestamp` DESC (list query)
- Manager leads: `orderBy updatedAt` only

**Deploy before relying on agent/notification listeners in prod:**

```bash
cd telecaller-app
npx firebase deploy --only firestore:indexes
```

Until indexes build, agent-scoped leads / user notifications may fail with Firestore “requires an index” errors.

---

## Escalations for Agent 0 (no contract edits)

1. **Broadcast notifications gap**  
   Legacy UI treated `!userId` as shared announcements. `buildBroadcastNotificationsQuery` uses `userId == ""`, which does **not** match missing `userId`. Agent 3 did **not** reintroduce a full-collection scan. Dashboard “shared unread” banner may miss legacy broadcast docs until writers use `userId: ""` (or contract gains a real “field missing” strategy).

2. **Query helpers omit converters**  
   Consumers must `{ id: doc.id, ...doc.data() }`. Optional improvement: return converter-typed queries from `queryScopes` (Agent 0).

3. **Manager lead cap 500**  
   Wired as contract default. Cursor pagination still Phase 2E.

4. **Attendance still all-users within 90d**  
   Admin live board needs cross-user today rows; did not force `userId` on the list query. Further agent-only scoping can use the helper’s `userId` option later.

---

## Out of scope (explicit)

- Automation / cron / SLA jobs / `publishNotification` server paths
- Scoring / `LeadIntelligence` persistence
- Timeline UI / WhatsAppAssistant / site-visit workflow (Agents 1–2)
- Shared contract redesign

---

## Validation

From `telecaller-app/`:

```bash
npx tsc --noEmit
```

(See return summary for pass/fail.)

---

## STOP

Feature agents should import query builders from `@/shared/contracts` only. Escalate gaps to Architecture Owner — do not fork ad-hoc Firestore queries in feature PRs.
