# Wave 5 Phase 3 — Agent 3: Drawer Adoption Notes

**Date:** 2026-07-13  
**Role:** Agent 3 (Drawer consumers)  
**Scope:** `CustomizerDrawer`, `MobileProfileDrawer`, `DialPadDrawer` only.  
**Primitives:** Shared `Drawer` / `Dialog` / `Modal` **frozen** — consumed, not edited.  
**DLS:** Remains **v1.3** (no `ui-registry.md` edits).

---

## Files changed

| File | Change |
| --- | --- |
| `telecaller-app/src/features/dashboard/components/CustomizerDrawer.tsx` | Adopted shared `Drawer` (right / md); `window.confirm` → shared `Dialog` (danger) |
| `telecaller-app/src/shared/components/MobileProfileDrawer.tsx` | Adopted shared `Drawer` (bottom / lg); account actions unchanged |
| `telecaller-app/src/features/calls/components/DialPadDrawer.tsx` | Adopted shared `Drawer` shell + theme/a11y/close; telephony UX preserved |
| `directives/wave5-phase3-agent3-notes.md` | This deliverable |

**Not touched:** `Drawer.tsx`, `Dialog.tsx`, `Modal.tsx`, `MobileDrawer.tsx`, ModalHost / registry, navigation, call start / DTMF logic.

---

## Per-consumer summary

### CustomizerDrawer

- Shell → shared `Drawer` (`position="right"`, `size="md"`).
- Inherits Escape, focus trap, return-focus, labeled close, theme overlay/card.
- Body: card style / density / widget visibility + reorder — same controls and handlers.
- Footer: Reset + Save & Close (same outcomes).
- **Confirm:** `window.confirm` replaced with shared `Dialog` (`confirmVariant="danger"`, backdrop opt-out via Dialog default).
- Nested-overlay note: Drawer `isOpen` gated off while confirm Dialog is open (`isOpen && !confirmResetOpen`) so dual `useOverlayFocus` traps do not fight at `z-50`.

### MobileProfileDrawer

- Shell → shared `Drawer` (`position="bottom"`, `size="lg"`, `className="pb-safe"`).
- Inherits sheet handle + `animate-sheetSlideUp` from shared bottom Drawer.
- Body: avatar / appearance / fullscreen / shortcuts — same callbacks (close then act).
- Footer: Sign Out — same `onClose` + `handleLogout` sequence.
- No `alert` / `confirm` present — no Dialog needed.
- No nav IA redesign.

### DialPadDrawer — disposition: **ADOPTED** (specialized content kept)

**Decision:** Adopt shared `Drawer` for chrome + a11y/close/theme. Keep specialized telephony UX inside children (keypad grid, DTMF tones, lead match, quick-create, Call CTA). Do **not** keep a hand-rolled slate overlay fork.

| Concern | Outcome |
| --- | --- |
| Shared Drawer shell | Yes — `position="right"`, `size="sm"` + `className="max-w-sm"` (preserves prior width) |
| Escape / trap / labeled close / return-focus | Inherited from shared Drawer |
| Theme | Slate/indigo island → `theme-*` tokens on chrome + interior surfaces; Call CTA → `bg-theme-success` + `text-white` (matches `Button` success) |
| DTMF / dial / search / quick-create / `onStartCall` | Unchanged behavior |
| Layout redesign | No — same display, match list, quick-create, 3×4 keypad, footer Call |
| Emoji status chips in display | Removed decorative emoji prefixes only (`👤` / `🆕`); labels unchanged |

---

## Explicit non-goals (confirmed)

- No edits to shared Modal / Dialog / Drawer primitives
- No ModalHost / ModalRegistry orchestration changes
- No Filter / bin sheets, TemplateCenter, Shortcuts, CallAudit (other agents)
- No DLS v1.4 / imprint
- No Firestore / routing / telephony business-logic changes

---

## Smoke notes for Phase 4 validation

- Customizer: Esc closes drawer; Reset opens Dialog; Esc/Cancel on Dialog restores drawer; Confirm resets prefs; Tab trap inside open surface
- Profile: bottom sheet handle + Esc + Sign Out / shortcuts / fullscreen still fire after close
- DialPad: Esc / backdrop close; DTMF audible; Call still starts overlay; quick-create still works; light + dark readable
- `tsc --noEmit` — pass after adoption

---

## Critical judgment

All three owned drawers now sit on the Phase 2 overlay contract. Customizer is the cleanest Drawer + Dialog confirm path. Profile maps cleanly to bottom Drawer. **DialPad: adopted shared Drawer** for dismiss/a11y/theme while remaining a specialized telephony surface inside the panel — not a redesign, not a permanent pre-DLS island.
