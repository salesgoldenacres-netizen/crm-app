# Wave 4 Phase 4 — Agent 3 Notes (Admin Forms)

**Date:** 2026-07-13  
**Agent:** Agent 3 — Admin Forms presentation polish only  
**App:** `telecaller-app/`  
**Constraint:** No Zod / Firestore / settings save logic / shared primitive / Modal / Dialog / index.css / ui-registry edits.

---

## Files changed

| File | Polish applied |
| --- | --- |
| `features/admin/components/ProjectFormModal.tsx` | Layout image → `Input` + upload chrome; dense proximity/competitor raw fields get `aria-label`s; quiet helper copy |
| `features/admin/components/TeamConfigModal.tsx` | Members list `role="group"` + labelled heading |
| `features/admin/components/UserAccountModal.tsx` | Permissions block `role="group"` + labelled heading (Zod inline errors already present) |
| `features/leads/components/AdminLeadModal.tsx` | Quiet helpers / `tel` + autocomplete; no new validation rules |
| `features/admin/components/settings/BrandingSettingsTab.tsx` | Surrounding form chrome → `Input` / `Select` / `Textarea` / `Button` / `FormActions` / theme tokens; color/radius/range controls kept specialized; accordion a11y (`aria-expanded`, focus-visible); quiet typography |
| `features/admin/components/settings/IntegrationsSettingsTab.tsx` | Nested webhook / Twilio / Exotel / custom IVR / remote config fields → shared primitives; JSON header/payload errors wired to `Textarea` `error=` (full message); Checkbox pools; Save via `Button` + `FormActions` |
| `features/admin/components/settings/RolesSettingsTab.tsx` | Table + chips on theme tokens; restriction badges emoji removed; Add Role → `Button`; permission Checkbox group labelled |
| `features/admin/components/settings/EvolutionIntegrationsPanel.tsx` | Field chrome → `Input` / `Select` / `Checkbox` / `Button`; quiet typography (`font-black` → `font-semibold`); `rounded-theme` |

**Not edited:** Admin tab hosts, ThemeMockupPreview logic, shared primitives, formField, Modal, Dialog, Zod, Firestore hooks.

---

## Residuals still deferred

| Residual | Why deferred |
| --- | --- |
| **AdminLead / Project / Team HTML-native `required` only** | No Zod schemas on those modals; Phase 4 forbids inventing business validation — inline error expansion needs schema ownership elsewhere |
| **ProjectFormModal dense proximity/competitor editors** | Still compact raw `FIELD_CONTROL_CLASS` inputs (intentional density); full `Input` wrap would bloat the two-column layout |
| **Branding color / radius / shadow specialized controls** | Intentionally kept as native `type="color"` + range (not Input primitives) |
| **Branding CSS editor look** | Left as theme-surface mono Textarea (dropped slate-900 terminal look); further “code editor” chrome out of scope |
| **WebhookSimulatorConsole / CloudFunctionCodeReference** | Not owned; still parallel chrome islands |
| **Roles table Delete / confirm via `alert`/`confirm`** | Behavioral shell — Wave 5 Modal / dialog work |
| **Modal focus trap** | Known Phase 2+ residual; shared Modal locked |
| **Runtime visual QA** | Recommended for Phase 4 validation agent — not done here |
| **UserAccount setState-during-render sync pattern** | Pre-existing React purity smell; logic-adjacent — not presentation polish |

---

## Primitive defects (report only — do not fix here)

| Observation | Notes |
| --- | --- |
| **`Checkbox` label weight** | Uses `font-semibold text-theme-text` on label — fine; no `type-label` option for dense settings grids |
| **`Select` + disabled `<option>` children** | Works when using `children` (Evolution provider “coming soon”); `options` prop has no `disabled` flag |
| **`FormActions` full-width primary** | Settings saves needed `className="w-full"` on Button inside children — FormActions has no `stretch` / stacked layout variant |
| **`Input` + adjacent upload control** | Layout image / logo URL + file picker still requires consumer flex layout; no compound “file-or-url” primitive |
| **`Textarea` default surface** | Consumers override with `className`; historical card-vs-surface mismatch may still exist in primitive default — not verified this pass |

---

## Exit

Owned Admin form surfaces are presentation-aligned with Wave 4 Form Contract (draft) + DLS v1.2 tokens. Nested Integrations residual from Phase 3 is closed for owned files. **`tsc --noEmit` PASS.**
