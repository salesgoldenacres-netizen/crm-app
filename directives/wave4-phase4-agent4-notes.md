# Wave 4 Phase 4 — Agent 4 Notes (Remaining Modals / Forms)

**Date:** 2026-07-13  
**Agent:** Agent 4 — Remaining Modals / Forms (presentation polish only)  
**App:** `telecaller-app/`

---

## CallLogFormState — FROZEN

**Confirmed unchanged.** Agent 4 only **imports / uses** `CallLogFormState` from `CallLoggingForm.tsx` in `MapCallLogModal.tsx`. No edits to `CallLoggingForm.tsx` or the type export.

Presentation-only `noteError` in `MapCallLogModal` / `CallLogModal` is local consumer state — not part of `CallLogFormState`.

---

## Files changed

| File | Presentation polish |
| --- | --- |
| `Login.tsx` | Required `*` markers; `space-y-1.5` field stacks; username `helperText` via `FIELD_HELPER_CLASS`; password show/hide `aria-pressed`; describedby when no error |
| `CampaignBroadcastModal.tsx` | Channel `role="group"` + `aria-pressed`; inline `error` for empty template / email subject; progress `role="progressbar"` + quiet success copy; Send no longer disabled-only for empty template |
| `LinkLeadModal.tsx` | Quiet subtitle (`type-label`); tablist a11y; inline `error` / `onInvalid` on lead select + name/phone; `helperText` on email/notes |
| `CallLogModal.tsx` | Local `noteError` + `onInvalid` (Connected notes); quiet duration strip; notes `helperText`; form `text-sm` |
| `MapCallLogModal.tsx` | Local `noteError` + `onInvalid`; follow-up `helperText`; **imports frozen `CallLogFormState` only** |
| `TemplateCenterModal.tsx` | **Fixed tsc unused imports** (`useEffect` / `useId` / unused `Textarea`); quiet typography (no `font-black` / chrome emoji); theme tokens; dialog a11y; shared `Textarea` + `Button`; sheet architecture preserved |
| `BulkLeadImportModal.tsx` | Theme overlay/tokens; dialog a11y; shared `Textarea` / `Button` / `FormActions`; quiet success copy; paste helper |
| `MappingSelectorPanel.tsx` | Shared `Select` + theme label chrome (supporting BulkLeadImport polish) |

**Not edited:** shared primitives, `formField`, Modal/Dialog implementations, `index.css`, `ui-registry`, `CallLoggingForm.tsx`, Agents 1–3 owned files, schemas, Firestore, routing.

---

## TemplateCenter / BulkLeadImport disposition

| Surface | Disposition |
| --- | --- |
| **TemplateCenterModal** | **Polished** — presentation + tsc unused-import fix. Sheet / bottom-drawer architecture **unchanged** (not migrated to shared `Modal`). |
| **BulkLeadImportModal** | **Light polish** — theme tokens, shared field/action chrome, a11y shell. Wizard/import `alert()` paths **deferred** (not converted to inline field errors). |

---

## `tsc` status (owned files)

| Check | Result |
| --- | --- |
| Owned-file filter (TemplateCenter / BulkLead / Login / Campaign / LinkLead / CallLog / MapCallLog / MappingSelector) | **Clean** — no errors |
| Full `telecaller-app` `npx tsc --noEmit` | **PASS** (exit 0) — TemplateCenter unused-import errors resolved |

---

## Primitive defects (report only — not fixed)

1. **`formField.ts` `describedBy`:** Same as Agent 1 — `else if` means helper + error cannot both attach to `aria-describedby` when both props are set. Contract says error replaces helper visually; AT still cannot hear both.
2. **Login adornment fields:** Username/password stay on raw `<input>` + `FIELD_*` classes (icon prefixes). Shared `Input` has no leading/trailing adornment slot — residual, not a bug.
3. **Modal focus trap:** Known Phase 2+ residual; TemplateCenter / BulkLeadImport custom shells still lack trap (labeled close + Escape only where shared `Modal` is used).
4. **BulkLeadImport `alert()`:** Invalid CSV / missing phone mapping / result summaries still use `alert()` — outside routine field-error chrome; deferred.
5. **Sheet residuals:** TemplateCenter bottom-sheet + BulkLeadImport custom dialog remain outside shared `Modal` host — intentional Phase 4 boundary (polish only, no architecture redesign).

---

## Done criteria

- [x] Owned consumers polished (presentation only)
- [x] `CallLogFormState` not modified
- [x] This notes file written
- [x] Shared-primitive defects reported (not fixed)
