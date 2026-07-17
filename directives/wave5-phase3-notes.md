# Wave 5 Phase 3 — Consolidated Notes (Consumer Adoption)

**Date:** 2026-07-13  
**Scope:** High-value overlay consumers adopt Phase 2 shared `Modal` / `Dialog` / `Drawer`  
**Primitives:** Shared Modal / Dialog / Drawer **frozen** (imported only; not edited)  
**DLS:** **v1.3** unchanged (no v1.4 / no `ui-registry.md` edits)  
**Agents:** 1–4 complete — this file consolidates their reports

---

## Verdict

**Phase 3 consumer adoption DONE.** High-traffic Modal hosts, Dialog alert/confirm sites, Drawer consumers, and legacy overlay shells now sit on the Phase 2 overlay contract. No business-logic / Firestore / routing / schema changes claimed. Residuals documented below. **STOP** — Phase 4 runtime QA and DLS v1.4 await authorization.

---

## Migrated consumers by agent

### Agent 1 — Template & Import

| Consumer | Adoption |
| --- | --- |
| `TemplateCenterModal.tsx` | Custom overlay → `Modal` `variant="sheet"` `size="2xl"`; Copy / WhatsApp via Modal footer; split list + preview IA preserved |
| `BulkLeadImportModal.tsx` | Custom overlay → centered `Modal` `size="lg"`; FormActions footer; all `alert()` → `Dialog` (swap Modal ↔ Dialog, never stack) |

Wizard / CSV map / ingest / template copy logic unchanged.

### Agent 2 — Dialog adoption (alert / confirm)

High-value native `alert` / `confirm` → shared `Dialog` (alert-only: `cancelLabel="OK"`; destructive: `confirmVariant="danger"`). Outcomes identical.

| Area | Files |
| --- | --- |
| Admin settings / users / projects | `RolesSettingsTab`, `AdminUsersTab`, `AdminProjectsTab`, `CustomFieldsSettingsTab` |
| Admin dashboard / leads | `AdminDashboard`, `AdminLeadsTab` + `useAdminLeads` (Dialog state) |
| Dashboard / attendance | `DashboardHeader`, `MobileStatusPanel`, `AttendanceTab` |
| Leads table / bulk / pipeline | `LeadsTableRow`, `BulkActionsPanel`, `LeadPipelineTracker` |
| Lead detail / tools | `LeadDetailsPage`, `PendingDiscountsApprovals`, `LeadBinWorkspace` (permanent-delete confirm only), `SiteVisitScheduler`, `DiscountManager`, `LoanEMICalculator` |

### Agent 3 — Drawer adoption

| Consumer | Adoption |
| --- | --- |
| `CustomizerDrawer.tsx` | Shared `Drawer` (right / md); reset `confirm` → `Dialog` (danger); drawer gated off while Dialog open |
| `MobileProfileDrawer.tsx` | Shared `Drawer` (bottom / lg + `pb-safe`); account actions unchanged |
| `DialPadDrawer.tsx` | **ADOPTED** shared Drawer chrome + a11y/theme; specialized telephony UX kept inside (keypad, DTMF, lead match, quick-create, Call CTA) |

### Agent 4 — Legacy overlay cleanup

| Consumer | Adoption |
| --- | --- |
| `CallAuditRatingModal.tsx` | → `Modal`; alerts → `Dialog`; `closeOnBackdrop={false}` preserved |
| `ShortcutsModal.tsx` | → `Modal` `variant="sheet"`; theme tokens; decorative footer muted |
| `MergeSettingsTab.tsx` | Merge assistant → `Modal` `size="2xl"`; alerts → `Dialog`; `closeOnBackdrop={false}` |
| `LeadListMobileFilterSheet.tsx` | → `Modal` `variant="sheet"` (`md:hidden` host); draft → Search / Reset unchanged |
| `LeadBinWorkspace.tsx` | Inline mobile filter sheet → same sheet Modal pattern; bulk selection bar untouched |

---

## Residuals

| Residual | Count / notes | Blocker for Phase 4? |
| --- | --- | --- |
| Native `alert` / `confirm` still outside high-value set | **45** sites (map editor ~20, targets 7, training 6, integrations 4, map UI 5, roster/profile/project form 3) | No — follow-up pass |
| `useBrandingSettings.ts` alerts | **13** (customizer-adjacent; not converted in Phase 3 Drawer pass) | No |
| TemplateCenter body padding bleed | `-mx-6 -my-5` until Modal flush/custom-body slot | No |
| Filter sheet padding | Modal `px-6` roomier than prior dense `px-3` | No |
| DialPad specialized UX | Intentional — Drawer shell + telephony interior kept | No |
| Nested overlay swap pattern | Import / Customizer hide host while Dialog open (a11y trap hygiene) | No — presentation only |
| Modal sheet breakpoint | Shared Modal sheet uses `sm:` (prior TemplateCenter used `md:`) | No — inherit |
| Dialog chrome for alerts | Always Cancel + Confirm; both dismiss (not single-button OS alert) | No |
| LeadBin bulk selection bar | Still custom floating chrome; not a filter sheet | No |
| Star fill color (CallAudit) | `text-amber-500` semantic rating cue retained | No |
| Runtime smoke | Esc / Tab trap / return-focus / light-dark / nested Select — Phase 4 human pass | Recommended in Phase 4 |

**Remaining native alert/confirm residuals: 45** (plus 13 branding-hook sites = 58 total still using `alert`/`confirm`).

---

## Accessibility inheritance (from Phase 2 primitives)

Migrated hosts inherit without re-implementing:

| Contract | Source |
| --- | --- |
| Focus trap (Tab cycles inside panel) | `useOverlayFocus` via Modal / Drawer |
| Initial focus + return focus to opener | Same hook |
| Escape dismiss | Modal / Drawer (Dialog composes Modal) |
| Backdrop dismiss (with opt-out) | `closeOnBackdrop`; preserved `false` on CallAudit / Shortcuts / Merge |
| `role="dialog"` / `aria-modal` / labelledby | Shared Modal / Drawer |
| Optional `aria-describedby` | Wired where hosts pass `descriptionId` |
| Labeled close + theme tokens | Shared chrome |

No new Sheet primitive; sheet surfaces use `Modal variant="sheet"`.

---

## Explicit non-claims / non-goals

- **No business logic changes** — handlers, success/failure outcomes, destructive confirms, CSV/merge/rating/filter draft model, telephony dial/DTMF, Firestore, routing, schemas untouched
- **No shared primitive edits** — `Modal.tsx` / `Dialog.tsx` / `Drawer.tsx` frozen
- **No ModalHost / ModalRegistry** orchestration changes
- **No DLS v1.4** / imprint / `ui-registry.md` edits
- **No Phase 4** runtime QA or polish
- **No Phase 5** contract promotion

---

## Agent deliverable index

| Agent | Notes file |
| --- | --- |
| 1 | `directives/wave5-phase3-agent1-notes.md` |
| 2 | `directives/wave5-phase3-agent2-notes.md` |
| 3 | `directives/wave5-phase3-agent3-notes.md` |
| 4 | `directives/wave5-phase3-agent4-notes.md` |

---

## Critical judgment

Phase 3 collapses hand-rolled overlays and high-value native dialogs onto one Phase 2 stack. DialPad correctly adopted Drawer chrome while keeping specialized telephony interior. Lower-traffic alert/confirm and branding-hook sites remain intentional residuals. Stop here until Phase 4 is authorized.
