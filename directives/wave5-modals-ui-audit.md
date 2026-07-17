# Wave 5 — Modals & Drawers UI/UX Audit

**Scope:** Shared overlay primitives (`Modal`, `Dialog`, `Drawer`) + high-traffic modal / sheet / drawer consumers (Leads create/edit hosts, Admin form modals, TemplateCenter / BulkLeadImport residuals, utility call/link/campaign modals, mobile filter sheet, dashboard / dial / profile drawers, sample confirm/`alert` islands).  
**Out of scope (this phase):** UI implementation / redesign, open/close orchestration changes, feature business logic, Firestore, Zod / schemas, inventing screenshot PNGs, DLS **v1.4** bump.  
**Constraint:** Presentation + a11y modernization recommendations only. Reuse / harden existing `Modal` / `Dialog` (and evolve `Drawer` as the sheet sibling) — **do not** invent a third overlay system. Align with Form Contract §3e, Command Surface §3d, FormActions, Motion §9, Accessibility §12.  
**Density target:** ~70% Linear/Stripe content density + ~30% Salesforce-like chrome (aligned with Waves 1–4).  
**Guiding question:** Would a first-time user understand this faster than before? If no, do not change it.  
**Governed by:** [`ui-registry.md`](../ui-registry.md) Design Language **v1.3** (Waves 1–4 closed — Form Contract §3e **canonical**). Wave 4 residuals explicitly deferred here: modal focus trap; TemplateCenter sheet / BulkLeadImport host migration; confirm/`alert` → dialog.

**Sources reviewed:** `memory.md`, `ui-registry.md` (v1.3 §3d–3e, §9 Motion, §12 A11y, imprint Modal sheet pattern), `directives/wave4-complete.md`, `wave4-phase3-validation.md`, `wave4-phase4-validation.md`, `wave4-phase4-agent4-notes.md`; primitives `Modal.tsx`, `Dialog.tsx`, `Drawer.tsx`, `FormActions.tsx`; consumers `AddLeadModal`, `AdminLeadModal`, `ProjectFormModal`, `TeamConfigModal`, `UserAccountModal`, `CallLogModal`, `MapCallLogModal`, `LinkLeadModal`, `CampaignBroadcastModal`, `TemplateCenterModal`, `BulkLeadImportModal`, `CallAuditRatingModal`, `ShortcutsModal`, `LeadListMobileFilterSheet`, `LeadBinWorkspace` mobile sheet, `CustomizerDrawer`, `MobileDrawer`, `DialPadDrawer`, `MobileProfileDrawer`, `MergeSettingsTab` merge overlay; host `ModalHost.tsx`.

---

## Executive Summary

Wave 4 successfully made **shared `Modal` the default form host** for high-traffic Leads + Admin create/edit surfaces, with Form Contract footers (`FormActions`), theme overlay, `role="dialog"` / `aria-modal` / `aria-labelledby`, Escape, and labeled close. That is a strong Keep.

Wave 5 debt is **overlay completeness and consistency**, not a missing host:

1. **Focus trap / return-focus / initial focus** — explicitly deferred from Wave 4; shared `Modal` locks body scroll and Escape-dismisses, but Tab can escape the dialog and focus does not restore on close.
2. **Dead / underused siblings** — shared `Dialog` (confirm pattern) and shared `Drawer` exist in `ui/` but have **zero feature imports**. Live confirm UX still uses `window.alert` / `confirm`; live drawers are hand-rolled forks.
3. **Sheet residuals** — `TemplateCenterModal` (bottom sheet / split layout) and `BulkLeadImportModal` (custom centered wizard) were polished in Wave 4 but remain outside shared `Modal`. TemplateCenter lacks Escape; BulkLeadImport lacks Escape.
4. **Pre-DLS overlay islands** — `CallAuditRatingModal`, `ShortcutsModal`, `MergeSettingsTab` merge assistant, and `DialPadDrawer` still use slate/indigo/black overlays, unlabeled closes, and/or no dialog semantics.
5. **Mobile sheets** — `LeadListMobileFilterSheet` is a Wave 3 Keep (Escape + labeled close + theme tokens) but lacks `role="dialog"` / `aria-modal` / labelled title wiring; dashboard / profile / dial drawers diverge from each other and from shared `Drawer`.

**Overall readiness: High for Phase 2** — clear outside-in path: harden `Modal` (+ optional sheet/size variants) → promote `Dialog` for confirms → align `Drawer` / sheet variant → migrate residuals. **No open/close logic or Firestore changes required for a successful Wave 5.** DLS stays **v1.3** until Phase 5 promotes a Modal/Drawer Contract to **v1.4**.

---

## Design Debt Scoreboard

| Area | Design Debt | Priority | Rationale |
| --- | --- | --- | --- |
| Shared Modal primitive | **Medium** | **P1** | Strong Form Contract host; missing focus trap / return-focus / mobile sheet motion parity |
| Shared Dialog primitive | **High** | **P1** | Thin Confirm wrapper exists; **unused** while `alert()`/`confirm()` dominate feedback |
| Mobile sheet / drawer patterns | **High** | **P1** | Shared `Drawer` unused; 4+ hand-rolled drawers + filter/bin sheets diverge |
| Focus trap / keyboard / Escape / labeled close | **High** | **P1** | Wave 4 residual; shared Modal Escape OK; sheets/islands incomplete; no trap anywhere |
| Header / body / footer conventions | **Low–Medium** | **P2** | FormActions + Modal footer Keep on major hosts; sheet footers / Dialog unused |
| Overlay / animation / motion policy | **Medium** | **P2** | Imprint sheet pattern vs centered Modal only; some slate overlays; motion mostly functional |
| High-traffic modal consumers (Leads + Admin) | **Low** | **P2** | Mostly on shared Modal + FormActions — adopt Phase 2 a11y inheritance |
| Sheet residuals (TemplateCenter, BulkLeadImport) | **High** | **P1** | Explicit Wave 4 deferral; custom shells; Escape gaps; wizard/sheet IA Keep |
| Token / radius / typography vs DLS v1.3 | **Medium** | **P2** | Shared Modal aligned; Shortcuts / CallAudit / DialPad / Merge still pre-theme islands |
| Accessibility (focus, aria-modal, labelledby) | **High** | **P1** | Baseline on shared Modal; trap + island semantics missing; Drawer has no dialog role |

---

## Audit by Area

### 1. Shared Modal primitive

**File:** `telecaller-app/src/shared/components/ui/Modal.tsx`  
**Contract today:** Form Contract §3e modal hosts — prefer shared shell; theme overlay; `rounded-theme`; dialog a11y baseline; footer right-aligned for FormActions.

#### Keep

- Single centered host already adopted by AddLead, AdminLead, Project, Team, UserAccount, CallLog, MapCallLog, LinkLead, Campaign, Roles modal — **do not fork a second centered dialog**.
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` via `useId`, close `aria-label="Close"`, Escape dismiss, body scroll lock.
- Theme tokens: `bg-theme-overlay`, `bg-theme-card`, `border-theme-border`, `rounded-theme`, quiet `font-semibold` title (no `font-black`).
- Structured header / scrollable body / optional footer slot — FormActions-friendly.
- Size scale `sm|md|lg|xl` — enough for most form hosts; Project uses `className` override for wider when needed.

#### Problems

**P1 — No focus trap / return-focus / initial focus**

- **Current issue:** Tab can leave the dialog into background chrome; focus is not moved into the dialog on open or restored to the opener on close. Documented Wave 4 residual → Wave 5.
- **Why it hurts enterprise UX:** Keyboard / SR users lose place; first-time power users hit Esc but Tab feels “broken.”
- **Recommendation:** Phase 2 — add focus trap + initial focus (first focusable or close) + return focus on unmount inside shared `Modal` only; consumers inherit.
- **Why — expected user benefit:** Overlay feels like a real dialog, not a floating panel.

**P2 — Centered-only; imprint sheet pattern not on shared Modal**

- **Current issue:** Historical imprint (`animate-sheetSlideUp` + `md:animate-scaleUp`, mobile drag handle, `rounded-t-3xl`) lives on TemplateCenter / Shortcuts, not on shared `Modal` (centered + generic `transition-all` / `scale-100`).
- **Recommendation:** Optional `variant="sheet" | "center"` (or mobile-responsive classes) on shared Modal — **one** primitive, two presentations. Do not create `Sheet.tsx` as a third system.
- **Why — expected user benefit:** Mobile sheets feel native; desktop stays centered.

**P2 — Size ceiling / portal**

- **Current issue:** `xl` = `max-w-xl`; wider hosts rely on `className` overrides. No portal (fine if z-index stacking remains predictable under `ModalHost`).
- **Recommendation:** Add `2xl` size or document `className` width override as contract; portal only if stacking bugs appear in Phase 3.
- **Why — expected user benefit:** Predictable widths without per-consumer layout hacks.

#### Design Debt: Medium | Priority: P1

---

### 2. Shared Dialog primitive

**File:** `telecaller-app/src/shared/components/ui/Dialog.tsx`  
**Role:** Confirm / short-message host wrapping `Modal` with outline Cancel + primary/danger Confirm (Command Surface hierarchy).

#### Keep

- Correct composition: **Dialog = Modal + confirm footer** — not a parallel overlay.
- Default `size="sm"`; optional `description` + children; `confirmVariant` includes `danger` for destructive confirms.
- Loading disables both actions with “Processing...” — good confirm chrome.

#### Problems

**P1 — Dead inventory**

- **Current issue:** **No feature imports** of `Dialog`. Success / error / delete confirms still use `window.alert` / `window.confirm` (BulkLeadImport CSV results, Roles delete, Admin users/projects, lead tools success paths, CallAudit rating result, etc.).
- **Why it hurts enterprise UX:** Browser chrome breaks theme, blocks the wrong thread metaphor, and teaches users a different dismiss language than Modal Escape.
- **Recommendation:** Phase 2 — treat `Dialog` as the canonical confirm host; Phase 3 — migrate high-traffic `alert`/`confirm` call sites to presentation-only Dialog (same handlers, different chrome). Do **not** invent Toast-as-confirm for destructive actions.
- **Why — expected user benefit:** One confirm language matching Form Contract footers.

**P2 — Footer duplicates FormActions pattern**

- **Current issue:** Dialog inlines two `Button`s instead of `FormActions` children.
- **Recommendation:** Prefer `FormActions` inside Dialog footer for one hierarchy helper (optional Phase 2 polish).
- **Why — expected user benefit:** Identical Cancel/Confirm rhythm as form modals.

#### Design Debt: High | Priority: P1

---

### 3. Mobile sheet / drawer patterns

**Shared:** `telecaller-app/src/shared/components/ui/Drawer.tsx` (**unused by features**)  
**Live forks:** `LeadListMobileFilterSheet`, `LeadBinWorkspace` mobile sheet, `CustomizerDrawer`, `MobileDrawer`, `DialPadDrawer`, `MobileProfileDrawer`, TemplateCenter bottom sheet.

#### Keep

- **LeadListMobileFilterSheet** — Wave 3 Command Surface mobile pattern: Escape, labeled close, theme overlay/card, `animate-sheetSlideUp`, draft → Search → Apply preserved. Do not merge into filter state rewrite.
- **MobileDrawer** (dashboard nav) — theme tokens, labeled close, focus-visible — solid nav drawer Keep for IA.
- TemplateCenter mobile drag handle + split list/editor — product IA Keep; migrate host chrome, not the two-pane layout.
- Imprint rule: sheet top radius may stay larger than `--radius` for gesture affordance.

#### Problems

**P1 — Shared Drawer is dead inventory; live drawers fork**

- **Current issue:** `Drawer.tsx` has header/body/footer but **no** `role="dialog"`, **no** Escape, **no** close `aria-label`, title uses `font-extrabold`, radius `rounded-*-2xl` / `rounded-md` close (not `rounded-theme`). Features ignore it and hand-roll overlays.
- **Why it hurts enterprise UX:** Customizer / DialPad / Profile / Filter sheets each teach a different dismiss and chrome language.
- **Recommendation:** Phase 2 — harden shared `Drawer` to Modal-parity a11y (dialog semantics, Escape, labeled close, focus trap, theme title weight, `rounded-theme` where not gesture sheet) + bottom/right/left positions. Phase 3 — adopt for Customizer (and optionally Profile); keep DialPad as specialized Keep unless chrome-only pass; keep Filter sheet as Command Surface sibling that can share sheet chrome helpers.
- **Why — expected user benefit:** Side panels feel like the same product as modals.

**P1 — DialPadDrawer + ShortcutsModal pre-DLS islands**

- **Current issue:** DialPad uses `bg-slate-950/60` + `bg-slate-900` panel; Shortcuts uses white/slate/indigo + `font-black`. Neither uses shared Modal/Drawer.
- **Recommendation:** Tokenize overlays to `theme-*` in Phase 3 consumer batch; DialPad may remain a specialized drawer (feature chrome) but must share a11y/dismiss contract.
- **Why — expected user benefit:** Dark dialer still “CRM,” not a third app skin.

**P2 — Filter / bin sheets missing dialog semantics**

- **Current issue:** `LeadListMobileFilterSheet` Escape + close label OK, but no `role="dialog"` / `aria-modal` / `aria-labelledby` on the sheet panel.
- **Recommendation:** Add semantics in Phase 3 without changing Apply model.
- **Why — expected user benefit:** SR users hear “dialog” for filters, matching desktop modal mental model.

#### Design Debt: High | Priority: P1

---

### 4. Focus trap / keyboard / Escape / labeled close (Wave 4 residual)

**Baseline:** Shared `Modal` — Escape ✅, labeled close ✅, trap ❌, return-focus ❌.  
**Sheets / islands:** mixed.

#### Keep

- Shared Modal Escape + `aria-label="Close"` — Phase 2 minimum from Wave 4 **shipped**; do not regress.
- Filter sheet Escape + “Close filters”; TemplateCenter / BulkLeadImport labeled closes after Wave 4 polish.

#### Problems

**P1 — Focus trap missing on all overlays**

- **Current issue:** No overlay implements Tab cycling or initial/return focus. Documented in `wave4-complete.md`, Form Contract §3e, phase 2/4 validation notes.
- **Recommendation:** Implement once in shared `Modal` (Dialog inherits); mirror in hardened `Drawer` / sheet variant. Do not per-consumer trap scripts.
- **Why — expected user benefit:** Keyboard users stay inside the task until Escape/Cancel/Save.

**P1 — Escape gaps on sheet residuals + islands**

- **Current issue:** `TemplateCenterModal` — no Escape listener (backdrop click also not wired as dismiss on outer wrapper alone without checking — outer is full-screen flex; clicking backdrop area may not close). `BulkLeadImportModal` — no Escape. `CallAuditRatingModal`, `ShortcutsModal`, `MergeSettingsTab` — no Escape / weak close labels. `CustomizerDrawer` / `DialPadDrawer` / `MobileProfileDrawer` — backdrop click often works; Escape inconsistent.
- **Recommendation:** Escape + backdrop dismiss + labeled close as **contract minimum** for every overlay in Phase 2/3.
- **Why — expected user benefit:** Esc always means “leave overlay,” matching Shortcuts help text claim.

**P2 — Close control target / focus ring**

- **Current issue:** Some closes are `p-1` without focus-visible (Drawer, CallAudit, Merge); shared Modal has focus-visible Keep.
- **Recommendation:** Standardize close button chrome on Modal/Drawer primitives (≥44px touch where mobile sheet).
- **Why — expected user benefit:** Predictable hit target and visible focus.

#### Design Debt: High | Priority: P1

---

### 5. Header / body / footer conventions (FormActions / Command Surface)

#### Keep

- Major form modals pass `footer={<FormActions>… Cancel outline + Primary …}</FormActions>` — Command Surface hierarchy (Secondary → Primary) **Keep**.
- Modal footer container: `justify-end`, `gap-3`, `border-t`, subtle `bg-theme-surface/50`.
- Quiet titles (`text-base font-semibold`) on shared Modal after Wave 4 — no emoji chrome.
- TemplateCenter footer: outline Copy + primary WhatsApp — clear primary action Keep (not FormActions, but hierarchy OK).

#### Problems

**P2 — Non-form overlays invent footers**

- **Current issue:** Shortcuts footer is decorative brand line; CallAudit / Merge hand-roll button rows; BulkLeadImport uses FormActions (Keep) inside custom shell.
- **Recommendation:** Form-like overlays → FormActions; read-only info overlays → single quiet dismiss; confirms → Dialog.
- **Why — expected user benefit:** Users always find Cancel left-of-primary at the trailing edge.

**P2 — Header weight drift**

- **Current issue:** Drawer / CallAudit / Merge use `font-extrabold` / `font-bold` / uppercase; shared Modal uses `font-semibold`.
- **Recommendation:** Contract: modal/drawer titles = `font-semibold` / `type-label` where micro; no `font-black` / `font-extrabold` on overlay chrome.
- **Why — expected user benefit:** Headers match Form Contract quiet typography.

#### Design Debt: Low–Medium | Priority: P2

---

### 6. Overlay / animation / motion policy compliance

**Policy (§9):** Sheet/modal enter (`animate-sheetSlideUp`, `animate-scaleUp`) allowed; no decorative pulse / hover-lift theater in persistent chrome.

#### Keep

- TemplateCenter + Shortcuts + filter sheet use allowed enter motions.
- Shared Modal uses backdrop blur + opacity transition — calm, functional.
- No celebration emoji on modal chrome (Wave 4 quieting Keep).

#### Problems

**P2 — Two motion dialects**

- **Current issue:** Shared Modal does not use imprint `animate-scaleUp` / sheet slide; custom sheets do. DialPad uses `animate-sheetSlideLeft` / `animate-fadeIn`.
- **Recommendation:** Codify in draft Modal/Drawer Contract: center = `md:animate-scaleUp` (or equivalent); bottom sheet = `animate-sheetSlideUp`; side drawer = slide from edge. Apply via primitive variants.
- **Why — expected user benefit:** Motion signals *kind* of overlay (sheet vs dialog vs drawer).

**P2 — Overlay token drift**

- **Current issue:** `bg-theme-overlay` (Keep) vs `bg-black/55`, `bg-black/60`, `bg-slate-900/60`, `bg-slate-950/60`.
- **Recommendation:** One overlay token for all hosts in Phase 2/3.
- **Why — expected user benefit:** Light/dark consistency; less “which app am I in?”

#### Design Debt: Medium | Priority: P2

---

### 7. High-traffic modal consumers (sample Leads + Admin)

**On shared Modal + FormActions (Wave 4):** `AddLeadModal`, `AdminLeadModal`, `ProjectFormModal`, `TeamConfigModal`, `UserAccountModal`, `CallLogModal`, `MapCallLogModal`, `LinkLeadModal`, `CampaignBroadcastModal` (+ Roles settings modal host).

#### Keep

- These are the **reference consumers** for Wave 5 — host adoption done; Phase 3 should mostly *inherit* primitive focus-trap/a11y, not re-skin forms.
- Field primitives + inline errors already Form Contract-aligned.
- Open/close props (`isOpen` / `onClose`) and submit handlers — **do not change** for presentation wave.

#### Problems

**P2 — Inherit-only; watch className width forks**

- **Current issue:** Some hosts pass `className` for max-width beyond `xl` (e.g. Project). Fine if documented.
- **Recommendation:** Phase 3 smoke: Escape, trap, footer order, light/dark — no field recipe rewrites unless a host still hand-rolls overlay (none in this Keep set).
- **Why — expected user benefit:** Creating a lead / editing a project feels identical at the chrome layer.

**P1 (consumer batch) — Straggler form modal still hand-rolled**

- **Current issue:** `CallAuditRatingModal` — custom overlay, gray/amber stars, unlabeled close, `alert()` on success/fail, not shared Modal/FormActions/Textarea.
- **Recommendation:** Phase 3 — migrate shell to Modal + FormActions + Textarea; keep rating interaction IA.
- **Why — expected user benefit:** Admin QA rating matches other Admin modals.

#### Design Debt: Low (hosts) / Medium (stragglers) | Priority: P2 hosts, P1 CallAudit

---

### 8. Sheet residuals (TemplateCenter, BulkLeadImport)

**Files:** `TemplateCenterModal.tsx`, `BulkLeadImportModal.tsx`  
**Wave 4 disposition:** Polish only; architecture migration → Wave 5.

#### Keep

- **TemplateCenter** two-pane list + preview editor, mobile bottom sheet, drag handle, WhatsApp/Copy actions, theme tokens + dialog role/labelledby after Agent 4.
- **BulkLeadImport** multi-step upload → map → import wizard IA, dashed dropzone, FormActions footer, shared Textarea/Select — wizard steps Keep.
- Do **not** flatten TemplateCenter into a tiny centered form or remove CSV mapping UX.

#### Problems

**P1 — Outside shared Modal host**

- **Current issue:** Both reimplement fixed overlay + card chrome. BulkLeadImport is centered-dialog-shaped (easy Modal candidate). TemplateCenter needs sheet/split variant.
- **Recommendation:** Phase 2 — extend Modal with sheet / large / custom-body capabilities (or composition slots: `header` / unconstrained children layout) sufficient for TemplateCenter without a third system. Phase 3 — migrate both hosts; preserve IA.
- **Why — expected user benefit:** Same dismiss/a11y language as Add Lead; first-time users don’t relearn Esc/close per tool.

**P1 — Escape / focus gaps**

- **Current issue:** Neither wires Escape; neither traps focus; BulkLeadImport result still `alert()`.
- **Recommendation:** After host migration, Escape/trap inherit from Modal; replace completion `alert()` with Dialog or quiet inline status (presentation only).
- **Why — expected user benefit:** Import/template flows feel closable and themed end-to-end.

#### Design Debt: High | Priority: P1

---

### 9. Token / radius / typography alignment with DLS v1.3

#### Keep

- Shared Modal / most Wave 4 form hosts: `theme-*`, `rounded-theme`, quiet semibold titles, Form Contract fields.
- TemplateCenter / BulkLeadImport Wave 4 polish already on theme tokens.

#### Problems

**P1 — Pre-DLS overlay islands**

- **Current issue:** `ShortcutsModal` (slate/indigo/`font-black`), `CallAuditRatingModal` (gray borders/`rounded-lg`), `MergeSettingsTab` merge overlay (`bg-black/60`, `rounded-2xl`, gray text), `DialPadDrawer` (slate-900 panel), `BulkActionsPanel` (indigo/white — adjacent chrome, not a modal but motion sibling).
- **Recommendation:** Phase 3 consumer batch — tokenize overlays; titles to `font-semibold`; radius to `rounded-theme` (sheet tops may stay larger).
- **Why — expected user benefit:** Every overlay reads as v1.3 CRM, not legacy slate.

**P2 — Shared Drawer primitive tokens**

- **Current issue:** Dead `Drawer` itself is partially themed but title/radius/focus lag Modal.
- **Recommendation:** Align Drawer chrome to Modal before adoption.
- **Why — expected user benefit:** Adopting Drawer doesn’t reintroduce Wave 4-era weight.

#### Design Debt: Medium | Priority: P2 (P1 for visible islands)

---

### 10. Accessibility (focus, aria-modal, labelledby)

#### Keep

- Shared Modal: `role="dialog"`, `aria-modal`, `aria-labelledby`, labeled close — Form Contract baseline.
- TemplateCenter / BulkLeadImport: dialog role + labelledby + labeled close (Wave 4).
- Filter sheet: labeled close; Campaign/LinkLead inner groups have useful `aria-*` from Wave 4.

#### Problems

**P1 — Focus management incomplete (see §4)**

- Trap / initial / return focus missing → keyboard a11y gap is the top Wave 5 a11y P1.

**P1 — Islands without dialog semantics**

- **Current issue:** `CallAuditRatingModal`, `ShortcutsModal`, `MergeSettingsTab` overlay, `CustomizerDrawer`, `DialPadDrawer`, `MobileProfileDrawer`, shared `Drawer` — missing full dialog semantics and/or labeled close.
- **Recommendation:** Semantics live on primitives; consumers get them by migration.
- **Why — expected user benefit:** Screen readers announce overlays consistently.

**P2 — `aria-describedby` for dialog descriptions**

- **Current issue:** Dialog `description` is visual only; not wired to `aria-describedby` on the dialog node (Modal doesn’t expose description id).
- **Recommendation:** Phase 2 — optional `descriptionId` on Modal when description present (Dialog passes through).
- **Why — expected user benefit:** Confirm purpose announced with title.

#### Design Debt: High | Priority: P1

---

## Cross-Cutting Findings

1. **Outside-in still wins:** Harden `Modal` (focus trap + optional sheet variant) → `Dialog` inherits → harden `Drawer` → migrate residuals. Same governance as Waves 2–4.
2. **Two dead primitives (`Dialog`, `Drawer`) vs many live forks** is the core scoreboard story — inventory exists; adoption does not.
3. **Wave 4 form hosts are largely done** — Wave 5 must not reopen field chrome / Zod / FormActions ownership. Inherit a11y from the shell.
4. **`alert()`/`confirm()`** are the largest *behavioral-chrome* debt for Dialog adoption; keep handler outcomes identical.
5. **Filter Apply model** and **TemplateCenter / BulkLeadImport IA** are sacred Keeps — chrome migration only.
6. **Guiding Q pass:** Focus trap + one dismiss language (Esc/close) + themed confirms help first-time users more than visual novelty on already-good AddLead/AdminLead hosts.

---

## Recommended Wave 5 phasing

| Phase | Goal | Notes |
| --- | --- | --- |
| **Phase 1** | UI/UX audit (this doc) | **In progress / complete when approved** — no implementation |
| **Phase 2** | Shared Modal / Dialog / Sheet primitives (focus trap, semantics) — presentation/a11y only | Focus trap + return-focus on `Modal`; Escape/label parity; optional sheet/size variant; Dialog footer → FormActions; harden `Drawer` to Modal a11y parity; **no** DLS v1.4 |
| **Phase 3** | Consumer adoption | TemplateCenter + BulkLeadImport → shared host; CallAudit / Shortcuts / Merge overlay tokenize + Modal/Dialog; high-traffic `alert`/`confirm` → Dialog; Customizer (± Profile) → Drawer; Filter/bin sheet semantics; DialPad token/a11y pass without redesigning dial UX |
| **Phase 4** | Validation | Static + `tsc`; human runtime checklist (Esc, trap, light/dark, form footers, sheet open/close); regression vs Waves 1–4 |
| **Phase 5** | DLS v1.4 Modal/Drawer Contract | Promote draft contract below to canonical §3f (or equivalent) **only after** user authorize — same as Wave 4 → v1.3 |

---

## Explicit Non-Goals

- No DLS **v1.4** bump in Phases 1–4.
- No new overlay library / headless UI framework / third host alongside Modal+Dialog+Drawer.
- No Firestore, routing, Zod, submit, or open/close business-logic changes.
- No Filter draft → Search → Apply redesign; no TemplateCenter template content rewrite; no BulkLeadImport mapping algorithm changes.
- No Toast system redesign (optional quiet status later — not a Phase 2 primitive requirement).
- No Wave 4 Form Contract field recipe rewrites; no FormKit.
- No sidebar / DataTable / dashboard widget scope creep (unless an overlay on those surfaces is in the consumer batch).

---

## Regression Checklist

- [ ] Shared Modal form hosts still submit via existing handlers (`form=` / `onSubmit` unchanged)
- [ ] FormActions Cancel → Primary order preserved on Leads + Admin modals
- [ ] Escape dismisses overlays without breaking nested selects / date pickers unexpectedly
- [ ] Focus returns to opener control after close (once trap ships)
- [ ] TemplateCenter: copy / WhatsApp / template list selection still work
- [ ] BulkLeadImport: CSV upload → map → import path unchanged (chrome only)
- [ ] LeadListMobileFilterSheet: draft → Search → applied model intact
- [ ] DialPad: DTMF / call start / quick-create behavior unchanged
- [ ] Customizer: widget reorder / density / style persistence unchanged
- [ ] Light + dark on Modal, sheet, drawer, Dialog confirm
- [ ] Waves 1–4: widgets, DataTable, Command Surface filters, Form Contract fields untouched
- [ ] `tsc --noEmit` clean in `telecaller-app/`

---

## Don't Improve This / Do Not Change

| Leave alone | Why |
| --- | --- |
| Open/close state ownership (`isOpen` / `onClose` / ModalRegistry wiring) | Orchestration, not presentation debt |
| Lead create Zod schemas / Admin save handlers / CSV parse & `bulkAddLeads` | Business logic |
| Template list copy / WhatsApp URL building | Feature behavior |
| Filter draft → Search → applied | Wave 3 locked |
| Form field primitives / `formField.ts` / Form Contract §3e canonical text | Wave 4 closed — inherit only |
| DialPad DTMF audio / call start | Specialized telephony UX |
| Dashboard widget preference persistence | Wave 1 fence |
| Inventing screenshot PNG baselines | Operational follow-up, not audit |

---

## Draft Modal/Drawer Contract (draft only — no v1.4)

> **Draft for Wave 5.** Not authoritative until Phase 5 promotes into `ui-registry.md` (expected §3f) as DLS **v1.4**. Aligns with Form Contract §3e hosts + Command Surface §3d actions + Motion §9 + A11y §12.

### Primitives (reuse — do not fork)

| Primitive | Role |
| --- | --- |
| **`Modal`** | Canonical overlay host (forms, large tools, sheets via variant) |
| **`Dialog`** | Confirm / short prompt — **always** composes `Modal` |
| **`Drawer`** | Edge / bottom sheet sibling — same a11y contract as Modal; not a third visual language |

### Shell

| Concern | Rule |
| --- | --- |
| **Overlay** | `bg-theme-overlay` + quiet blur; one token for all hosts |
| **Surface** | `bg-theme-card`, `border-theme-border`, **`rounded-theme`** (sheet top may use larger radius for gesture) |
| **Motion** | Center: scale/fade enter; Bottom sheet: `animate-sheetSlideUp`; Side drawer: edge slide — functional only |
| **Sizes** | `sm|md|lg|xl` (+ documented wider override or `2xl`); drawers: `sm|md|lg` width/height |

### Structure

| Region | Rule |
| --- | --- |
| **Header** | Title `font-semibold` / quiet; optional subtitle muted; close control labeled |
| **Body** | Scrollable; form fields follow Form Contract §3e |
| **Footer** | Right-aligned; **FormActions** for forms; Dialog Confirm = Secondary outline then Primary/Danger |

### Accessibility (Phase 2 minimum → full)

| Concern | Rule |
| --- | --- |
| **Semantics** | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` (required), optional `aria-describedby` |
| **Dismiss** | Labeled close; Escape; backdrop click (unless destructive confirm opts out) |
| **Focus** | Trap while open; initial focus to first focusable or close; **return focus** to opener on close |
| **Scroll** | Lock body scroll while open |

### Adoption

| Prefer | Avoid |
| --- | --- |
| Shared Modal / Dialog / Drawer | New `fixed inset-0` one-offs |
| Dialog for confirm / blocking result | `window.alert` / `confirm` for in-app chrome |
| Sheet **variant** of Modal for TemplateCenter-class layouts | Parallel `Sheet.tsx` design system |

### Non-goals (contract)

No open/close business logic; no Firestore; no filter Apply model change; no second form kit; toast redesign optional and separate.

---

## Critical judgment

Wave 5 starts from a **strong Modal baseline** and a **clear residual list** already written by Wave 4. The highest leverage is focus-trap + Dialog adoption + bringing TemplateCenter / BulkLeadImport / pre-DLS islands onto the same host — not restyling AddLead again. **STOP after this audit until Phase 2 is authorized.**
