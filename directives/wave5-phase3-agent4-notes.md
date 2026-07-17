# Wave 5 Phase 3 — Agent 4 Notes (Legacy Overlay Cleanup)

**Date:** 2026-07-13  
**Agent:** Agent 4 — Legacy Overlay Cleanup  
**App:** `telecaller-app/`  
**Shared Modal / Dialog / Drawer:** **FROZEN** (imported only; not edited)

---

## Scope owned

| Surface | Path |
| --- | --- |
| CallAuditRatingModal | `features/admin/components/CallAuditRatingModal.tsx` |
| ShortcutsModal | `shared/components/ShortcutsModal.tsx` |
| MergeSettingsTab overlay | `features/admin/components/settings/MergeSettingsTab.tsx` |
| LeadListMobileFilterSheet | `features/leads/components/LeadListMobileFilterSheet.tsx` |
| Lead Bin mobile sheet | Inline in `features/leads/components/LeadBinWorkspace.tsx` |

---

## Files changed

| File | Change |
| --- | --- |
| `CallAuditRatingModal.tsx` | Custom overlay → shared `Modal`; FormActions + Button footer; shared `Textarea`; star a11y (`aria-pressed` / labels); success/error `alert()` → `Dialog`; `closeOnBackdrop={false}` (prior shell had no backdrop dismiss) |
| `ShortcutsModal.tsx` | Slate/indigo custom shell → `Modal` `variant="sheet"`; theme tokens; labeled close + Escape + trap via Modal; decorative footer kept as muted brand line |
| `MergeSettingsTab.tsx` | Merge assistant custom overlay → `Modal` `size="2xl"` + `descriptionId`; FormActions footer; field pickers as buttons; list chrome tokenized; success/error `alert()` → `Dialog`; `closeOnBackdrop={false}` |
| `LeadListMobileFilterSheet.tsx` | Custom sheet → `Modal` `variant="sheet"` (wrapped `md:hidden`); dialog semantics / Escape / trap / labeled close inherited; draft → Search / Reset handlers unchanged; `aria-describedby` for active-count copy |
| `LeadBinWorkspace.tsx` | Inline mobile filter sheet → same `Modal` `variant="sheet"` pattern; Reset / Search still call existing `resetFilters` / `applySearch` (close sheet + apply draft); bulk selection bar **untouched** |

**Not edited:** `Modal.tsx`, `Dialog.tsx`, `Drawer.tsx`, `ModalHost.tsx`, `ui-registry.md`, schemas, Firestore, routing, Agents 1–3 islands.

---

## alert / confirm → Dialog

| Call site | Before | After |
| --- | --- | --- |
| CallAudit success | `alert("Call log rated successfully!")` | `Dialog` success, OK / Close dismiss |
| CallAudit failure | `alert("Failed to rate call: …")` | `Dialog` danger |
| Merge success | `alert("Leads merged successfully!")` | `Dialog` success |
| Merge failure | `alert("Failed to merge leads…")` | `Dialog` danger |

No `window.confirm` existed in owned files. Merge execute remains the in-modal **Confirm & Merge Leads** primary action (unchanged outcome).

---

## Behavior preserved

- Rating / merge / filter field logic and store handlers unchanged
- Lead list + Lead Bin **Draft → Search → Applied** model intact (Search / Reset still invoke parent / local apply + close)
- Prior no-backdrop-dismiss on CallAudit / Shortcuts / Merge preserved via `closeOnBackdrop={false}`
- Filter sheets keep `md:hidden` host wrapper so desktop layout is unaffected
- Escape, labeled close, focus trap, return-focus inherited from shared Modal

---

## `tsc` (owned)

| Check | Result |
| --- | --- |
| Owned files | **Clean** — no errors reported for Agent 4 paths |
| Full `npx tsc --noEmit` | **Fails elsewhere** — `BulkActionsPanel.tsx` unused `Dialog` / `binConfirmOpen` (out of scope; other agent) |

---

## Residuals

1. **Star fill color** — filled stars still `text-amber-500` (semantic rating cue); empty uses `text-theme-muted/40`.
2. **Dialog chrome for alerts** — shared `Dialog` always renders Cancel + Confirm; both dismiss. Outcome matches `alert()` dismiss; not a single-button OS alert.
3. **LeadBin bulk bar** — floating selection / restore chrome still custom (`animate-sheetSlideUp`); not a filter sheet; left alone.
4. **Merge list density** — duplicate cards lightly tokenized; not a full Admin Settings redesign.
5. **Filter sheet padding** — Modal body/footer rhythm (`px-6`) is slightly roomier than prior `px-3` dense sheet; filter model unchanged.
6. **Shared primitive defects** — none found in frozen Modal/Dialog/Drawer during this pass; report-only if Phase 4 finds runtime Escape/trap issues with nested Select in filter sheets.

---

## Done criteria

- [x] Owned overlays on shared Modal / Dialog where appropriate
- [x] Theme tokens; dialog semantics; labeled close; Escape
- [x] Legacy overlay styling removed from owned shells
- [x] `alert` in owned files → Dialog (same handler outcomes)
- [x] No feature behavior / Firestore / query changes
- [x] Shared Modal/Dialog/Drawer frozen (not modified)
- [x] This notes file written
