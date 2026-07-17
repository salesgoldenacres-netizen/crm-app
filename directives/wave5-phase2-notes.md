# Wave 5 Phase 2 — Shared Overlay Primitives Notes

**Date:** 2026-07-13  
**Role:** Architecture Owner  
**Scope:** Shared `Modal` / `Dialog` / `Drawer` only — presentation + a11y. **No consumer migration.**  
**DLS:** Remains **v1.3** (no v1.4 bump; no `ui-registry.md` edits).

---

## What changed

### `Modal.tsx`

- Added shared `useOverlayFocus` + `getOverlayFocusableElements` (also used by Drawer):
  - Body scroll lock while open
  - Initial focus → first focusable (else panel)
  - Tab / Shift+Tab cycle inside panel
  - Escape → `onClose`
  - Return focus to opener on close (when still in document)
- Kept Wave 4 baseline: `role="dialog"`, `aria-modal`, `aria-labelledby`, labeled close, theme overlay/card/`rounded-theme`, quiet `font-semibold` title
- Additive API (backward compatible):
  - `variant?: "center" | "sheet"` — sheet = bottom sheet on small screens (`animate-sheetSlideUp`, drag handle, `rounded-t-3xl`), centered on `sm+`. **No** `Sheet.tsx` / `BottomSheet.tsx`
  - `descriptionId?: string` → `aria-describedby`
  - `closeOnBackdrop?: boolean` (default `true`)
  - `size` includes optional `"2xl"` (`max-w-2xl`)
- Close control: ≥44px hit target + `focus-visible` ring (unchanged token language)

### `Dialog.tsx`

- Still a thin wrapper over `Modal` — no parallel overlay
- Footer now wraps Cancel / Confirm in **`FormActions`** (Command Surface hierarchy); `confirmVariant` preserved via children `Button`s
- Description wired to `aria-describedby` via `useId` + Modal `descriptionId`
- Destructive default: when `confirmVariant === "danger"`, `closeOnBackdrop` defaults to `false` (overridable)
- Existing public props preserved; still unused by features (Phase 3 adoption)

### `Drawer.tsx`

- Brought to Modal a11y parity via `useOverlayFocus`:
  - `role="dialog"`, `aria-modal`, `aria-labelledby`, optional `aria-describedby`
  - Escape, focus trap, return focus, labeled close + focus-visible
- Chrome: title `font-semibold` (was `font-extrabold`); close `rounded-theme`; footer matches Modal (`gap-3`, `bg-theme-surface/50`)
- Bottom position: larger top radius + drag handle + `animate-sheetSlideUp` (gesture sheet Keep)
- Side positions: edge radius via `rounded-l/r-[var(--radius)]` (no `rounded-l/r-theme` utility in CSS yet)
- Additive: `descriptionId`, `closeOnBackdrop`
- Layout / position / size API unchanged — still unused by features

### `ModalHost.tsx`

- **Not edited** — primitive contract did not require host changes.

---

## Explicit non-goals (confirmed)

- No feature modal / sheet / drawer consumer edits
- No TemplateCenter, BulkLeadImport, CallAudit, Shortcuts, Customizer, DialPad, Filter sheet migration
- No `alert()` / `confirm()` → Dialog conversion
- No ModalRegistry / open-close orchestration redesign
- No Firestore, routing, schemas, business logic
- No DLS v1.4 / `ui-registry.md` imprint

---

## Soft notes for Phase 3

| Item | Note |
| --- | --- |
| Existing Modal consumers | Inherit trap / return-focus / Escape automatically — smoke Esc + Tab + light/dark |
| TemplateCenter / BulkLeadImport | Prefer `Modal` `variant="sheet"` / `size="2xl"` + className; keep IA |
| Confirms | Migrate high-traffic `alert`/`confirm` → `Dialog` (handlers unchanged) |
| Customizer (± Profile) | Prefer shared `Drawer`; DialPad may stay specialized with chrome/a11y pass |
| Filter / bin sheets | Add dialog semantics; keep Apply model |
| `useOverlayFocus` | Prefer reuse over per-consumer trap scripts |

---

## Critical judgment

Phase 2 closes the Wave 4 residual (focus trap / return-focus / describedby) on the shared host and brings dead `Dialog` / `Drawer` inventory to the same contract without inventing a third overlay system. **STOP — wait for Phase 3 authorization before any consumer migration.**
