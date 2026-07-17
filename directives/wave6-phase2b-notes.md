# Wave 6 Phase 2B — Timeline Normalization Notes

**Status:** Complete — awaiting validation gate  
**Date:** 2026-07-14  
**App:** `telecaller-app/`  
**Authorization:** Phase 2A PASS + user "yes"  
**DLS:** unchanged (v1.4)  
**Contract edits:** None required (extended store API only)

---

## Goal

One intentional timeline emit path per user action for high-traffic CRM flows; finish typed coverage for remaining `logCall` leftovers; keep WhatsApp deep-link/campaign paths from reintroducing callLogs-as-WA; add easy `sourceId` / `idempotencyKey` without schema redesign.

---

## What changed

### 1. Stop duplicate publishers

| Path | Before | After |
| --- | --- | --- |
| `CallLogModal` | `logCall(status, followUp)` **and** `updateLead(status, followUp, priority)` → double status + FU | `logCall` owns status/FU/call; `updateLead({ priority })` only |
| `LeadDetailsPage` call submit | Already priority-only after `logCall` | Explicit `timelineActivity: "call"` + WA deep-link comment |
| `MergeSettingsTab` | `updateLead` (notes/callLogs) → `note_added` **plus** `publishLeadMerged` | `updateLead(..., { suppressTimeline: true })` + single `publishLeadMerged` |

Site-visit schedule still emits status (via `updateLead`) + `publishSiteVisitScheduled` — intentional dual primary domain events (Phase 2A R6).

### 2. Typed `logCall` coverage

`LogCallPayload.timelineActivity?: "call" | "note" | "none"` — explicit intent wins; heuristics remain only for legacy callers.

| Caller | Activity |
| --- | --- |
| `CallLogModal`, `LeadDetailsPage`, `ProjectMap` | `"call"` |
| `LeadsTableRow` dialer initiate | `"none"` (callLogs row only; no `note_added` spam); also passes `status: lead.status` |

Calls now publish with `sourceId: call:{leadId}:{isoDate}` and matching `idempotencyKey`.

### 3. WhatsApp discipline

| Path | Status |
| --- | --- |
| `WhatsAppAssistant` | Unchanged — deep-link only (2A) |
| Lead Detail auto-WA checkbox | Deep-link only; comment forbids callLogs/`[WhatsApp Sent]` |
| `CampaignBroadcastModal` | Still `publishNoteAdded` audit (`kind=campaign_dispatch`); **no** callLogs / `whatsapp_*` |
| Legacy `[WhatsApp` **readers** | Left intact for historical rows |

### 4. Idempotency / sourceId (easy)

| Domain | Keys |
| --- | --- |
| Calls | `sourceId` + `idempotencyKey` from call timestamp |
| Site visit schedule/cancel | `sv:…` / `sv-cancel:…` + deterministic keys |
| Discount request/approve/reject | `discount:{leadId}:{state}` + amount-scoped keys |
| Campaign dispatch | batch ISO + per-lead channel key |
| Merge | `lead_merged_{target}_{source}` |

### 5. Timeline UI (trivial correctness only — not a redesign)

`LeadInteractionHistory`:

- Legacy pane **defaults collapsed** when activity stream has events (override via toggle; no `useEffect` setState)
- System filter includes `site_visit_*`, `discount_*`, `lead_merged`, `lead_booked`, sources `site_visit` / `discount`
- Icons for `map` / `tag` / `merge`

### 6. Store API extension (not shared contracts)

```ts
updateLead(id, fields, options?: { suppressTimeline?: boolean })
logCall(..., { timelineActivity?: "call" | "note" | "none" })
```

No changes to `@/shared/contracts/timelinePublisher` signatures.

---

## Explicitly deferred / residuals

| Item | Notes |
| --- | --- |
| Bulk create / bulk update / webhook timeline | Still no `lead_created` / status events |
| Historical callLogs → timeline backfill | Forbidden |
| Site-visit dual status + domain event | Intentional; product may collapse later |
| Legacy WA scrapers in CallsTab / widgets | Readers only |
| Notification helper adoption | Phase 2A R1 residual |
| Automation / AI / Phase 2C | Forbidden until authorized |
| DLS bump | Not in scope |

---

## Files touched

- `src/features/leads/hooks/useLeadsStore.ts`
- `src/features/calls/components/CallLogModal.tsx`
- `src/features/leads/pages/LeadDetailsPage.tsx`
- `src/features/leads/components/LeadsTableRow.tsx`
- `src/features/plots/pages/ProjectMap.tsx`
- `src/features/leads/components/SiteVisitScheduler.tsx`
- `src/features/leads/components/DiscountManager.tsx`
- `src/features/leads/components/PendingDiscountsApprovals.tsx`
- `src/features/admin/pages/AdminDashboard.tsx`
- `src/features/leads/components/CampaignBroadcastModal.tsx`
- `src/features/admin/components/settings/MergeSettingsTab.tsx`
- `src/features/admin/components/AdminSettingsTabs.tsx`
- `src/features/leads/components/LeadInteractionHistory.tsx`

---

## STOP

Do **not** start Phase 2C / 2D / Phase 3 without authorization.
