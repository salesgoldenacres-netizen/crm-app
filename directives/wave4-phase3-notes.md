# Wave 4 Phase 3 — Form Consumer Adoption Notes

**Date:** 2026-07-13  
**Scope:** Presentation-only adoption of Phase 2 form primitives across Batches 1–5.  
**Constraint:** No Zod / validation rule / submit / Firestore / routing / local form state / instant-save / business-logic changes. **No DLS v1.3 bump.**

---

## Batches completed

### Batch 1 — Leads
| File | Decision | Notes |
| --- | --- | --- |
| `LeadSubmissionForm.tsx` | **Migrate** | Shared `Input` / `Select` / `Textarea` + `FormActions`; quiet section titles (`type-label`); success copy without emoji; header on `theme-accent` |
| `AddLeadModal.tsx` | **Migrate** | Shared `Modal` + `FormActions` footer (`form=` submit); all fields → primitives; Zod error wiring **unchanged** |
| `LeadDetailsProfile.tsx` | **Migrate** | Tags `Select` + referral `Input`; quiet typography; instant-save `onChange` preserved |

### Batch 2 — Lead detail tools
| File | Decision | Notes |
| --- | --- | --- |
| `CallLoggingForm.tsx` | **Migrate** | Fields + `FormActions`; emoji removed from disposition/priority options |
| `SiteVisitScheduler.tsx` | **Migrate** | Shared fields + primary action; scheduled-state emoji removed from UI chrome |
| `DiscountManager.tsx` | **Migrate** | `Input` + `FormActions`; refs preserved for uncontrolled submit |
| `LoanEMICalculator.tsx` | **Migrate** | Selects/Inputs + quiet display chrome; calc / save logic untouched; range sliders kept native |
| `WhatsAppAssistant.tsx` | **Migrate** | `Select` / `Textarea` / `FormActions`; green island quieted to theme card |

### Batch 3 — Admin forms
| File | Decision | Notes |
| --- | --- | --- |
| `AdminLeadModal.tsx` | **Migrate** | Shared `Modal` + field primitives + `FormActions` |
| `ProjectFormModal.tsx` | **Migrate** | Shared `Modal` (`max-w-2xl`); main fields → primitives; dense proximity/competitor editors use `FIELD_CONTROL_CLASS` |
| `TeamConfigModal.tsx` | **Migrate** | Shared `Modal` + `Checkbox` members list |
| `BrandingSettingsTab.tsx` | **Partial migrate** | Token/radius/typography pass (`theme-surface`, `rounded-theme`, no `font-black`); complex color pickers kept raw |
| `IntegrationsSettingsTab.tsx` | **Partial migrate** | Gray-900 island → `theme-surface` / `rounded-theme` bulk chrome; nested webhook editor fields not fully re-wrapped in `Input` |
| `RolesSettingsTab.tsx` | **Partial migrate** | Same token chrome pass; permission matrix inputs not fully primitive-wrapped |
| `UserAccountModal.tsx` | **Polish** | Already on `Modal`/`Input`; added `Select` / `Checkbox` / `FormActions` |

### Batch 4 — Modal standardization
| File | Decision | Notes |
| --- | --- | --- |
| AddLead / AdminLead / Project / Team / UserAccount | **Migrate** | Shared `Modal` shell + Command Surface footers |
| `MapCallLogModal.tsx` | **Migrate** | Shared `Modal` + fields |
| `CallLogModal.tsx` | **Migrate** | Replaced slate-900 island with shared `Modal` + primitives |
| `LinkLeadModal.tsx` | **Migrate** | Shared `Modal` + mode tabs preserved |
| `CampaignBroadcastModal.tsx` | **Migrate** | Shared `Modal` + fields; channel chips quieted (no emoji) |
| `TemplateCenterModal.tsx` | **Skip (residual)** | Mobile sheet / end-sheet pattern — keep for Phase 4; not a simple centered dialog |
| `BulkLeadImportModal.tsx` | **Skip (residual)** | Multi-step import wizard chrome — Phase 4 |

### Batch 5 — Login & remaining
| File | Decision | Notes |
| --- | --- | --- |
| `Login.tsx` | **Migrate** | `FIELD_CONTROL_CLASS` + `FIELD_LABEL_CLASS` (icon-affixed fields); shared `Button`; theme error/info boxes |
| Utility modals above | Covered in Batch 4 | |

---

## Cross-cutting presentation rules applied

- Prefer shared primitives over `.input-premium` at call sites
- `FormActions` / outline Cancel + primary Save hierarchy on modal footers
- Quiet typography: `type-label` / `font-semibold` — no `font-black` on form chrome
- Remove persistent emoji from form controls and success copy
- Preserve IA / section grouping / open-close / submit / instant-save behavior

---

## Residuals (Phase 4 candidates)

1. **TemplateCenterModal** / **BulkLeadImportModal** — non-standard shells (sheet / wizard)
2. **IntegrationsSettingsTab** nested webhook mapping editors — dense raw inputs; chrome tokenized but not full primitive wrap
3. **BrandingSettingsTab** color pickers / radius sliders — keep specialized controls; optional Input wrap for text fields
4. **RolesSettingsTab** permission grid checkboxes — tokenized; optional Checkbox primitive pass
5. **Focus trap** in Modal — deferred (Phase 2 note)
6. Scattered non-form `input-premium` / gray islands outside Wave 4 form scope (maps, dialer, analytics)

---

## Explicit non-changes

Zod schemas, required fields, submit handlers, Firestore writes, routing, local form state ownership, duplicate detection, success-flow branching, Admin business logic.
