# Wave 4 — Forms & Validation UI/UX Audit

**Scope:** Shared form field primitives + high-traffic form consumers (Lead create/edit, lead-detail inline edit, Admin modal/settings samples, dialog/modal form shells, action bars). Treat **both** `Input` / `Select` / `Textarea` / `Checkbox` **and** the live `input-premium` / gray-900 recipes as the “forms ecosystem.”  
**Out of scope (this phase):** UI implementation / redesign, validation schema changes, submit handlers, Firestore writes, form-library state, inventing screenshot PNGs, DLS **v1.3** bump.  
**Constraint:** Presentation-only recommendations later; adopt DLS **v1.2** tokens (`theme-*`, `rounded-theme`, `type-*`, `focus-visible`, Command Surface action hierarchy). No new token architecture. Reuse / improve existing Input/Select/Textarea — **do not** invent a parallel form framework.  
**Density target:** ~70% Linear/Stripe content density + ~30% Salesforce-like chrome (aligned with Waves 1–3).  
**Guiding question:** Would a first-time user understand this faster than before? If no, do not change it.  
**Governed by:** [`ui-registry.md`](../ui-registry.md) Design Language **v1.2** (Wave 3 officially closed — filters production; **no Form Contract in DLS yet**).

**Sources reviewed:** `ui-registry.md` (v1.2 §3d Command Surface), `Input.tsx`, `Select.tsx`, `Textarea.tsx`, `Checkbox.tsx`, `Button.tsx`, `Modal.tsx`, `Dialog.tsx`, `Drawer.tsx`, `Section.tsx`, `index.css` (`.input-premium`, `.btn-premium-*`), `LeadSubmissionForm.tsx`, `AddLeadModal.tsx`, `AdminLeadModal.tsx`, `LeadDetailsProfile.tsx`, `CallLoggingForm.tsx`, `SiteVisitScheduler.tsx`, `DiscountManager.tsx`, `LoanEMICalculator.tsx`, `WhatsAppAssistant.tsx`, `UserAccountModal.tsx`, `ProjectFormModal.tsx`, `TeamConfigModal.tsx`, `BrandingSettingsTab.tsx` (sample), `IntegrationsSettingsTab.tsx` / `RolesSettingsTab.tsx` (sample), `Login.tsx`, `MapCallLogModal.tsx` / other hand-rolled modal forms.

---

## Executive Summary

Shared form primitives **already exist** and are mostly on `theme-*` (`Input`, `Select`, `Textarea`, `Checkbox` with `label` + `error`). They are almost unused. Real CRM forms run on **three parallel recipes**:

1. **Premium CRM** — `.input-premium` + `.btn-premium-*` + `font-black` / slate micro-labels (LeadSubmission, CallLogging, lead tools, Login).
2. **Shared primitive + Zod** — `Input` + `Button` + field `error` (AddLeadModal partial, UserAccountModal) — the best validation *presentation* path today.
3. **Admin gray island** — `dark:bg-gray-900` + `rounded-md|lg` + indigo section headers + hand-rolled Cancel/Save (AdminLeadModal, ProjectFormModal, TeamConfigModal, Branding/settings).

There is **no** `Label` / `Switch` / `FormField` / `helperText` system, **zero** `aria-invalid` usage, and most modal forms **fork** their own overlay instead of shared `Modal`/`Dialog`. Validation *logic* (Zod schemas, HTML `required`, alerts) is out of Wave 4 presentation scope — the debt is **chrome inconsistency**: radius (`rounded-lg` / `0.875rem` / `rounded-md` vs `rounded-theme`), focus (`:focus` ring-1 / glow vs Wave 1.5 `focus-visible:ring-2`), labels (`font-bold` uppercase vs `type-label`), and action bars that do not yet speak Command Surface hierarchy.

**Overall readiness: Medium** — clear primitives to evolve outside-in; high daily traffic on lead create + detail tools; Admin modals shippable but pre-DLS islands. **No form logic changes required for a successful Wave 4.** Wave 3 remains closed; **v1.2 stays production** until Phase 5 promotes a Form Contract to **v1.3**.

---

## Design Debt Scoreboard

| Area | Design Debt | Priority | Rationale |
| --- | --- | --- | --- |
| Shared Input / Textarea / Select primitives | **High** | **P1** | Theme OK but `rounded-lg`, weak focus, no helper/`aria-invalid`; Select/Textarea unused while raw fields dominate |
| Labels, required indicators, helper text | **High** | **P1** | No Label/helper system; `*` / uppercase recipes diverge; Input labels orphaned without `id` |
| Validation / error / success states | **Medium–High** | **P1** | Zod+error path exists but rare; most forms HTML-only or `alert()`; no success field state; emoji success on create |
| Form section layouts / field grouping | **Medium** | **P2** | Sectioned create form Keep; section chrome indigo/gray/`font-black` |
| Action bars (primary/secondary/destructive) | **High** | **P1** | No shared form action bar; gray Cancel borders; primary-only full-width elsewhere; not Command Surface |
| Lead create/edit forms | **High** | **P1** | Dual create paths (page vs modal); indigo hero; `input-premium` vs Input; Admin edit gray island |
| Inline edit patterns (Lead detail) | **Medium** | **P1** | `input-premium` + slate/emoji tags; instant-save OK — chrome + a11y debt |
| Dialog / modal forms | **High** | **P1** | Shared Modal barely used; hand-rolled overlays everywhere; Dialog unused |
| Admin form surfaces (sample) | **High** | **P1** | gray-900 + indigo headers on Project/Team/Branding; UserAccount is reference Keep |
| Token / radius / typography / focus vs DLS v1.2 | **High** | **P1** | Parallel recipes vs `rounded-theme` + `focus-visible` + `type-label` |
| Accessibility (labels, aria-invalid, focus, contrast) | **High** | **P1** | No `aria-invalid`; rare `htmlFor`/`id`; Modal close unlabeled; Button strips outline |

---

## Audit by Area

### 1. Shared Input / Textarea / Select primitives

**Files:** `telecaller-app/src/shared/components/ui/Input.tsx`, `Select.tsx`, `Textarea.tsx`, `Checkbox.tsx`  
**Adjacent CSS:** `telecaller-app/src/index.css` — `.input-premium` (~782–807)  
**Live consumers of shared Input:** `AddLeadModal.tsx`, `UserAccountModal.tsx` only. **Select / Textarea / Checkbox: no feature imports.**

#### Keep

- Built-in `label` + `error` API on Input/Select/Textarea/Checkbox — right abstraction; do not replace with a heavy form library wrapper in Wave 4.
- Surfaces already on `bg-theme-surface` / `border-theme-border` / `text-theme-text` with danger border when `error` set.
- Checkbox horizontal label layout + error span — usable once adopted.
- `.input-premium` brand focus glow (primary tint) — useful *visual idea*; formalize into shared primitive rather than a second control language.
- `btn-premium-primary` / `btn-premium-secondary` exist and map to brand gradient — align with Button / Command Surface later; do not invent a third button set.

#### Problems

**P1 — Dead inventory vs parallel live recipe**

- **Current issue:** Select/Textarea/Checkbox unused; most forms hand-roll `<input>` / `<select>` / `<textarea>` with either `input-premium` or `dark:bg-gray-900`.
- **Why it hurts enterprise UX:** Same job, three looks; first-time users learn one control in Add Lead modal and another on New Submission page.
- **Recommendation:** Phase 2 — harden shared primitives as the **only** form field recipe; Phase 3 — migrate consumers; treat `.input-premium` as a CSS bridge into Input (or deprecate after migration).
- **Why — expected user benefit:** One field language from Login → Lead create → Admin.

**P1 — Radius / focus vs DLS v1.2**

- **Current issue:** Primitives use `rounded-lg` + `focus:ring-1 focus:ring-theme-ring` (always-on `:focus`). `.input-premium` uses `border-radius: 0.875rem` + 4px glow on `:focus`. Wave 3 filters use `rounded-theme` + `focus-visible:ring-2`.
- **Why it hurts enterprise UX:** Filter chrome and form chrome feel like different products.
- **Recommendation:** Prefer `rounded-theme`; adopt Wave 1.5 `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring`; optional quiet glow as additive, not a fork.
- **Why — expected user benefit:** Predictable focus from filter → form → table.

**P2 — Textarea surface mismatch**

- **Current issue:** Textarea defaults `bg-theme-card`; Input/Select use `bg-theme-surface`.
- **Recommendation:** Align default fill to one surface token (prefer `theme-surface` inside cards).
- **Why — expected user benefit:** Notes fields do not “pop” differently from text fields.

**P2 — No `helperText` / success prop**

- **Current issue:** Only `error` string; no helper or success slot.
- **Recommendation:** Optional `helperText` (muted) + keep `error` precedence; defer success chrome unless needed.
- **Why — expected user benefit:** Format hints without inventing italic gray one-offs.

#### Design Debt: High | Priority: P1

---

### 2. Labels, required indicators, helper text

**Files:** primitives above; consumers e.g. `LeadSubmissionForm.tsx`, `AddLeadModal.tsx`, `CallLoggingForm.tsx`, `LeadDetailsProfile.tsx`, `ProjectFormModal.tsx`  
**Missing:** `Label.tsx`, `Switch.tsx`, any `FormField` / `helperText` API.

#### Keep

- Uppercase micro-labels on dense lead tools — scannable when consistent; keep density, quiet weight.
- Visual required `*` on LeadSubmissionForm name/phone — clear for first-time create.
- UserAccountModal checkboxes with working `htmlFor` / `id` — reference a11y pattern.

#### Problems

**P1 — Orphaned labels on shared Input**

- **Current issue:** `Input` renders `<label htmlFor={id}>` but AddLeadModal / UserAccountModal rarely pass `id` → labels do not activate fields.
- **Why it hurts enterprise UX:** Click-label-to-focus fails; screen readers lose association.
- **Recommendation:** Auto-generate stable id when `label` set and `id` omitted; wire `htmlFor` / `aria-describedby` for error/helper.
- **Why — expected user benefit:** Labels “just work” without every consumer remembering ids.

**P1 — No shared required / helper grammar**

- **Current issue:** Mix of `text-red-500 *`, HTML `required` only, or nothing; helpers are ad-hoc italic gray if present.
- **Why it hurts enterprise UX:** Users cannot predict which fields are mandatory until submit fails.
- **Recommendation:** Presentation contract: optional `required` indicator (theme-danger `*` or “(required)” via `type-label`); `helperText` muted under field; do **not** change which fields are required in business rules.
- **Why — expected user benefit:** Faster correct fills on first visit.

**P2 — Label weight / type vs DLS**

- **Current issue:** Primitive labels `text-xs font-bold`; consumers use `text-[9px]`–`[11px] font-bold|black uppercase` + slate.
- **Recommendation:** Prefer `type-label` / `font-semibold text-theme-muted`; avoid `font-black` on field labels.
- **Why — expected user benefit:** Same quiet chrome as Wave 3 filters.

#### Design Debt: High | Priority: P1

---

### 3. Validation / error / success states

**Reference Keep path:** `AddLeadModal.tsx` + `leadSchema`; `UserAccountModal.tsx` + `userSchema` → `Input` `error=`.  
**Other paths:** HTML `required` (LeadSubmission, Admin modals); `alert()` (DiscountManager, some Admin); Login rose error box.

#### Keep

- Zod → per-field `error` string under Input — **best-in-app** validation presentation; reuse this pattern visually everywhere (without changing schemas in Phase 2–3).
- Danger border + danger text on Input when `error` set — correct semantic direction.
- LeadSubmission success panel with dual CTAs (Create another / View list) — strong completion UX (quiet emoji later).

#### Problems

**P1 — Validation presentation is not systemic**

- **Current issue:** Most forms never pass `error`; AdminLead/Project use browser native required only; some flows `alert()`.
- **Why it hurts enterprise UX:** Errors feel random (banner vs toast vs alert vs inline).
- **Recommendation:** Phase 2 — primitive support (`error`, `aria-invalid`, describedby). Phase 3 — wire **presentation** where errors already exist. Phase 4 — expand inline error display where UX needs it **without** inventing new business rules (schemas stay owned by validation layer).
- **Why — expected user benefit:** Errors appear next to the field that failed.

**P1 — No `aria-invalid` anywhere**

- **Current issue:** Grep shows **0** `aria-invalid` in `src/`.
- **Recommendation:** When `error` is set, set `aria-invalid={true}` + `aria-describedby` on control.
- **Why — expected user benefit:** AT users get the same signal sighted users get from red borders.

**P2 — Success / celebration chrome**

- **Current issue:** LeadSubmission success uses emoji in title + bounce animation.
- **Recommendation:** Keep dual CTAs; quiet emoji per Emoji Policy; prefer solid success icon without bounce theater.
- **Why — expected user benefit:** Professional completion without gamified noise.

**P2 — Login / settings error boxes use raw rose/red**

- **Recommendation:** Prefer `text-theme-danger` / `border-theme-danger` / surface wash — presentation only.
- **Why — expected user benefit:** Errors match brand danger token in dark/light.

#### Design Debt: Medium–High | Priority: P1

---

### 4. Form section layouts / field grouping

**Files:** `LeadSubmissionForm.tsx` (Profile / Requirement / Meta sections); `ProjectFormModal.tsx` (two-column General / …); `AddLeadModal.tsx` (grid pairs); `Section.tsx` (unused).

#### Keep

- LeadSubmission **sectioned** create (icon + uppercase section title + 2-col grid) — first-time users parse faster than a flat dump; **Keep IA**.
- ProjectFormModal two-column split for dense project fields — valid for modal editors.
- AddLeadModal responsive 2-col for name/phone — good density.

#### Problems

**P2 — Section chrome indigo / gray / font-black**

- **Current issue:** Project sections `text-indigo-500`; LeadSubmission section borders `border-gray-100`; titles `font-black` / `font-bold` mix. Shared `Section` unused (`font-extrabold`).
- **Why it hurts enterprise UX:** Section headers compete with brand accent inconsistently.
- **Recommendation:** Section title = `type-label` / `font-semibold text-theme-accent` + `border-theme-border`; optional thin Section primitive adoption — **no layout restructure**.
- **Why — expected user benefit:** Same grouping, quieter brand-aligned headers.

**P2 — No shared FieldGroup spacing contract**

- **Current issue:** `space-y-4` / `gap-4` / `gap-6` vary.
- **Recommendation:** Document 8pt rhythm (`gap-3` / `gap-4`) in Form Contract draft; apply lightly in Phase 2 shells.
- **Why — expected user benefit:** Predictable scan rhythm.

#### Design Debt: Medium | Priority: P2

---

### 5. Action bars (primary / secondary / destructive) — Command Surface alignment

**DLS reference:** [`ui-registry.md`](../ui-registry.md) §3d Action hierarchy — Primary = accent; Secondary = outline/border Cancel; Destructive = `text-theme-danger` (not loud fills by default).  
**Files:** `Button.tsx`; footers in AddLeadModal, UserAccountModal, AdminLeadModal, ProjectFormModal, TeamConfigModal, MapCallLogModal; primary-only bars in CallLoggingForm, LeadSubmissionForm, DiscountManager, SiteVisitScheduler.

#### Keep

- Cancel + Save/Create footer pattern on modal forms — correct IA for dismissible editors.
- Shared `Button` variants (`primary` / `outline` / `danger` / `ghost`) — map cleanly to Command Surface roles.
- UserAccountModal footer via `Modal` `footer` slot + `Button` outline/primary — **reference** action bar.

#### Problems

**P1 — No shared form action-bar recipe**

- **Current issue:** Every modal hand-rolls footer buttons; many Cancel styles use `border-gray-300` / `hover:bg-gray-50` instead of theme outline.
- **Why it hurts enterprise UX:** Same Cancel looks different in Add Lead vs Admin Lead vs Project.
- **Recommendation:** Phase 2 — document + optional thin `FormActions` / Modal footer convention: Secondary Cancel (`Button outline` / Command Surface secondary) + Primary submit (`Button primary`) + Destructive as text/`danger` only when needed. Align with §3d; do not change submit wiring.
- **Why — expected user benefit:** Muscle memory for Cancel vs Save across CRM.

**P1 — Primary-only full-width bars lack secondary escape**

- **Current issue:** CallLogging, Discount, SiteVisit schedule, LeadSubmission commit — primary only (page context sometimes OK).
- **Recommendation:** Keep primary-only where navigation already provides exit; where modal-like, ensure Cancel/close. Presentation: use `btn-premium-primary` **or** `Button primary` consistently — pick one mapping in Form Contract.
- **Why — expected user benefit:** Less “am I trapped?” on dense tool cards.

**P2 — Button focus / radius**

- **Current issue:** `Button` uses `rounded-lg` + `focus:outline-none` without `focus-visible` ring.
- **Recommendation:** `rounded-theme` + Wave 1.5 focus-visible imprint.
- **Why — expected user benefit:** Keyboard users see the same ring as filters.

**P2 — Destructive inconsistency**

- **Current issue:** Site visit cancel = underline link; removals = `text-red-500`; emoji Save Quote.
- **Recommendation:** Destructive = `text-theme-danger` text button; strip persistent emoji from actions (Emoji Policy).
- **Why — expected user benefit:** Danger actions readable without rainbow/emoji noise.

#### Design Debt: High | Priority: P1

---

### 6. Lead create / edit forms

**Files:**  
- Page create: `LeadSubmissionForm.tsx`  
- Modal create: `AddLeadModal.tsx`  
- Admin edit/create: `AdminLeadModal.tsx`

#### Keep

- Two entry points (workspace “New Submission” page vs quick Add modal) — product IA; **do not merge flows** in Wave 4 unless product asks.
- AddLeadModal Zod + Input errors — Keep as validation *presentation* reference.
- LeadSubmission sectioned layout + post-create success CTAs — Keep structure.
- AdminLeadModal Cancel/Save footer — Keep behavior; restyle only.

#### Problems

**P1 — Dual create chrome (indigo premium vs mixed Input)**

- **Current issue:** LeadSubmission = indigo/purple gradient hero + `input-premium` + `btn-premium-primary`, no Cancel. AddLeadModal = hand-rolled slate overlay + shared Input for some fields + raw selects + gray-ish footer.
- **Why it hurts enterprise UX:** Creating a lead teaches two UIs for one job.
- **Recommendation:** Phase 3 presentation unify on shared field primitives + theme header (brand gradient OK if using **theme** brand tokens — not hardcoded indigo/purple). Preserve both routes and submit handlers.
- **Why — expected user benefit:** Same field language whether page or modal.

**P1 — AdminLeadModal gray-900 island**

- **Current issue:** `dark:bg-gray-900`, `rounded-md`, gray Cancel border; no shared Input/Select; no inline Zod errors.
- **Recommendation:** Remap to `theme-surface` fields + `rounded-theme` + shared primitives; keep form state/onSave.
- **Why — expected user benefit:** Admin edit matches daily Leads chrome.

**P2 — Emoji / font-black on create success & headers**

- **Recommendation:** Quiet titles to `font-semibold`/`font-bold`; success without 🎉 in persistent copy.
- **Why — expected user benefit:** Enterprise tone aligned with Waves 1–3.

#### Design Debt: High | Priority: P1

---

### 7. Inline edit patterns (Lead detail)

**File:** `telecaller-app/src/features/leads/components/LeadDetailsProfile.tsx`  
**Related tool forms on detail:** `CallLoggingForm.tsx`, `SiteVisitScheduler.tsx`, `DiscountManager.tsx`, `LoanEMICalculator.tsx`, `WhatsAppAssistant.tsx`

#### Keep

- Compact profile DL + selective inline editors (tags, referrer, commission) — high productivity; **Keep instant-save model** (no forced Save/Cancel bar unless product asks).
- Tool cards (`card-premium`) for call log / visit / discount / EMI / WhatsApp — domain grouping Keep.
- CallLogging template chips + notes — useful; quiet chrome later.

#### Problems

**P1 — `input-premium` + slate / emoji on detail**

- **Current issue:** Tags `<select className="input-premium">` with emoji option labels (🔴 High Budget…); micro labels `text-[9px] text-slate-400`; status chips red/green raw.
- **Why it hurts enterprise UX:** Violates Emoji Policy on persistent options; slate islands vs theme profile.
- **Recommendation:** Theme labels; Lucide or color-dot + text for tags (presentation); keep toggle-on-change behavior.
- **Why — expected user benefit:** Faster scan; professional detail pane.

**P2 — Tool forms: font-black + primary-only + alert validation**

- **Current issue:** Section titles `font-black`; DiscountManager validates via `alert()`; SiteVisit rose gradient override; LoanEMI “Save Quote 💾”.
- **Recommendation:** `type-label` / `font-semibold`; theme danger for errors when presentation phase allows; strip action emoji; align inputs to shared primitive.
- **Why — expected user benefit:** Detail tools feel like the same CRM as the list.

**P2 — Inline edit a11y**

- **Current issue:** Unassociated labels; no confirmation of save beyond silent write.
- **Recommendation:** Associate labels; optional quiet “Saved” via existing toast patterns only if already used nearby — **do not** invent new save UX.
- **Why — expected user benefit:** Discoverable editable fields.

#### Design Debt: Medium | Priority: P1

---

### 8. Dialog / modal forms

**Shared:** `Modal.tsx`, `Dialog.tsx` (confirm wrapper — **unused** in features), `Drawer.tsx` (unused by features).  
**Hand-rolled:** `AddLeadModal`, `AdminLeadModal`, `ProjectFormModal`, `TeamConfigModal`, `MapCallLogModal`, `CallLogModal`, `CampaignBroadcastModal`, `BulkLeadImportModal`, `LinkLeadModal`, `CallAuditRatingModal`, etc.

#### Keep

- Shared `Modal` API: `title`, `footer`, sizes, `bg-theme-card` / `theme-overlay` / body scroll — **canonical shell** once adopted.
- `Dialog` Cancel/Confirm via `Button` — good confirm pattern for later (destructive confirms).
- Footer slot `justify-end space-x-3` — right action hierarchy layout.

#### Problems

**P1 — Most form modals fork the shell**

- **Current issue:** Local `fixed inset-0 bg-black/50|60` + custom header/close; radius `rounded-xl` / `2xl` / `lg` mix; close `X` often unlabeled.
- **Why it hurts enterprise UX:** Overlay/escape/focus behavior drifts; looks like multiple products.
- **Recommendation:** Phase 3 — prefer shared `Modal` for form hosts (UserAccount already does); presentation-only migration of chrome; **do not** change open/close business triggers.
- **Why — expected user benefit:** One modal language; predictable dismiss.

**P1 — Modal a11y gaps**

- **Current issue:** No `role="dialog"` / `aria-modal`; no focus trap; close button lacks `aria-label`.
- **Recommendation:** Phase 2 primitive harden (labels + dialog semantics); focus trap can be Phase 4 if risky — at minimum labeled close + Escape if already present.
- **Why — expected user benefit:** Keyboard/AT parity with sighted mouse users.

**P2 — Dialog unused; Drawer unused**

- **Recommendation:** Prefer Dialog for confirms instead of `window.confirm` where presentation waves touch those flows; do not force Drawer adoption for forms.
- **Why — expected user benefit:** Confirms match Button/Command Surface.

#### Design Debt: High | Priority: P1

---

### 9. Admin form surfaces (sample)

**Files:** `UserAccountModal.tsx` (reference), `ProjectFormModal.tsx`, `TeamConfigModal.tsx`, `BrandingSettingsTab.tsx`, samples `IntegrationsSettingsTab.tsx`, `RolesSettingsTab.tsx`, `CustomFieldsSettingsTab.tsx`

#### Keep

- **UserAccountModal** = shared Modal + Input + Zod errors + checkbox `htmlFor`/`id` — **gold reference** for Admin forms Wave 4.
- Branding accordion / theme library structure — Keep IA; restyle fields only.
- ProjectFormModal two-column editor — Keep density.

#### Problems

**P1 — gray-900 + indigo Admin recipe**

- **Current issue:** Project/Team/Branding raw inputs `dark:bg-gray-900 rounded-lg`; section headers `text-indigo-500`; Cancel gray borders; Roles/Integrations red/gray error chips (`text-red-500`, `border-gray-*`).
- **Why it hurts enterprise UX:** Admin tables/filters are v1.1/v1.2; opening a form drops to Wave-0.
- **Recommendation:** Remap fields to shared primitives / theme tokens; indigo → `text-theme-accent`; errors → `theme-danger`.
- **Why — expected user benefit:** Continuous Admin experience from table → form.

**P2 — Settings density / validation presentation**

- **Current issue:** Integrations shows tiny `text-[8px] text-red-500` “Error” badges; Roles uses red banner.
- **Recommendation:** Prefer field-level `error` / helper under controls (presentation); keep submit handlers.
- **Why — expected user benefit:** Errors next to the broken field.

**P2 — Team cards / non-form Admin indigo**

- **Note:** Wave 3 deferred “Admin Users team-card / non-table indigo” — adjacent; touch only when on form-like surfaces in Phase 3 sample scope.
- **Recommendation:** Stay inside form fields/modals unless user expands scope.

#### Design Debt: High | Priority: P1

---

### 10. Token / radius / typography / focus alignment with DLS v1.2

**Reference:** `ui-registry.md` v1.2 — `theme-*`, `rounded-theme`, `type-*`, Wave 1.5 focus-visible, §3d Command Surface (action hierarchy for form footers).

#### Keep

- Where primitives already use `theme-*` — good base.
- Brand CSS variables inside `.input-premium` focus (primary mix) — brand-aware; reconcile with ring tokens.
- Filter command surfaces as the **north star** for quiet chrome density.

#### Problems

**P1 — Four visual generations in one app**

| Recipe | Radius | Focus | Labels |
| --- | --- | --- | --- |
| Wave 3 filters | `rounded-theme` | `focus-visible:ring-2` | `type-label` / semibold |
| Shared Input | `rounded-lg` | `focus:ring-1` | `font-bold` |
| `.input-premium` | `0.875rem` | glow `:focus` | consumer-owned |
| Admin gray-900 | `rounded-md\|lg` | uneven | indigo / uppercase |

- **Recommendation:** Phase 2 collapses rows 2–4 toward row 1 language without changing filter IA.
- **Why — expected user benefit:** One CRM generation end-to-end.

**P1 — Typography weight noise**

- **Current issue:** Widespread `font-black` / `font-extrabold` on form titles and tool headers.
- **Recommendation:** Prefer `font-semibold` / `font-bold` / `type-page-title` where appropriate; match Wave 2/3 quieting.
- **Why — expected user benefit:** Less fatigue; hierarchy from layout not weight spam.

**P2 — Hardcoded indigo/purple / white rgba**

- **Current issue:** LeadSubmission hero `from-indigo-600 via-purple-600`; `.input-premium` light bg `rgba(255,255,255,0.5)`.
- **Recommendation:** Theme brand gradient / `theme-surface` fills.
- **Why — expected user benefit:** Branding settings actually flow into forms.

#### Design Debt: High | Priority: P1

---

### 11. Accessibility (labels, aria-invalid, focus, contrast)

#### Keep

- Login pairs some `htmlFor`/`id` on email/password.
- UserAccountModal checkbox labeling.
- Theme danger color available for errors (contrast-friendly if used consistently).

#### Problems

**P1 — Label association & `aria-invalid`**

- **Current issue:** Most labels unassociated; shared Input broken without `id`; **zero** `aria-invalid`.
- **Recommendation:** Auto-id + `aria-invalid` + `aria-describedby` on primitives; Phase 3 consumers pass through.
- **Why — expected user benefit:** Forms usable with keyboard and AT.

**P1 — Focus visibility uneven**

- **Current issue:** Button outline removed; input-premium/Input use `:focus` not `:focus-visible`; modals weak focus management.
- **Recommendation:** Unify on Wave 1.5 focus-visible imprint across Button + fields + footer actions.
- **Why — expected user benefit:** Visible keyboard path through forms.

**P2 — Contrast / muted slate**

- **Current issue:** `text-slate-400` / gray-400 labels on detail; gray Cancel on light cards.
- **Recommendation:** `text-theme-muted` / `text-theme-text` with dark variants.
- **Why — expected user benefit:** Readable labels in both themes.

**P2 — Touch targets on micro controls**

- **Current issue:** Dense `text-[9px]` labels and tight icon closes.
- **Recommendation:** Keep dense fields where productivity requires; ensure icon buttons ≥ hit target / labeled.
- **Why — expected user benefit:** Fewer mis-taps on mobile detail tools.

#### Design Debt: High | Priority: P1

---

## Cross-Cutting Findings

1. **Primitive-first is already half done** — Input/Select/Textarea/Checkbox exist; Wave 4 should **activate and harden** them, not build Formik-style infrastructure.
2. **`.input-premium` is the de-facto lead CRM control** — reconcile into shared Input (API + tokens) or formally deprecate after migration; do not leave both forever.
3. **Zod+inline error is the presentation north star** (AddLead / UserAccount) — expand *display* patterns; do not rewrite schemas in Phases 2–3.
4. **Modal shell fragmentation** mirrors pre–Wave-3 filter fragmentation — same outside-in fix: shared shell → consumers.
5. **Command Surface §3d already defines action hierarchy** — form footers should adopt it; Form Contract drafts field-level rules and points at §3d for actions (no conflicting button language).
6. **Emoji Policy residuals** — tag options, success titles, Save Quote — quiet in consumer phase.
7. **Guiding question filter:** Do not flatten LeadSubmission sections or merge create routes “for consistency” if it slows first-time understanding — unify **chrome**, preserve **IA**.

---

## Recommended Wave 4 phasing

| Phase | Focus | Gate |
| --- | --- | --- |
| **Phase 1** | This audit | **STOP** — user review |
| **Phase 2** | Shared form primitives (Input/Select/Textarea/Checkbox harden: `rounded-theme`, focus-visible, helperText, auto-id, `aria-invalid`, error describedby; Button focus/radius; optional FormActions / Modal footer convention; `.input-premium` bridge or alias) — **NO form logic changes** | Validation doc |
| **Phase 3** | Consumer adoption (Leads create/edit, detail tools/inline, Admin modals/settings samples, modal shell preference) — **presentation only** | Adoption notes + validation |
| **Phase 4** | Validation presentation pass (wire inline errors where UX needs; Modal dialog semantics hardening; no schema/business-rule rewrites unless separately scoped) | Validation |
| **Phase 5** | Promote **Form Contract** → DLS **v1.3** in `ui-registry.md` | User authorize bump |

---

## Explicit Non-Goals

- No form UI implementation in Phase 1  
- No DLS **v1.3** bump in Phase 1  
- No new form framework / parallel field component family  
- No validation schema / Zod rule changes as part of chrome work (Phase 4 = presentation of errors, not new business rules)  
- No Firestore / submit handler / routing changes  
- No merging LeadSubmission + AddLeadModal into one flow  
- No changing instant-save inline edit semantics on lead detail  
- No filter/table reopen (Wave 2–3 closed)  
- No inventing screenshot PNGs as blockers  

---

## Regression Checklist

- [ ] Lead create (page submission) still submits and shows success / duplicate toast behavior  
- [ ] Add Lead modal still validates (Zod) and submits; Cancel/close dismisses without write  
- [ ] Admin lead edit/create still saves via existing `onSave`  
- [ ] User account create/edit still saves; role/permission checkboxes unchanged  
- [ ] Project / team modals still save; image upload still works  
- [ ] Lead detail inline tag/referrer/commission still persist on change  
- [ ] Call log / site visit / discount / EMI / WhatsApp tool submits unchanged  
- [ ] Branding / integrations / roles settings still save  
- [ ] Login still authenticates; error display still visible  
- [ ] Theme + dark mode on all touched form chrome  
- [ ] Keyboard: focus rings visible; labels activate fields; icon closes labeled  
- [ ] No regression to Leads table/filters/command surfaces (Wave 2–3)  
- [ ] Modal open/close / scroll lock behavior preserved where Modal is adopted  

---

## Don't Improve This / Do Not Change

Hard scope fence — different from Keep:

- Validation **schemas** (`leadSchema`, `userSchema`, …) and which fields are required  
- Submit handlers, `addLead` / `onSave` / Firestore writes  
- Form library / local state shapes / `useState` form models  
- Business rules (duplicate merge, assignment, permissions, branding compute)  
- Instant-save vs explicit-save product decisions on lead detail  
- Filter / DataTable / dashboard contracts (already v1.1–v1.2)  
- Building a new forms product (multi-step wizards, schema builders, AI fill)  

### Implementation guideline — outside-in

1. Harden shared Input / Select / Textarea / Checkbox (+ Button focus/radius)  
2. Modal footer / Form action convention aligned with Command Surface §3d  
3. Bridge or retire `.input-premium` as a second language  
4. Lead create/edit + detail tools (presentation)  
5. Admin modal/settings samples  
6. Prefer shared Modal shells for form hosts  
7. Validation presentation pass  
8. Docs → DLS v1.3 Form Contract (Phase 5 only)  

---

## Draft Form Contract (for later DLS — draft only, do NOT bump to v1.3)

*To be formalized in `ui-registry.md` after Phase 2–5 (expected **v1.3**). Draft for alignment only — not authoritative yet. Action bars **inherit** Command Surface §3d.*

```
Form ecosystem
  Field          — shared Input / Select / Textarea / Checkbox only; no parallel recipes
  Label          — type-label / font-semibold; auto-id + htmlFor; required marker optional
  Helper         — muted helperText under field; error replaces helper when present
  Error          — text-theme-danger + border-theme-danger; aria-invalid + aria-describedby
  Section        — theme accent/muted section title; border-theme-border; 8pt gaps
  Modal host     — shared Modal; labeled close; theme overlay; footer slot
  Action bar     — Command Surface hierarchy (Primary Save / Secondary Cancel / Destructive text)
  Inline edit    — same field chrome; preserve existing save timing
  Motion         — color/border transitions; no ornamental bounce/pulse on persistent form chrome
```

| Concern | Draft rule |
| --- | --- |
| **Surface** | Fields on `bg-theme-surface` (or card when nested); `border-theme-border`; **`rounded-theme`** |
| **Text** | `text-theme-text` / `text-theme-muted`; labels `type-label`; avoid `font-black` on fields/headers |
| **Focus** | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring` |
| **Error** | Inline under field; `aria-invalid`; no `alert()` for routine field errors in new chrome |
| **Required** | Visual indicator when product marks required; do not change required set under presentation waves |
| **Actions** | **Same as Command Surface §3d** — Primary accent; Secondary outline Cancel; Destructive `text-theme-danger` |
| **Buttons** | Prefer shared `Button` (or mapped `btn-premium-*` equivalents) — one hierarchy |
| **Modals** | Prefer shared `Modal` / `Dialog`; no new overlay forks |
| **Premium CSS** | `.input-premium` may alias shared field styles during migration — single end state |
| **Empty / success** | Prefer theme success + dual CTAs; quiet emoji |
| **A11y** | Labels, focus-visible, aria-invalid, labeled icon buttons, contrast via theme tokens |
| **Non-goals** | No schema/handler/Firestore changes; no second form framework under this contract |

---

## Appendix — Quick code anchors for Phase 2

| Concern | Anchor |
| --- | --- |
| Input primitive | `shared/components/ui/Input.tsx` |
| Select / Textarea / Checkbox | `shared/components/ui/Select.tsx`, `Textarea.tsx`, `Checkbox.tsx` |
| Button | `shared/components/ui/Button.tsx` |
| Modal / Dialog | `shared/components/ui/Modal.tsx`, `Dialog.tsx` |
| Premium field CSS | `index.css` `.input-premium` |
| Premium buttons | `index.css` `.btn-premium-primary` / `.btn-premium-secondary` |
| Zod + Input reference | `AddLeadModal.tsx`, `UserAccountModal.tsx` |
| Page create | `LeadSubmissionForm.tsx` |
| Admin lead edit | `AdminLeadModal.tsx` |
| Inline profile | `LeadDetailsProfile.tsx` |
| Detail tool forms | `CallLoggingForm.tsx`, `SiteVisitScheduler.tsx`, `DiscountManager.tsx`, `LoanEMICalculator.tsx`, `WhatsAppAssistant.tsx` |
| Admin project / team | `ProjectFormModal.tsx`, `TeamConfigModal.tsx` |
| Branding sample | `settings/BrandingSettingsTab.tsx` |
| Auth | `features/auth/pages/Login.tsx` |
| Command Surface (actions) | `ui-registry.md` §3d |
| Validation schemas (do not change in Phases 2–3) | `shared/validation/leadSchema.ts`, `userSchema.ts` |

---

## Phase gate

**Stop after this audit.** User reviews findings before Phase 2 (shared form primitives). No form UI redesign and no DLS v1.3 in Phase 1. Wave 3 remains **officially closed**; **v1.2** stays production for filters.
