# Wave 6 Phase 2A — Agent 2 Notes
## Timeline Foundation (Feature Adoption)

**Status:** Phase 2A Agent 2 complete  
**Date:** 2026-07-13  
**App:** `telecaller-app/`  
**Import root:** `@/shared/contracts`  
**Constraint:** Did **not** modify `src/shared/contracts/*`  
**Forbidden (honored):** Timeline UI redesign, `LeadInteractionHistory` redesign, automation, contract edits

---

## Summary

Replaced remaining feature-layer heuristic `logCall` / callLogs-as-timeline paths with typed publishers from `@/shared/contracts`. Follow-up timeline remains **diff-only** (store-level from Agent 0; feature leftovers no longer re-pass unchanged FU dates through `logCall`). WhatsApp deep-link assistant no longer writes `[WhatsApp Sent]` to `callLogs`.

---

## Changes by domain

### 1. WhatsApp discipline

| Path | Before | After |
| --- | --- | --- |
| `WhatsAppAssistant.tsx` | `logCall` with `[WhatsApp Sent]` → heuristic `note_added` | Opens `web.whatsapp.com` only; **no** callLogs / client timeline write |
| `CampaignBroadcastModal.tsx` | `logCall` `[Campaign - WHATSAPP\|…]` into callLogs | `publishNoteAdded` with `metadata.kind=campaign_dispatch` (not WA messaging SoR) |
| `TemplateCenterModal.tsx` | Already deep-link only | Unchanged |

Canonical `whatsapp_*` timeline remains **server `writeMessage` only** (per Agent 0).

### 2. Typed domain publishers

| Domain | Publisher(s) | Files |
| --- | --- | --- |
| Site visit | `publishSiteVisitScheduled` / `publishSiteVisitCancelled` | `SiteVisitScheduler.tsx` |
| Discount | `publishDiscountRequested` / `Approved` / `Rejected` | `DiscountManager.tsx`, `PendingDiscountsApprovals.tsx`, `AdminDashboard.tsx` |
| Merge | `publishLeadMerged` | `useLeadsStore.mergeLeads`, `MergeSettingsTab.tsx` |
| Campaign | `publishNoteAdded` | `CampaignBroadcastModal.tsx` |

### 3. Follow-up diff-only (feature leftovers)

- **Store (Agent 0):** `publishFollowUpDiff` on `updateLead` / `logCall` — verified intact.
- **SiteVisitScheduler:** sets `followUpDate` via `updateLead` (diff-aware); **removed** `logCall(..., followUpDate)` that forced status/`interested` and duplicate FU noise.
- **Discount / campaign / cancel visit:** no longer pass unchanged `followUpDate` through `logCall`.
- **Pipeline / admin stage tracker:** Agent 1 already moved to `planStatusTransition` + `updateLead` only (no heuristic logCall) — left as-is.

### 4. Heuristic bleed stop (store guard)

`useLeadsStore.logCall` no longer classifies legacy bracket tags (`[WhatsApp`, `[Discount`, `[Campaign`, `[Site Visit`, `[Pipeline`, `[Admin Stage`) as `note_added`. Real calls still use `publishCallCompleted`; free-text notes still use `publishNoteAdded`.

### 5. Removed `logCall` props from domain UIs

`WhatsAppAssistant`, `DiscountManager`, `SiteVisitScheduler`, `PendingDiscountsApprovals`, `CampaignBroadcastModal`, and `AdminDashboard` discount handlers no longer take/use `logCall` for non-call activity.

---

## Explicitly deferred / out of scope

| Item | Owner / phase |
| --- | --- |
| `planSiteVisitConfirmedTransition` status write on schedule | Agent 1 (workflow) — scheduler no longer forces `interested` |
| `LeadInteractionHistory` icons for `map` / `tag` / `merge` | Fallback `FileText` OK; UI Phase 2B |
| Collapse legacy callLogs pane when timeline present | Phase 2B |
| Full messaging migration for campaign WA send | Later; campaign uses `note_added` audit only |
| Bulk ingest / webhook timeline | Deferred residual |
| Automation / notifications / query scopes | Agent 3 |

---

## Remaining legitimate `logCall` call sites

Call persistence only (expected):

- `LeadDetailsPage` call log form
- `CallLogModal`, `ProjectMap`, dialer / `LeadsTableRow` outbound

Legacy **read** scrapers still look for `[WhatsApp Sent]` in callLogs (`LeadInteractionHistory`, `CallsTab`, widgets) for historical rows — no new writers.

---

## Validation

From `telecaller-app/`:

- `npx tsc --noEmit` — **pass**

---

## Checklist vs Agent 0 migration (Agent 2)

- [x] Replace remaining raw / heuristic timeline writes in feature code with typed helpers
- [x] Stop WhatsAppAssistant → `callLogs` `[WhatsApp Sent]` writes
- [x] Emit `site_visit_*`, `discount_*`, `lead_merged` from domain paths
- [x] Follow-up emit only on actual date change (feature leftovers cleaned; store diff-only confirmed)
- [ ] UI icons / collapse legacy pane — Phase 2B (not 2A)

---

## STOP

Do not fork timeline types or call `recordTimelineEvent` with raw `type` strings from UI. Escalate contract gaps to Architecture Owner (Agent 0).
