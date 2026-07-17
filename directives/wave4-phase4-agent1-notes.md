# Wave 4 Phase 4 — Agent 1 Notes (Leads)

**Date:** 2026-07-13  
**Scope:** Presentation polish only — `LeadSubmissionForm`, `AddLeadModal`, `LeadDetailsProfile`  
**Locked:** Shared primitives, schemas, handlers, host pages — untouched

---

## Changes

### `LeadSubmissionForm.tsx`
- Quieted header subtitle (`font-medium` vs `font-semibold`)
- Plot Interest: `helperText` when no project selected (“Select a project first”) → `aria-describedby` via primitive
- Follow Up On / Created By: muted `helperText` (optional date / auto-set account)

### `AddLeadModal.tsx`
- Extended per-field `error={validationErrors.*}` to all schema-keyed fields (project, plot, priority, status, source, medium, notes) — name/phone/email already wired; Zod logic unchanged
- Lead Number / Created Time: label noise moved into `helperText`
- Plot / Follow Up / Created By: same helper pattern as page form
- Native `required` + shared primitive `error` / `aria-invalid` / describedby remain the validation chrome path

### `LeadDetailsProfile.tsx`
- Row labels → `type-label font-semibold text-theme-muted`; values → `font-medium` (phone CTA stays `font-semibold` accent)
- Tags: visible `label` + `helperText` on `Select` (replaces bare `aria-label`); chip list `aria-labelledby` section heading
- Referral instant-save fields: `helperText="Saves on change"`
- Locate Map link: `focus-visible` ring

---

## Done criteria

| Criterion | Result |
| --- | --- |
| Shared field `error` / `helperText` / `aria-invalid` | **Pass** — AddLead fully wired; page + profile use helperText |
| No `font-black` form chrome | **Pass** |
| Presentation-only | **Pass** — no schema / submit / Firestore changes |
| `tsc --noEmit` | **Pass for owned files** — no errors in Agent 1 paths. Repo `tsc` currently fails on `TemplateCenterModal.tsx` unused imports (other agent / residual; not owned) |

---

## Cross-cutting primitive defects (report only — not fixed)

1. **`formField.ts` `describedBy`:** Comment says error + helper “both may describe,” but implementation uses `else if` — only one id is attached when both props are set. Consumers cannot surface helper + error to AT simultaneously without a primitive fix.
2. **`Select` + empty `value=""` toggle pattern** (Lead Tags): Works, but clearing back to placeholder after each toggle relies on controlled `value=""`; no primitive issue beyond usual controlled-select quirks.
