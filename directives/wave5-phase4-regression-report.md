# Wave 5 Phase 4 — Regression Report

**Date:** 2026-07-13  
**Scope:** Discoveries from Phase 4 validation-only pass (static + tooling; no browser)  
**App:** `telecaller-app/`  
**Related:** `directives/wave5-phase4-runtime-validation.md`

---

## Verdict

**PASS — no critical blockers.**

Release recommendation for Wave 5 overlay work: **safe to proceed to Phase 5 authorization** after optional human MANUAL QA. Do **not** implement DLS v1.4 / close Wave 5 until authorized.

---

## Critical regressions

| ID | Finding | Severity | Action |
| --- | --- | --- | --- |
| — | None found | — | — |

No critical overlay regressions requiring primitive hot-fix or consumer rollback.

---

## Non-critical / residual findings

| ID | Finding | Severity | Recommended fix (do not implement without auth) |
| --- | --- | --- | --- |
| R1 | `npm run lint` fails on `.tmp/*.cjs` scratch scripts | Low (tooling noise) | Exclude `.tmp` from ESLint ignore, or delete scratch scripts; not overlay-related |
| R2 | `ProjectFormModal` uses `size="xl"` plus `className="max-w-2xl"` | Cosmetic | Prefer `size="2xl"` and drop redundant class when polishing |
| R3 | Drawer `position="left"` unused by smoke consumers | Low | Optional smoke when left drawer is adopted; API already supported |
| R4 | TemplateCenter body padding bleed (`-mx-6 -my-5`) | Soft residual (Phase 3) | Modal flush / custom-body slot in a later polish pass |
| R5 | Filter sheet padding denser historically than Modal `px-6` | Soft residual | Accept or add dense body variant later |
| R6 | ~45 native `alert`/`confirm` + branding-hook sites remain | Out of scope | Follow-up Dialog pass; not Wave 5 Phase 4 blockers |
| R7 | LeadBin bulk selection floating bar still custom | Intentional | Leave unless product wants shared chrome |
| R8 | DialPad specialized telephony interior | Intentional | Keep; Drawer shell already adopted |
| R9 | Vite chunk-size warnings on large bundles | Build hygiene | Pre-existing; unrelated to overlays |

---

## Risk assessment

| Risk | Level | Notes |
| --- | --- | --- |
| Shared Modal/Dialog/Drawer contract broken in code | **Low** | Static review + inheritance match Phase 2 |
| Smoke consumers reverted to hand-rolled chrome | **Low** | All 18 smoke-list hosts import shared primitives |
| Typecheck / production build broken | **Low** | `tsc --noEmit` and `npm run build` PASS |
| A11y trap / Esc / return-focus fail at runtime | **Medium until MANUAL QA** | Hooks present; not exercised in a browser this pass |
| Theme token miss in Light/Dark | **Low–Medium until MANUAL QA** | Primitive chrome tokenized; visual pass still needed |
| Nested Select + Esc conflict | **Medium until MANUAL QA** | Known Phase 2 soft note; product expectation TBD |

---

## Tooling summary

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | PASS |
| `npx eslint "src/**/*.{ts,tsx}"` | PASS |
| `npm run lint` | Fails only on `.tmp` (ignore for Wave 5) |
| `npm run build` | PASS |

---

## Release recommendation

| Question | Answer |
| --- | --- |
| Block Wave 5 close on critical overlay FAIL? | **No** |
| Proceed to Phase 5 (DLS v1.4 Modal/Drawer Contract) when authorized? | **Yes** |
| Require MANUAL QA before calling overlays “runtime proven”? | **Yes** — see checklist in phase4 runtime validation |
| Hot-fix primitives now? | **No** — none warranted |

---

## What remains MANUAL QA

1. Keyboard: Tab trap, Esc, return-focus on representative Modal / Dialog / Drawer  
2. Screen reader: title / description announcement  
3. Light and Dark theme visual smoke on open overlays  
4. Nested Select + Esc behavior  
5. Drawer positions used in product (right, bottom; left if/when used)  
6. Backdrop opt-out on Call Audit / Shortcuts / Merge / Dialog danger  

---

## STOP

Phase 4 deliverables complete. **Do not** promote DLS v1.4, edit `ui-registry.md`, or write `wave5-complete.md` without authorization.

**Await Phase 5 authorization.**
