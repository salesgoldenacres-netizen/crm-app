# Wave 5 Phase 3 — Agent 2 Notes: Dialog Adoption (alert/confirm)

**Date:** 2026-07-13  
**Owns:** High-value `window.alert` / `window.confirm` → shared `Dialog`  
**Constraint:** Shared Modal/Dialog/Drawer frozen. No business-logic changes. Handlers / success-failure / destructive outcomes identical.

---

## Conversions (this agent)

| File | What changed |
| --- | --- |
| `admin/components/settings/RolesSettingsTab.tsx` | Reserved-role alert, delete confirm, delete-failure alert → Dialog |
| `admin/components/AdminUsersTab.tsx` | Username/team validation alerts; user/team delete confirms; delete-failure alert → Dialog |
| `admin/components/AdminProjectsTab.tsx` | Duplicate-name alert; project delete confirm → Dialog |
| `admin/pages/AdminDashboard.tsx` | Force clock-out + discount approve/reject confirms → Dialog |
| `admin/components/AdminLeadsTab.tsx` | Host Dialogs for admin lead delete + export-denied (via hook state) |
| `admin/components/settings/CustomFieldsSettingsTab.tsx` | Validation/success alerts + remove-field confirm → Dialog |
| `dashboard/components/DashboardHeader.tsx` | Clock-out confirm → Dialog |
| `dashboard/components/MobileStatusPanel.tsx` | Clock-out confirm → Dialog |
| `attendance/components/AttendanceTab.tsx` | Clock-in-required alert + clock-out confirm → Dialog |
| `leads/components/LeadsTableRow.tsx` | Move-to-bin confirm → Dialog (portaled to `document.body`) |
| `leads/components/BulkActionsPanel.tsx` | Bulk move-to-bin confirm → Dialog |
| `leads/components/LeadPipelineTracker.tsx` | Stage-change confirm → Dialog |
| `leads/pages/LeadDetailsPage.tsx` | Call-log / dialer alerts; not-interested confirm → Dialog |
| `leads/components/PendingDiscountsApprovals.tsx` | Approve/reject confirms + result alerts → Dialog |
| `leads/components/LeadBinWorkspace.tsx` | Permanent delete confirm → Dialog only (mobile filter sheet left for Agent 4) |
| `leads/components/SiteVisitScheduler.tsx` | Schedule success alert + cancel confirm → Dialog |
| `leads/components/DiscountManager.tsx` | Submit success/failure alerts → Dialog |
| `leads/components/LoanEMICalculator.tsx` | Save quote success/failure alerts → Dialog |
| `leads/hooks/useAdminLeads.ts` | Delete confirm + export-denied alert → Dialog state for `AdminLeadsTab` |

**Pattern:** Alert-only Dialogs use `cancelLabel="OK"` (no `onConfirm`). Destructive confirms use `confirmVariant="danger"`. Outcomes unchanged.

---

## Skipped (other agents / ownership)

| Area | Reason |
| --- | --- |
| `BulkLeadImportModal.tsx`, `TemplateCenterModal.tsx` | Agent 1 |
| `CallAuditRatingModal`, `ShortcutsModal`, `MergeSettingsTab` | Agent 3 |
| `CustomizerDrawer`, `MobileProfileDrawer`, `DialPadDrawer` | Agent 4 |
| `useBrandingSettings.ts` (13 alert/confirm sites) | Customizer / Agent 4 |
| `LeadListMobileFilterSheet` + LeadBin **mobile sheet** chrome | Agent 4 (Agent 2 only converted permanent-delete confirm in workspace) |

---

## Deferred (still native alert/confirm — outside skip list)

Lower-traffic / hook-heavy / map-editor volume left for a follow-up pass:

- `useAdminMapEditor.ts` (~20)
- `AdminTargetsTab.tsx` (7), `AdminTrainingTabs.tsx` (6)
- `useIntegrationsSettings.ts` (4)
- `AdminMapSettings.tsx` (2), `AdminMapHeader.tsx` (1), `ProjectMap.tsx` (1), `ProjectMapsView.tsx` (1)
- `ProjectFormModal.tsx` (1), `AdminRosterTab.tsx` (1), `AgentProfileView.tsx` (1)

**Remaining count outside Agent 2 skip list: 45**  
(+ 13 in `useBrandingSettings.ts` owned by Agent 4 / customizer)

---

## Verification

- `npx tsc --noEmit` in `telecaller-app/` — **PASS** (exit 0)
- Shared `Dialog.tsx` / `Modal.tsx` / `Drawer.tsx` — **not edited**
