# Wave 5 — Complete

**Status:** **Officially closed** — Phase 4 static + tooling **PASS** → Phase 5 DLS promote authorized.  
**Date:** 2026-07-13  
**Scope closed:** Overlay presentation language — audit → shared Modal/Dialog/Drawer primitives → consumer adoption → validation → Design Language **v1.4** (canonical / production for overlays).

Presentation-only throughout. No Firestore / routing / open-close orchestration / business-logic changes. Shared primitives frozen after Phase 2; Phase 3 consumers only; Phase 4 validation-only. Wave 6 (Lead Detail) starts as a **new** wave — do not reopen Wave 5 overlays unless doc-only.

---

## Artifacts

| Artifact | Path |
| --- | --- |
| UI/UX audit | [`directives/wave5-modals-ui-audit.md`](wave5-modals-ui-audit.md) |
| Phase 2 notes | [`directives/wave5-phase2-notes.md`](wave5-phase2-notes.md) |
| Phase 2 validation | [`directives/wave5-phase2-validation.md`](wave5-phase2-validation.md) |
| Phase 3 notes | [`directives/wave5-phase3-notes.md`](wave5-phase3-notes.md) |
| Phase 3 validation | [`directives/wave5-phase3-validation.md`](wave5-phase3-validation.md) |
| Phase 3 agent notes | [`directives/wave5-phase3-agent1-notes.md`](wave5-phase3-agent1-notes.md) … [`agent4-notes.md`](wave5-phase3-agent4-notes.md) |
| Phase 4 runtime validation | [`directives/wave5-phase4-runtime-validation.md`](wave5-phase4-runtime-validation.md) |
| Phase 4 regression | [`directives/wave5-phase4-regression-report.md`](wave5-phase4-regression-report.md) |
| **Design Language Spec** (canonical) | [`ui-registry.md`](../ui-registry.md) — **v1.4** (§3f Modal/Drawer Contract) |

---

## What Wave 5 delivered

- Shared overlay stack: `useOverlayFocus` on `Modal` + `Drawer`; focus trap, initial focus, return-focus, Escape, body scroll lock, optional `aria-describedby`, `closeOnBackdrop`.
- Modal `variant="sheet"` + `size="2xl"` — no parallel `Sheet.tsx`.
- `Dialog` as thin Modal wrapper with `FormActions` footer; danger defaults `closeOnBackdrop={false}`.
- Consumer adoption: TemplateCenter / BulkLeadImport; high-traffic confirms → Dialog; Customizer / Mobile profile / DialPad → Drawer; CallAudit / Shortcuts / Merge / mobile filter sheets → Modal/Dialog.
- Canonical **Modal/Drawer Contract** in `ui-registry.md` as **DLS v1.4** (§3f).
- Phase 4: `tsc --noEmit`, `eslint src/**/*.{ts,tsx}`, `npm run build` **PASS**; no critical regressions.

---

## Residuals (deferred — do not reopen Wave 5)

| Residual | Notes |
| --- | --- |
| **MANUAL QA** (keyboard Tab trap / Esc / return-focus, SR announce, Light–Dark visual, nested Select + Esc) | Pending human pass — checklist in [`wave5-phase4-runtime-validation.md`](wave5-phase4-runtime-validation.md) |
| ~45 native `alert`/`confirm` (+ branding-hook sites) | Out of high-value set; later Dialog pass — **document only**, do not convert in Wave 5 reopen |
| TemplateCenter / filter sheet padding bleed | Soft polish |
| `ProjectFormModal` `xl` + `max-w-2xl` overlap | Cosmetic |
| LeadBin bulk selection floating bar | Intentional custom chrome |
| DialPad specialized telephony interior | Intentional; Drawer shell adopted |
| Drawer `position="left"` unused by smoke consumers | API present; smoke when adopted |

---

## Milestone status

| Item | Status |
| --- | --- |
| Wave 5 | **Officially closed** (Phase 4 PASS → Phase 5 DLS promote) |
| Design Language Spec | **v1.4** canonical / production for overlays ([`ui-registry.md`](../ui-registry.md) §3f) |
| Next | **Wave 6 Lead Detail** — presentation-only unless separately scoped |
