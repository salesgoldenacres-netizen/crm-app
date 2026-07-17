# Wave 6 Phase 1 — Agent 5: Performance & Scalability Audit

**Date:** 2026-07-13  
**App:** `telecaller-app/`  
**Scope:** Firestore queries/indexes, pagination, timeline rendering, dashboard loading, bundle size, lazy loading, API efficiency  
**Constraint:** Audit only — **no architecture rewrite** in this phase.

---

## Executive summary

The app is optimized for small/medium CRM datasets with aggressive real-time sync. Route-level and tab-level `React.lazy` are in good shape. Messaging (WhatsApp + timeline) already uses **bounded queries + composite indexes**.

The primary scalability risk is **unbounded full-collection `onSnapshot` listeners** (especially `leads`, `auditLogs`, `attendance`, `notifications`, `archivedLeads`) combined with **client-side filter/sort/paginate** and **embedded `callLogs` arrays on lead documents**. Dashboard mount also fans out many store subscriptions regardless of active tab.

**Verdict:** Fine for current team size; will degrade (memory, Firestore reads, main-thread cost, OTA payload) as leads/history grow into the high thousands without query scoping and server-side pagination.

---

## Tooling notes (optional)

### `telecaller-app/package.json` scripts

| Script | Purpose |
| --- | --- |
| `dev` | Vite dev server |
| `build` | `vite build` (no bundle analyzer) |
| `build:ota` | OTA package via `scripts/deploy-ota.js` |
| `preview` | Vite preview |
| `lint` | ESLint |
| `test` | Vitest |

**Gap:** No `analyze` / `build:stats` script; `vite.config.js` has no `manualChunks` / rollup split strategy beyond Vite defaults.

### `telecaller-app/firestore.indexes.json`

Present with **5 composite indexes**, all messaging/timeline-related:

| Collection | Fields |
| --- | --- |
| `whatsappConversations` | `leadId` ASC + `lastMessageAt` DESC |
| `whatsappConversations` | `status` ASC + `lastMessageAt` DESC |
| `whatsappMessages` | `conversationId` ASC + `timestamp` ASC |
| `whatsappMessages` | `leadId` ASC + `timestamp` ASC |
| `timelineEvents` | `leadId` ASC + `timestamp` DESC |

**Gap:** No indexes for lead list filters (`assignedTo` + `updatedAt`, `followUpDate` + `status`, etc.) because the client currently loads the entire `leads` collection.

---

## 1. Firestore queries & indexes

### What works

- Timeline: `useTimelineEvents` — `where(leadId)` + `orderBy(timestamp desc)` + `limit(max)`  
  Path: `telecaller-app/src/features/messaging/hooks/useTimelineEvents.ts`  
  Index: covered in `firestore.indexes.json`.
- WhatsApp messages: `useWhatsAppMessages` — `where(leadId)` + `orderBy(timestamp asc)` + `limit(max)` (default 200)  
  Path: `telecaller-app/src/features/messaging/hooks/useWhatsAppMessages.ts`
- Conversations list: `useWhatsAppConversations` — `orderBy(lastMessageAt desc)` + `limit(max)` (default 100)  
  Path: `telecaller-app/src/features/messaging/hooks/useWhatsAppConversations.ts`
- Single-doc settings listeners (branding, goals, training, integrations, etc.) are cheap and appropriate.

### Critical risks

| ID | Finding | Path(s) | Impact |
| --- | --- | --- | --- |
| F1 | **Full `leads` collection listener** — no `where` / `limit`; every lead (with embedded `callLogs`) streamed to every authenticated session | `telecaller-app/src/shared/services/DatabaseContext.tsx` → consumed by `useLeadsStore` | O(N) memory + read cost; any lead write re-downloads/re-renders for all clients |
| F2 | **Full `auditLogs` listener** — unbounded; client sorts in memory | `telecaller-app/src/features/admin/hooks/useAuditLogsStore.ts` | Grows without bound until weekly cron; still loaded live into UI stores |
| F3 | **Full `attendance` collection listener** on dashboard/attendance paths | `telecaller-app/src/features/attendance/hooks/useAttendanceStore.ts` | Historical attendance grows linearly with days × agents |
| F4 | **Full `notifications` collection**, filtered client-side by `userId` | `telecaller-app/src/features/dashboard/hooks/useNotificationsStore.ts` | Every user receives all users’ notification docs over the wire |
| F5 | **Full `archivedLeads` listener** | `telecaller-app/src/features/leads/hooks/useArchivedLeadsStore.ts` | Archive becomes a second full lead set in memory |
| F6 | Other unbounded collection snapshots: teams, tasks, leave requests, agent status, smart lists, rosters, call targets, productivity, deleted users | Various `telecaller-app/src/features/**/hooks/*Store.ts` | Acceptable at small N; same pattern as F1–F5 at scale |
| F7 | **Embedded `callLogs[]` on lead docs** — history bloats document size and every snapshot payload | `useLeadsStore`, widgets, Calls tab, Admin analytics | Approaches Firestore 1 MiB/doc limit; amplifies F1 cost |
| F8 | Backend phone match scans up to **500 leads** in memory (no normalized-phone index query) | `telecaller-app/functions/messaging/providers/evolution.js` (`findLeadByPhone`) | Latency + read amplification on inbound WhatsApp |
| F9 | Conversation phone fallback scans up to **200** conversations | `telecaller-app/functions/messaging/store.js` (`findConversationByPhone`) | Same class of issue as F8 |

### Index coverage assessment

- Messaging/timeline: **good**.
- Core CRM (`leads`, `auditLogs`, `attendance`, `notifications`): **not query-shaped** — indexes alone won’t help until listeners become filtered/paginated queries.
- Functions already query `leads.where('phone','==',…)` in places (`functions/index.js`); Evolution path bypasses that with a scan — inconsistency.

---

## 2. Pagination

### Current behavior

| Layer | Behavior | Path |
| --- | --- | --- |
| Firestore | Almost no cursor/`startAfter` pagination on CRM collections | Stores above |
| UI tables | **Client-side** `slice` after filter/sort of full in-memory arrays | `telecaller-app/src/shared/components/DataTable.tsx` (`pageSize` prop) |
| Admin leads | `pageSize={15}` | `telecaller-app/src/features/admin/components/AdminLeadsTab.tsx` |
| Projects / users / attendance / audit / leave | `pageSize` 5–20 | Various admin tabs |
| Messaging | Soft caps via `fsLimit` (100–200), **no “load more” cursor** | Messaging hooks |

### Assessment

UI pagination improves paint for tables but **does not reduce Firestore reads or React memory**. As lead counts grow, filter/sort still runs over the full array on every snapshot update.

**Missing:** Firestore cursor pagination (`limit` + `startAfter`), query-backed lead lists (e.g. `assignedTo == me`), and “load older timeline/messages” UX.

---

## 3. Timeline rendering

### Strengths

- Canonical `timelineEvents` collection with indexed, limited subscription (default max 100; Lead Details requests **150**).  
  Paths: `useTimelineEvents.ts`, `LeadInteractionHistory.tsx`
- Summaries are short (`recordTimelineEvent` truncates summary to 200 chars).
- Filter/search is `useMemo`-bounded.

### Risks

| ID | Finding | Path | Impact |
| --- | --- | --- | --- |
| T1 | Renders **all** filtered events with `.map` — no virtualization; only CSS `max-h` + scroll | `LeadInteractionHistory.tsx` | Fine for ≤150; costly if max raised |
| T2 | **Dual history**: timeline stream + full legacy `callLogs` list (default expanded) | Same file | Double DOM + double data on hot leads |
| T3 | Timeline max of 150 is fixed; no pagination / “load older” | `useTimelineEvents(activeLead.id, 150)` | Incomplete history for long-lived leads without raising limit (worse T1) |
| T4 | Any lead snapshot still carries full `callLogs` even when timeline is primary | `DatabaseContext` + lead docs | Backend/data-model cost, not just UI |

---

## 4. Dashboard loading

### Strengths

- Route lazy: `Dashboard` in `telecaller-app/src/App.tsx`
- Tab content lazy: AdminDashboard, LeadsTab, CallsTab, maps, widgets, etc. in `DashboardTabContent.tsx`
- Admin page similarly lazy-loads tabs (`Admin.tsx`)

### Risks

| ID | Finding | Path | Impact |
| --- | --- | --- | --- |
| D1 | `Dashboard.tsx` eagerly mounts many stores on every visit: projects, leads, users, notifications, agent status, IVR, **full attendance**, leave requests, call targets, goals, training, coaching tip, events, custom roles, rosters, **audit logs**, tasks, dashboard prefs | `telecaller-app/src/features/dashboard/pages/Dashboard.tsx` | High fan-out of live listeners before user opens relevant tabs |
| D2 | `AuthenticatedShell` also mounts theme, notifications, branding, projects, leads, IVR | `telecaller-app/src/App.tsx` | Overlaps dashboard; listeners live app-wide |
| D3 | Widgets recompute metrics by scanning **all leads × callLogs** (CallsToday, BookingsToday, TeamGoals, Leaderboard, CallLogs, AdminDashboard stats) | `telecaller-app/src/features/dashboard/components/widgets/*`, `AdminDashboard.tsx` | CPU spikes on every leads snapshot |
| D4 | `useAuditLogsStore()` is pulled for `logAuditEvent` write helper — still **subscribes to entire audit collection** | `Dashboard.tsx` + `useAuditLogsStore.ts` | Write-only need pays full read tax |
| D5 | Agent stats depend on `allAttendance` + all leads | `getAgentBadgesAndStats` via Dashboard | Couples dashboard TTI to historical attendance size |

**Cold path today:** auth → `DatabaseProvider` (leads+projects+users) → shell listeners → Dashboard store fan-out → lazy tab chunk. First paint waits on large lead snapshot more than on JS chunks.

---

## 5. Bundle size & lazy loading

### Strengths

- Route-level lazy routes: Login, Dashboard, ProjectMap, Admin, AdminMapEditor, LeadDetailsPage, NotFound (`App.tsx`)
- Nested lazy tabs for Dashboard and Admin
- Relatively lean dependency set: React 19, Firebase, lucide-react, react-router, Capacitor, zod, `polygon-clipping`, `react-zoom-pan-pinch`

### Risks / gaps

| ID | Finding | Path | Impact |
| --- | --- | --- | --- |
| B1 | No Vite `manualChunks`; Firebase SDK often lands in a large shared chunk | `telecaller-app/vite.config.js` | Large initial/vendor chunks; Wave 5 regression notes already flagged Vite chunk-size warnings |
| B2 | No bundle analyzer script in `package.json` | `package.json` | Hard to track regressions |
| B3 | Modal registry eagerly imports DialPad, CallLog, TemplateCenter, DialerOverlay in shell | `App.tsx` `AuthenticatedShell` | Telephony/modals in critical path even when unused |
| B4 | `polygon-clipping` used for map geometry — ensure only map routes pull it (verify via analyzer) | plots / map features | Potential accidental pull into main chunk if imported from shared barrel |
| B5 | OTA updates ship full web asset zip (`build:ota`) — large bundles = slower field updates | `scripts/deploy-ota.js` | Operational cost on mobile agents |

**Lazy loading grade:** Routes/tabs **good**; data-layer and shell modals **not lazy**.

---

## 6. API efficiency

### Client → Cloud Functions

| Call | Path | Notes |
| --- | --- | --- |
| `triggerOutboundCall` | Lead details, ProjectMap, dashboard dialer | On-demand — fine |
| `messagingStatus` / `messagingTestConnection` / `messagingInstanceAction` / `messagingSend` | `telecaller-app/src/features/messaging/services/messagingApi.ts` | Callable pattern — fine; avoid polling status unnecessarily |
| OTA manifest `fetch` | `telecaller-app/src/shared/services/updater.ts` | Cache-busted query param — acceptable |

### Backend inefficiencies

| ID | Finding | Path | Impact |
| --- | --- | --- | --- |
| A1 | Lead phone resolution via `.limit(500).get()` + in-memory digit match | `functions/messaging/providers/evolution.js` | O(min(N,500)) reads per inbound match miss path |
| A2 | Conversation phone fallback `.limit(200).get()` | `functions/messaging/store.js` | Same |
| A3 | Audit cleanup loads all matching old docs then batch-delete (no pagination loop) | `functions/index.js` `cleanupOldAuditLogs` | Can fail/hit limits if backlog large |
| A4 | Client duplicate detection scans in-memory leads instead of server query | `useLeadsStore.ts` | Only correct if full collection is loaded (reinforces F1) |

Prefer: normalized phone field + equality query (already used in parts of `functions/index.js`), and keep Evolution on that path.

---

## Performance report (condensed)

| Area | Current grade | Notes |
| --- | --- | --- |
| Messaging queries/indexes | B+ | Limited + indexed |
| Core CRM data sync | D | Full-collection leads/attendance/audit/notifications |
| UI pagination | C | Cosmetic only (client slice) |
| Timeline UI | B- | Capped query; dual legacy render; no virtualization |
| Dashboard load | C- | Lazy tabs, eager listeners + full scans |
| Bundle / code-split | B | Routes/tabs lazy; no analyzer/manualChunks |
| Cloud Functions matching | C | Phone scans in messaging path |
| Scalability headroom | Low–medium | Needs query scoping before 5k–10k+ leads |

---

## Optimization opportunities (priority order)

No architecture rewrite required to start — incremental hardening:

### P0 — High impact, low conceptual risk

1. **Scope lead listener by role**  
   - Agents: `where('assignedTo','==', uid)` (+ optional `orderBy`/`limit`).  
   - Managers: keep broader query but add `limit` + cursor or project/team filters.  
   - Paths: `DatabaseContext.tsx`, `firestore.indexes.json` (add composites).

2. **Stop loading full `auditLogs` when only `logAuditEvent` is needed**  
   - Split write API from list subscription; subscribe only on Audit settings tab.  
   - Path: `useAuditLogsStore.ts`, `Dashboard.tsx`.

3. **Notifications: `where('userId','==', uid)` (+ shared announcements query)**  
   - Path: `useNotificationsStore.ts` + index if compound with `createdAt`.

4. **Attendance: prefer today’s docs / date-range query** instead of full history for telecaller dashboard.  
   - Path: `useAttendanceStore.ts`.

### P1 — Medium

5. **Cap audit/attendance/archived listeners** with `orderBy` + `limit` + “load more”.  
6. **Timeline/messages “load older”** via `startAfter` cursors; keep default window small (50–100).  
7. **Defer legacy `callLogs` panel** (collapsed by default; or hide when timeline has events).  
8. **Dashboard: mount widget/admin stores only when tab/widget visible** (lazy store hooks).  
9. **Fix Evolution `findLeadByPhone`** to use indexed `phone` / `phoneDigits` equality like `functions/index.js`.

### P2 — Bundle / UX polish

10. Add `rollup-plugin-visualizer` (or `vite-bundle-visualizer`) + `npm run analyze`.  
11. `manualChunks` for `firebase/*` vs app feature chunks.  
12. Lazy-load modal registry components.  
13. Consider list virtualization for leads kanban/table and timeline if windows grow.  
14. Precompute daily agent metrics (Cloud Function / scheduled docs) to avoid client `leads × callLogs` scans.

### Data-model (recommend, do not rewrite now)

15. Migrate `callLogs` off lead documents into `timelineEvents` / `callLogs` subcollection over time (timeline already points this direction in `timelineTypes.ts`).  
16. Store `phoneDigits` / E.164 consistently for O(1) match.

---

## Scalability recommendations

| Horizon | Lead volume (order of magnitude) | Recommendation |
| --- | --- | --- |
| Now | Hundreds | Monitor snapshot payload size; collapse legacy timeline; stop audit fan-out on dashboard |
| Near | ~1–3k leads | Role-scoped lead queries; date-scoped attendance; notification query; phone index on messaging path |
| Medium | 5k–20k+ | Server-side pagination for admin lead bin; metrics aggregation docs; archive out of hot path; consider removing full `DatabaseProvider` leads array |
| Large | 50k+ | Dedicated list/query APIs or Algolia/Typesense for search; strict per-view subscriptions; no full-collection client sync |

### Operational metrics to track

- Firestore read ops / DAU  
- p95 size of `leads` snapshot (bytes)  
- Dashboard time-to-interactive after login  
- Vite chunk sizes on `npm run build` (and OTA zip size)  
- Cloud Function duration for WhatsApp inbound lead match  

---

## Path index (key files)

| Concern | Paths |
| --- | --- |
| Full leads sync | `telecaller-app/src/shared/services/DatabaseContext.tsx`, `…/leads/hooks/useLeadsStore.ts` |
| Indexes | `telecaller-app/firestore.indexes.json` |
| Timeline | `…/messaging/hooks/useTimelineEvents.ts`, `…/leads/components/LeadInteractionHistory.tsx` |
| WhatsApp | `…/messaging/hooks/useWhatsAppMessages.ts`, `useWhatsAppConversations.ts` |
| Dashboard fan-out | `…/dashboard/pages/Dashboard.tsx`, `…/dashboard/components/DashboardTabContent.tsx` |
| Lazy routes | `telecaller-app/src/App.tsx`, `…/admin/pages/Admin.tsx` |
| Client pagination | `telecaller-app/src/shared/components/DataTable.tsx` |
| Bundle config | `telecaller-app/vite.config.js`, `telecaller-app/package.json` |
| Backend scans | `telecaller-app/functions/messaging/providers/evolution.js`, `…/messaging/store.js` |
| Audit cleanup | `telecaller-app/functions/index.js` (`cleanupOldAuditLogs`) |

---

## Out of scope / non-goals (this phase)

- No architecture rewrite  
- No code changes in this deliverable  
- No production load test executed (static code + config audit only)

---

## Suggested Wave 6 follow-ups

1. Implement P0 items (scoped leads, audit split, notifications query, attendance range).  
2. Add composite indexes when introducing those queries.  
3. Add bundle analyzer CI check (fail on unexpected chunk growth).  
4. Align Evolution phone lookup with indexed queries used elsewhere in Functions.
