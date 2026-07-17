# Wave 5 Phase 3 — Agent 1: Template & Import

**Date:** 2026-07-13  
**Owns:** `TemplateCenterModal.tsx`, `BulkLeadImportModal.tsx`  
**Frozen:** Shared `Modal` / `Dialog` / `Drawer` (not edited)  
**DLS:** v1.3 unchanged

---

## Verdict

**DONE** — both hosts adopt shared `Modal`; BulkLeadImport `alert()` → `Dialog`. Wizard / split IA and import logic unchanged.

---

## Files changed

| File | Change |
| --- | --- |
| `telecaller-app/src/features/leads/components/TemplateCenterModal.tsx` | Custom overlay → `Modal` `variant="sheet"` `size="2xl"`; Copy / WhatsApp via Modal `footer`; split list + preview preserved |
| `telecaller-app/src/features/leads/components/BulkLeadImportModal.tsx` | Custom overlay → centered `Modal` `size="lg"`; FormActions footer via Modal; all `alert()` → `Dialog` |
| `directives/wave5-phase3-agent1-notes.md` | This report |

**Not touched:** `Modal.tsx`, `Dialog.tsx`, `Drawer.tsx`, `MappingSelectorPanel.tsx`, `ui-registry.md`

---

## What migrated

### TemplateCenterModal

- Removed hand-rolled fixed overlay, backdrop, drag handle, duplicate close control, and local `role="dialog"` / `aria-*`
- Host: `Modal` with `variant="sheet"`, `size="2xl"`, `title="Template Center"`, height via `className`
- Inherits focus trap, Escape, return-focus, backdrop dismiss from Modal
- IA Keep: template listbox (left) + preview editor (right); Copy outline + WhatsApp primary footer
- Body uses `-mx-6 -my-5` bleed so panes edge-to-edge under Modal body padding (composition only)

### BulkLeadImportModal

- Removed hand-rolled overlay / header close chrome
- Host: `Modal` `size="lg"` (centered wizard — not sheet)
- Form + FormActions footer pattern matches AddLead (`form` id + submit in footer)
- Upload → map → ingest steps, dropzone, paste path, mapping panel untouched
- Feedback: swap Modal ↔ Dialog (never stack) so Escape does not double-fire
  - Invalid / empty CSV → Dialog OK, import stays open
  - Phone mapping required → Dialog OK, import stays open
  - Import complete → Dialog OK, then `onClose()` (same as prior alert + close)

---

## Residuals

| Residual | Notes |
| --- | --- |
| TemplateCenter sheet breakpoint | Custom shell used `md:`; shared Modal sheet uses `sm:` — intentional inherit |
| Sidebar title chrome | Modal owns “Template Center”; sidebar keeps “Select a message layout” only (no duplicate H3) |
| Header spreadsheet icon | `FileSpreadsheet` dropped from import title (Modal `title` is string-only) |
| Body padding bleed | TemplateCenter `-mx-6 -my-5` until Modal gains a flush/custom-body slot |
| Nested overlay swap | Feedback Dialog temporarily hides import Modal — presentation only; no logic change |
| Runtime smoke | Esc / Tab trap / return-focus / light-dark / copy+WhatsApp / CSV map path — Phase 4 human pass |
| Out-of-scope tsc | `AdminDashboard.tsx` unused `Dialog` / `ConfirmDialog` — other agent |

---

## Explicit non-goals (confirmed)

- No shared primitive edits
- No MappingSelectorPanel / CSV parse / bulkAddLeads changes
- No template copy content rewrite
- No DLS v1.4
