# Wave 6 Phase 1 — Agent 2: Timeline Intelligence Audit

**Scope:** Read-only audit of timeline architecture, publishers, legacy shapes, and domain coverage (calls, WhatsApp, notes, bookings, follow-ups).  
**Deliverable:** This document only. **No** app code, Firestore schema, security rules, indexes, or Timeline Engine changes.  
**App root:** `telecaller-app/`  
**Prior intent (unchanged):** `directives/whatsapp_evolution.md` — `timelineEvents` is source of truth for **new** CRM activity; legacy `callLogs` remain display-compatible; no bulk backfill in V1.

---

## 1. Executive verdict

The timeline stack already exists as a **lightweight immutable activity stream** (`timelineEvents`) with typed events, a client recorder, a Cloud Functions twin, a live subscriber hook, and a dual-pane Lead Timeline UI. Coverage is **partial and uneven**: lead lifecycle + WhatsApp (via messaging store) are on the canonical path; most operational CRM actions still go through **`logCall` → `leads.callLogs[]` string tags**, with best-effort heuristic timeline side-effects. That produces **missing domain events**, **duplicate/noisy emissions**, and **legacy/canonical dual display** for the same human action.

Wave 6 Timeline Intelligence should treat this as a **normalization + publisher-discipline** problem, not a greenfield engine rewrite.

---

## 2. Current architecture (as implemented)

### 2.1 Layers

| Layer | Role | Path(s) |
| --- | --- | --- |
| **Types (client contract)** | `TimelineEventType`, `TimelineEventSource`, `TimelineEventIcon`, `TimelineEvent` | `telecaller-app/src/features/messaging/timelineTypes.ts` |
| **Client recorder** | `addDoc` → `timelineEvents`; summary capped 200; fire-and-forget errors | `telecaller-app/src/features/messaging/services/recordTimelineEvent.ts` |
| **Client reader** | `onSnapshot` `where leadId` + `orderBy timestamp desc` + limit | `telecaller-app/src/features/messaging/hooks/useTimelineEvents.ts` |
| **Barrel export** | Types + recorder + hook re-exported from messaging feature | `telecaller-app/src/features/messaging/index.ts` |
| **Server store twin** | Duplicate `TIMELINE_ICONS` + `recordTimelineEvent` + WhatsApp `writeMessage` publisher | `telecaller-app/functions/messaging/store.js` |
| **Inbound WA lead create** | Creates lead + `lead_created` timeline event | `telecaller-app/functions/messaging/providers/evolution.js` (`ensureLeadForInbound`) |
| **Callable send** | Provider send → `writeMessage` (messages + timeline; **no callLogs**) | `telecaller-app/functions/index.js` (`messagingSend`) |
| **Primary CRM publisher** | Side-effects on `addLead` / `updateLead` / `logCall` | `telecaller-app/src/features/leads/hooks/useLeadsStore.ts` |
| **Lead persistence of legacy logs** | `arrayUnion` into `leads.callLogs`; also overwrites `notes` / `status` / `followUpDate` | `telecaller-app/src/shared/services/firebase/repositories.ts` (`LeadsRepository.logCall`) |
| **UI consumer** | Primary activity stream + collapsible legacy callLogs | `telecaller-app/src/features/leads/components/LeadInteractionHistory.tsx` |
| **Host surface** | History tab on Lead Detail | `telecaller-app/src/features/leads/pages/LeadDetailsPage.tsx` |
| **Rules** | Auth create/read; **immutable** (no update/delete) | `telecaller-app/firestore.rules` (`match /timelineEvents/{eventId}`) |
| **Index** | `leadId` ASC + `timestamp` DESC | `telecaller-app/firestore.indexes.json` |

### 2.2 Intended data model (already documented)

From `directives/whatsapp_evolution.md` and `timelineTypes.ts`:

- **Canonical collections:** `whatsappConversations`, `whatsappMessages`, `timelineEvents`
- **Timeline events:** refs + short `summary` only — never full message/note/call bodies
- **Immutable after create**
- **Lead Timeline UI:** (1) `timelineEvents` primary (2) legacy `callLogs` section
- **No bulk migration** of historical `callLogs` → `timelineEvents` in V1

### 2.3 Event type inventory

Defined in `telecaller-app/src/features/messaging/timelineTypes.ts`:

| Type | Icon | Intended meaning |
| --- | --- | --- |
| `whatsapp_inbound` | message | Inbound WA message |
| `whatsapp_outbound` | message | Outbound WA message |
| `call_completed` | phone | Completed / logged call |
| `note_added` | note | Free-form note |
| `lead_status_changed` | status | Pipeline status change |
| `lead_assigned` | user | First assignment |
| `lead_reassigned` | user | Reassignment |
| `followup_created` | calendar | Follow-up date set/changed |
| `followup_completed` | check | Follow-up cleared |
| `lead_created` | plus | Lead created |
| `lead_converted` | star | Conversion (typed but unused — see §4) |
| `lead_booked` | star | Booked / won-ish status (regex heuristic) |

Sources: `whatsapp` \| `call` \| `note` \| `lead` \| `followup` \| `system`.

---

## 3. Publisher map (who writes what)

### 3.1 Canonical publishers (typed → `timelineEvents`)

| Publisher | Events | Path | Notes |
| --- | --- | --- | --- |
| `useLeadsStore.addLead` | `lead_created` | `.../hooks/useLeadsStore.ts` | Also seeds legacy `callLogs: [{ note: "Lead created." }]` |
| `useLeadsStore.updateLead` | `lead_status_changed` / `lead_booked`, `lead_assigned` / `lead_reassigned`, `followup_created` / `followup_completed`, `note_added` | same | Diff-based vs previous in-memory lead |
| `useLeadsStore.logCall` | Heuristic `call_completed` **or** `note_added`; optional status + follow-up | same | Classification via note text / `duration` |
| Messaging `writeMessage` | `whatsapp_inbound` / `whatsapp_outbound` | `functions/messaging/store.js` | Sets `sourceId` / `messageId` / `conversationId` correctly |
| Evolution inbound lead | `lead_created` | `functions/messaging/providers/evolution.js` | Empty `callLogs: []` on new WA lead |

### 3.2 Legacy publishers (string-tagged → `leads.callLogs` via `logCall`)

These are the dominant operational paths. Most still rely on bracketed note prefixes; timeline coverage is incidental via `logCall` heuristics.

| Domain | Tag / pattern | Example path(s) |
| --- | --- | --- |
| Calls | `[Call Log - Duration: …]` `[Disposition: …]` | `CallLogModal.tsx`, `LeadDetailsPage.tsx`, `ProjectMap.tsx`, `useDashboardDialer.ts` |
| WhatsApp (legacy client) | `[WhatsApp Sent]` | `WhatsAppAssistant.tsx` — **still writes callLogs** (conflicts with `whatsapp_evolution.md` “no new WhatsApp writes to callLogs”) |
| Site visit / booking ops | `[Site Visit Scheduled]` / `[Site Visit Cancelled]` | `SiteVisitScheduler.tsx` (also `updateLead({ siteVisit })` then `logCall`) |
| Pipeline UI | `[Pipeline Transition\|Reopened\|Closed]` | `LeadDetailsPage.tsx` |
| Discount | `[Discount Request Filed\|Approved\|Rejected…]` | `DiscountManager.tsx`, `PendingDiscountsApprovals.tsx`, `AdminDashboard.tsx` |
| Campaign | `[Campaign - CHANNEL]` | `CampaignBroadcastModal.tsx` |
| System / merge / ingest | free text / “Duplicate lead…” | `useLeadsStore` duplicate merge, `functions/index.js` webhook + bulk CSV |

### 3.3 Paths that mutate lead state **without** timeline events

| Path | Gap |
| --- | --- |
| `useLeadsStore.bulkUpdateLeads` → `LeadsRepository.bulkUpdate` | Bulk status / assign / field updates emit **zero** timeline events |
| `useLeadsStore.bulkAddLeads` | Creates leads + callLogs only — **no** `lead_created` |
| `useLeadsStore.mergeLeads` | Merges callLogs/notes; deletes source — **no** merge / reassign / note events |
| `useLeadsStore.addLead` duplicate branch | Appends callLog only — **no** timeline |
| Webhook / bulk ingest in `functions/index.js` | Writes `callLogs` only — **no** `timelineEvents` |
| `LeadsRepository.rateCallLog` / admin call quality | Mutates nested callLog rating — **no** timeline (acceptable if ratings stay on source entity; document as out-of-band) |
| Archive | No timeline tombstone |

---

## 4. Domain coverage audit

### 4.1 Calls

| Aspect | Finding |
| --- | --- |
| **Source of truth (body)** | Still `Lead.callLogs[]` (`telecaller-app/src/features/leads/types/index.ts`) — structured fields `duration`, `callType`, `picked`, `disposition` exist but many writers only encode duration in the **note string** |
| **Timeline** | `call_completed` when `logCall` detects duration / “call log” / “disposition” / “duration” in note |
| **Gaps** | No stable `sourceId` linking timeline → callLog entry; no dedicated call entity collection; rating updates invisible on timeline |
| **UI** | Canonical stream shows summary; legacy pane still needed for recording player duration parse + historical rows (`LeadInteractionHistory.tsx`) |

### 4.2 WhatsApp

| Aspect | Finding |
| --- | --- |
| **Canonical path** | `messagingSend` / inbound webhook → `store.writeMessage` → `whatsappMessages` + `whatsapp_*` timeline (good: refs + summary only) |
| **Legacy path still live** | `WhatsAppAssistant.tsx` opens `web.whatsapp.com` and `logCall`s `[WhatsApp Sent]` into callLogs → heuristic usually yields `note_added` (not `whatsapp_outbound`) |
| **Inbox legacy reads** | `WhatsAppInboxView.tsx` / dashboard widgets still scrape `[WhatsApp` from callLogs for stats/history |
| **Duplicate risk** | Same lead can show WA in timeline (provider) **and** legacy callLogs (assistant/template logger) |

### 4.3 Notes

| Aspect | Finding |
| --- | --- |
| **Two note concepts** | (1) `Lead.notes` field overwrite via `updateLead` → `note_added`; (2) free-text `logCall` notes classified as `note_added` when not “call-like” |
| **Side effect** | `LeadsRepository.logCall` sets `notes: log.note` — every call/log **overwrites** the lead’s notes field with the latest log text |
| **Gaps** | No note entity id; `sourceId` often set to `leadId` or omitted; site-visit/discount/campaign strings misclassified as notes |

### 4.4 Bookings / conversion / site visits

| Aspect | Finding |
| --- | --- |
| **`lead_booked`** | Emitted when status matches `/book\|convert\|won\|sale/i` in `updateLead` or `logCall` |
| **`lead_converted`** | Declared in types + server icons — **never published** anywhere in app/functions |
| **Site visits** | Stored on `Lead.siteVisit`; logged as tagged callLogs; timeline gets status/follow-up/note heuristics — **no** `site_visit_*` type |
| **Filters** | `LeadInteractionHistory` tabs: All / Calls / WhatsApp / System — **no** Bookings / Notes / Follow-ups tabs |

### 4.5 Follow-ups

| Aspect | Finding |
| --- | --- |
| **Fields** | `followUpDate` + legacy alias `followUpOn` on `Lead` |
| **Timeline** | `updateLead` diffs correctly (create vs clear → completed); `logCall` emits `followup_created` whenever `followUpDate` is truthy — **even if unchanged** |
| **Site visit** | Scheduler sets follow-up to visit date via `logCall`, amplifying duplicate follow-up events alongside `updateLead` (if follow-up also patched) |

---

## 5. Missing / duplicate / noisy events

### 5.1 Missing (recommended new or first-class types)

| Gap | Why it matters | Suggested type / approach |
| --- | --- | --- |
| Site visit scheduled / cancelled / completed | High-signal CRM milestone; currently string-in-callLog | `site_visit_scheduled`, `site_visit_cancelled` (source: `lead` or new `booking`) |
| Discount requested / approved / rejected | Admin workflow invisible as typed events | `discount_requested`, `discount_resolved` |
| Lead merged | Compliance + history integrity | `lead_merged` (metadata: `sourceLeadId`) |
| Bulk create / webhook create | Volume onboarding invisible on stream | Reuse `lead_created` from server ingest paths |
| Bulk status / assign | Team ops blind spot | Reuse status/assign publishers inside bulk loop **or** batch summary event |
| Campaign / SMS / Email outbound | Tagged callLogs only; filters treat SMS/Email as legacy | `campaign_sent` or channel-specific types; stop stuffing into callLogs |
| `lead_converted` vs `lead_booked` | Dead type vs regex-booked | Collapse to one canonical type **or** map distinct statuses |
| Message status transitions | Delivery/read updates mutate `whatsappMessages` only | Optional later: do **not** spam timeline; keep on message doc |

### 5.2 Duplicates / noise (current)

| Pattern | Mechanism | Example |
| --- | --- | --- |
| **Double stream for new actions** | `logCall` writes callLogs **and** timeline | Every post-cutover call appears in Activity stream **and** Legacy history |
| **Site visit double path** | `updateLead({ siteVisit })` then `logCall(...)` | Status/follow-up/note events + legacy tag row |
| **Follow-up on every logCall** | `if (followUpDate) record followup_created` without prev compare | Re-logging a call with same FU date re-emits |
| **Status via logCall + updateLead** | Pipeline buttons / discount flows often both | Two status events for one user intent |
| **WA dual channel** | Provider timeline + `WhatsAppAssistant` callLog | Outbound counted differently across surfaces |
| **Heuristic misfires** | Note containing “duration” without being a call | Mis-typed `call_completed` |
| **lead_booked over-match** | Regex on any status string | Accidental booked events |

### 5.3 Dead / inconsistent contract pieces

- `lead_converted` unused; `lead_booked` used via regex — contract drift between `timelineTypes.ts` and publishers.
- Client recorder (`recordTimelineEvent.ts`) and server (`store.js`) **duplicate** icon maps and field defaults — drift risk for Agent 0.
- Timeline lives under **messaging** feature folder though it is CRM-wide (calls, notes, assign, etc.).

---

## 6. Legacy shape inventory (`callLogs`)

### 6.1 Structural shape

`CallLog` in `telecaller-app/src/features/leads/types/index.ts`:

- Core: `date`, `note`, `status`, `agent`
- Optional structured: `duration`, `callType`, `picked`, `disposition`, `rating`, `qualityScore`, `feedback`, `followUpDate`, …

### 6.2 Informal polymorphism (note prefixes)

Parsed ad hoc in `LeadInteractionHistory.tsx`, dashboards, call history, inbox:

| Prefix | Interpreted as |
| --- | --- |
| `[Call Log - Duration: …]` | Call (+ optional recording player) |
| `[WhatsApp Sent\|Received]` | WhatsApp |
| `[SMS Sent]` / `[Email Sent]` | SMS / Email |
| `[System…]` / `[Pipeline…]` / `[Discount…]` | System |
| `[Site Visit …]` | Booking ops (not a first-class filter) |
| `[Campaign - …]` | Broadcast |
| Untagged text | Generic note / call fallback |

This is the **legacy event bus**. Timeline Intelligence should stop extending it.

### 6.3 Compatibility policy (confirm for Wave 6)

Aligned with `directives/whatsapp_evolution.md`:

1. Keep legacy pane **read-only** for historical rows.
2. **No new WhatsApp** (or ideally no new non-call) writes to `callLogs`.
3. **No bulk backfill** into `timelineEvents` in V1.
4. New activity must be understandable from `timelineEvents` alone for leads created/touched after cutover.

---

## 7. Architecture proposal (Timeline Intelligence)

### 7.1 Target mental model

```
Domain action (call | WA | note | follow-up | assign | status | site visit | discount | merge)
        │
        ▼
  Source entity write (lead fields / callLogs entry / whatsappMessages / future notes)
        │
        ▼
  Shared Timeline Publisher API  ──►  timelineEvents/{id}  (immutable, refs + summary)
        │
        ▼
  LeadInteractionHistory  (single merged UX; legacy section = historical only)
```

**Principle:** Timeline is a **projection**, not a second mutable store of bodies. Publishers are deterministic; UI never parses bracket tags for new events.

### 7.2 Ownership islands (freeze for multi-agent Wave 6)

| Island | Owner | Path |
| --- | --- | --- |
| Event contract | Agent 0 | `timelineTypes.ts` (+ server mirror or shared package later) |
| Recorder API | Agent 0 | `recordTimelineEvent` + typed helpers |
| Messaging → timeline | Messaging / Functions | `functions/messaging/store.js` `writeMessage` |
| Lead lifecycle publishers | Leads store | `useLeadsStore.ts` (replace heuristics over time) |
| Timeline UI | Lead Detail | `LeadInteractionHistory.tsx` |
| Legacy callLogs | Compatibility only | `LeadsRepository.logCall` — shrink writers |

### 7.3 Recommended event taxonomy (Wave 6+)

**Keep:** existing types in `timelineTypes.ts` (minus resolving `lead_converted` / `lead_booked`).

**Add (minimal set):**

- `site_visit_scheduled` / `site_visit_cancelled`
- `discount_requested` / `discount_resolved` (metadata: `outcome`)
- `lead_merged` (metadata: `sourceLeadId`, `targetLeadId`)

**Defer:** SMS/Email as first-class until channel product is real; until then map campaign logs to `note_added` with `metadata.channel` **or** a single `outbound_campaign` type.

### 7.4 Emission rules (normalization contract)

1. **One user intent → one primary timeline event** (status change is separate only when status actually changes).
2. **`sourceId` required** when a source entity exists (message id, callLog key, siteVisit stamp).
3. **Idempotency key** (recommended): `leadId + type + sourceId` (or hash) — skip duplicate creates on retries.
4. **Summary ≤ 120–200 chars**; bodies stay on source.
5. **Actor:** prefer `actorId` (uid) + `actorName`; stop `"system"` / `"telecaller"` ambiguity without ids.
6. **Never classify by scraping note text** in the recorder layer; callers pass explicit `type`.
7. **`logCall` remains the call persistence API** short-term, but must call typed `recordCallCompleted(...)` — not string heuristics.
8. **WhatsAppAssistant** must migrate to `messagingSend` / conversation APIs; stop callLogs WA writes.

### 7.5 UI evolution (presentation; later phase)

`LeadInteractionHistory.tsx` today:

- Primary: `useTimelineEvents(leadId, 150)`
- Legacy: filtered `activeLead.callLogs` with tag parsing
- Filters: all / calls / whatsapp / system

Proposed:

- Filter chips map to **`type` / `source`**, not note substrings (for canonical stream).
- Add Notes / Follow-ups / Bookings filters.
- Legacy section: default **collapsed** when `events.length > 0`; label as “Before timeline cutover”.
- Optional: hide legacy rows whose `date` is after first `timelineEvents` timestamp for that lead (presentation-only dedupe — no Firestore rewrite).

---

## 8. Normalization plan (phased; no code in this audit)

### Phase A — Contract freeze (Agent 0)

1. Freeze `TimelineEvent` / types / icon map as the shared API.
2. Document publish helpers signatures (below).
3. Decide `lead_booked` vs `lead_converted` (recommend: keep `lead_booked`; remove or alias `lead_converted`).
4. Add proposed new types to the contract doc before implementation agents touch publishers.

### Phase B — Stop the bleeding (publisher discipline)

1. Fix `logCall` follow-up emission to **diff against previous** follow-up date.
2. Pass explicit timeline type from call UI / site visit / discount / pipeline (no heuristics).
3. Retire `WhatsAppAssistant` callLogs write; route through messaging.
4. Emit `lead_created` from `bulkAddLeads` and server ingest (`functions/index.js`) — or accept documented exception.
5. Emit timeline from `bulkUpdateLeads` for status/assign changes (or document as deferred with product sign-off).

### Phase C — Domain completeness

1. Site visit / discount / merge typed events.
2. Ensure `sourceId` on call events (e.g. composite `callLogs` index or new callLog `id` field — **schema change requires separate scope**).
3. Align filters in `LeadInteractionHistory`.

### Phase D — Legacy containment

1. Inventory remaining `logCall` writers; classify call-only vs migrate-off-callLogs.
2. Keep legacy pane; do not backfill.
3. Dashboard/call-history consumers that scrape `[WhatsApp` should prefer `whatsappMessages` / timeline counts (separate wave if needed).

---

## 9. Agent 0 — shared-API recommendations

Agent 0 should own cross-cutting primitives so parallel Wave 6 agents do not fork timeline shapes.

### 9.1 Shared contract package (logical)

Keep physical files for now (avoid big move mid-wave), but treat as **CRM shared API**:

| Export | Path | Notes |
| --- | --- | --- |
| `TimelineEvent`, types, `TIMELINE_EVENT_ICONS` | `src/features/messaging/timelineTypes.ts` | Consider later relocate to `src/shared/timeline/` or `src/features/timeline/` — **decision only in Phase A** |
| `recordTimelineEvent` | `src/features/messaging/services/recordTimelineEvent.ts` | Low-level; keep thin |
| `useTimelineEvents` | `src/features/messaging/hooks/useTimelineEvents.ts` | Reader stays stable |
| Server mirror | `functions/messaging/store.js` | Must stay field-compatible; prefer generating from one source of truth long-term |

### 9.2 Typed publisher helpers (recommended Agent 0 surface)

Add (or specify for implementers) helpers that wrap `recordTimelineEvent` so feature agents never pass raw strings for `type`:

```ts
// Proposed API shape (do not implement in this audit)
recordLeadCreated(input)
recordLeadStatusChanged({ leadId, from, to, actor… })
recordLeadAssigned / recordLeadReassigned
recordFollowUpCreated / recordFollowUpCompleted
recordNoteAdded
recordCallCompleted({ leadId, sourceId?, duration?, callType?, disposition?, summary, actor… })
recordWhatsAppMessage  // server-owned today via writeMessage — client should not duplicate
recordSiteVisitScheduled / recordSiteVisitCancelled
recordDiscountRequested / recordDiscountResolved
recordLeadMerged
```

**Rule for consumers:** UI/feature code calls helpers; only helpers call `recordTimelineEvent`.

### 9.3 Field / metadata conventions (freeze)

| Field | Convention |
| --- | --- |
| `timestamp` | Event time (ISO); may differ from `createdAt` for backdated logs |
| `createdAt` | Write time (ISO) |
| `sourceId` | Stable id of source row/doc; required when available |
| `messageId` / `conversationId` | WhatsApp only |
| `metadata` | Flat scalars only (`string \| number \| boolean \| null`) — already typed |
| Status transitions | `metadata.from` / `metadata.to` |
| Follow-ups | `metadata.followUpDate` |
| Calls | `metadata.duration`, `callType`, `picked`, `disposition` |
| Booked | Prefer explicit status enum check over loose regex |

### 9.4 Idempotency & failure policy

- Client recorder currently **swallows errors** (`console.warn`, returns `null`) — Agent 0 should document whether Wave 6 keeps fire-and-forget or surfaces soft UI failure.
- Recommend optional `idempotencyKey` field (or deterministic doc id) before high-volume bulk publishers go live.
- Rules already enforce immutability — do not add update APIs.

### 9.5 What Agent 0 should **not** do in Wave 6 Phase 1

- No Firestore rules/index changes unless a concrete query defect blocks UI.
- No bulk migration tooling.
- No merging legacy callLogs into timeline in production.
- No redesign of WhatsApp provider stack (already canonical for WA).

### 9.6 Coordination with other agents

| Agent concern | Depends on Agent 0 |
| --- | --- |
| Lead Detail timeline UI polish | Stable types + filter semantics |
| Call logging UX | `recordCallCompleted` helper + `sourceId` guidance |
| Site visit / discount panels | New event types frozen first |
| Messaging inbox | Keep server `writeMessage` as sole WA timeline publisher |

---

## 10. File citation index (audit touchpoints)

| Concern | Path |
| --- | --- |
| Types | `telecaller-app/src/features/messaging/timelineTypes.ts` |
| Client recorder | `telecaller-app/src/features/messaging/services/recordTimelineEvent.ts` |
| Hook | `telecaller-app/src/features/messaging/hooks/useTimelineEvents.ts` |
| Barrel | `telecaller-app/src/features/messaging/index.ts` |
| Lead publishers | `telecaller-app/src/features/leads/hooks/useLeadsStore.ts` |
| Timeline UI | `telecaller-app/src/features/leads/components/LeadInteractionHistory.tsx` |
| Lead Detail host | `telecaller-app/src/features/leads/pages/LeadDetailsPage.tsx` |
| CallLog / Lead shapes | `telecaller-app/src/features/leads/types/index.ts` |
| Legacy persistence | `telecaller-app/src/shared/services/firebase/repositories.ts` |
| Server store | `telecaller-app/functions/messaging/store.js` |
| WA inbound lead | `telecaller-app/functions/messaging/providers/evolution.js` |
| messagingSend | `telecaller-app/functions/index.js` |
| Rules / index | `telecaller-app/firestore.rules`, `telecaller-app/firestore.indexes.json` |
| Prior product intent | `directives/whatsapp_evolution.md` |
| Legacy WA logger | `telecaller-app/src/features/leads/components/WhatsAppAssistant.tsx` |
| Site visit dual write | `telecaller-app/src/features/leads/components/SiteVisitScheduler.tsx` |
| Discount / campaign tags | `DiscountManager.tsx`, `PendingDiscountsApprovals.tsx`, `CampaignBroadcastModal.tsx` |

---

## 11. Suggested Wave 6 acceptance criteria (for later phases)

1. New calls, WA (provider), notes, status, assign, follow-ups appear on **Activity stream** with correct `type` — without relying on note-prefix parsing.
2. `WhatsAppAssistant` (or successor) does **not** append `[WhatsApp Sent]` to `callLogs`.
3. `logCall` timeline side-effects are **explicit-typed**, not heuristic.
4. Follow-up events only fire on **actual date change**.
5. Site visit / discount / merge either have typed events **or** are explicitly listed as deferred residuals.
6. Legacy pane remains available; no bulk backfill required for PASS.
7. Client and Functions timeline payloads remain field-compatible (Agent 0 contract test / checklist).

---

## 12. Out of scope (this audit)

- Implementing publishers, UI changes, or schema migrations
- Changing Timeline Engine / Firestore rules / indexes
- Backfilling historical `callLogs`
- Dashboard metric rewrites that still scrape callLog WhatsApp tags (flagged only)

---

*End of Wave 6 Agent 2 Timeline Intelligence Audit.*
