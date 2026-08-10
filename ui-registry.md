# UI Registry — Design Language Specification

**Canonical design language** for Golden Acres (`telecaller-app/`).  
**Status:** Design Language **v1.4** (Wave 1–1.5 + Wave 2 DataTable + Wave 3 Filter / Command Surface + Wave 4 Forms + Wave 5 Modals & Drawers). Agent dashboard, tables, filters, forms, and overlay chrome follow this language. Future screens adopt it — they do not invent parallel patterns.

| Artifact | Path |
| --- | --- |
| Audit | [`directives/wave1-agent-dashboard-ui-audit.md`](directives/wave1-agent-dashboard-ui-audit.md) |
| Phase 2 validation | [`directives/wave1-phase2-validation.md`](directives/wave1-phase2-validation.md) |
| Phase 3 notes | [`directives/wave1-phase3-notes.md`](directives/wave1-phase3-notes.md) |
| Visual baseline | [`directives/wave1-visual-baseline.md`](directives/wave1-visual-baseline.md) |
| Wave 1 close-out | [`directives/wave1-complete.md`](directives/wave1-complete.md) |
| Wave 1.5 report | [`directives/wave1.5-report.md`](directives/wave1.5-report.md) |
| Wave 2 DataTable audit | [`directives/wave2-datatable-ui-audit.md`](directives/wave2-datatable-ui-audit.md) |
| Wave 2 Phase 2 validation | [`directives/wave2-phase2-validation.md`](directives/wave2-phase2-validation.md) |
| Wave 2 Phase 3 notes | [`directives/wave2-phase3-notes.md`](directives/wave2-phase3-notes.md) |
| Wave 2 Phase 3 validation | [`directives/wave2-phase3-validation.md`](directives/wave2-phase3-validation.md) |
| Wave 2 close-out | [`directives/wave2-complete.md`](directives/wave2-complete.md) |
| Wave 3 Filter audit (Phase 1) | [`directives/wave3-filter-ui-audit.md`](directives/wave3-filter-ui-audit.md) |
| Wave 3 Phase 2 validation | [`directives/wave3-phase2-validation.md`](directives/wave3-phase2-validation.md) |
| Wave 3 Phase 3 notes | [`directives/wave3-phase3-notes.md`](directives/wave3-phase3-notes.md) |
| Wave 3 Phase 3 validation | [`directives/wave3-phase3-validation.md`](directives/wave3-phase3-validation.md) |
| Wave 3 close-out | [`directives/wave3-complete.md`](directives/wave3-complete.md) |
| Wave 4 Forms audit (Phase 1) | [`directives/wave4-forms-ui-audit.md`](directives/wave4-forms-ui-audit.md) |
| Wave 4 Phase 2 validation | [`directives/wave4-phase2-validation.md`](directives/wave4-phase2-validation.md) |
| Wave 4 Phase 3 validation | [`directives/wave4-phase3-validation.md`](directives/wave4-phase3-validation.md) |
| Wave 4 Phase 4 validation | [`directives/wave4-phase4-validation.md`](directives/wave4-phase4-validation.md) |
| Wave 4 close-out | [`directives/wave4-complete.md`](directives/wave4-complete.md) |
| Wave 5 Modals audit (Phase 1) | [`directives/wave5-modals-ui-audit.md`](directives/wave5-modals-ui-audit.md) |
| Wave 5 Phase 2 validation | [`directives/wave5-phase2-validation.md`](directives/wave5-phase2-validation.md) |
| Wave 5 Phase 3 validation | [`directives/wave5-phase3-validation.md`](directives/wave5-phase3-validation.md) |
| Wave 5 Phase 4 runtime validation | [`directives/wave5-phase4-runtime-validation.md`](directives/wave5-phase4-runtime-validation.md) |
| Wave 5 Phase 4 regression | [`directives/wave5-phase4-regression-report.md`](directives/wave5-phase4-regression-report.md) |
| Wave 5 close-out | [`directives/wave5-complete.md`](directives/wave5-complete.md) |

**Sources of truth (code):** [`telecaller-app/src/index.css`](telecaller-app/src/index.css), [`brandPalette.ts`](telecaller-app/src/shared/constants/brandPalette.ts), primitives `Card`, `WidgetHeader`, `EmptyState`, `CircularProgressRing`, `DataTable`, `Badge`, Wave 3 filter chrome (`LeadFilterFieldControl`, `LeadListFilterChips`, `FilterSearchInput`, `FilterPanelShell`), Wave 4 form primitives (`Input`, `Select`, `Textarea`, `Checkbox`, `FormActions`), plus Wave 5 overlay primitives (`Modal`, `Dialog`, `Drawer`, `useOverlayFocus`).

---

## Design Language Version / Changelog

### Design Language Version: **v1.4**

| Field | Value |
| --- | --- |
| **Established by** | Wave 5 Phases 2–5 (shared overlay primitives + consumer adoption + Modal/Drawer Contract, July 13, 2026) |
| **Includes** | Everything in **v1.3**, plus **Modal/Drawer Contract** (§3f), focus trap / return-focus / Escape parity on `Modal` / `Dialog` / `Drawer`, sheet variant, high-value consumer adoption |
| **Next** | Future waves append **v1.5**, … (e.g. Lead Detail) |

| Version | Wave | What was added |
| --- | --- | --- |
| **v1.0** | Wave 1 + 1.5 | Agent dashboard language — Widget/Card/Typography/Motion/KPI/Radius/EmptyState/A11y/Elevation/Chart/Emoji/Spacing |
| **v1.1** | Wave 2 (Phases 2–3) | DataTable Contract; Table Hierarchy; Table Density; Leads + Admin consumer adoption |
| **v1.2** | Wave 3 (Phases 2–5) | Command Surface / Filter Contract; `FilterSearchInput` / `FilterPanelShell` / field + chips; Leads + Admin filter adoption |
| **v1.3** | Wave 4 (Phases 2–5) | Form Contract; shared field primitives + FormActions; Leads / Admin / Login / modal form adoption |
| **v1.4** | Wave 5 (Phases 2–5) | Modal/Drawer Contract; `useOverlayFocus`; sheet variant; Dialog / Drawer adoption; high-value overlay consumers |

**Wave 5 officially closed** (validated 2026-07-13): see [`directives/wave5-complete.md`](directives/wave5-complete.md). **v1.4 is production-canonical** for dashboard + tables + filters + forms + overlays. Modal/Drawer Contract (§3f) is **canonical**. Wave 4 close-out: [`directives/wave4-complete.md`](directives/wave4-complete.md). Phase 4 validation: [`directives/wave5-phase4-runtime-validation.md`](directives/wave5-phase4-runtime-validation.md).

Screenshot PNGs for the Wave 1 visual baseline remain an **operational follow-up** (checklist in [`directives/wave1-visual-baseline.md`](directives/wave1-visual-baseline.md)) and do **not** block later waves.

### Wave 10 Agent 1 — Design System Architect (July 17, 2026) — additive notes

**DLS version stays v1.4** (no bump). Foundation cleanup for later Wave 10 agents.

| Topic | Standard |
| --- | --- |
| **Button touch targets** | All sizes use `min-h-11` on mobile; compact padding resumes at `sm+` (`sm:min-h-0`). |
| **Modal `variant`** | Implemented: `center` (default) = dialog at all breakpoints; `sheet` = bottom sheet &lt; `sm`, centered `sm+`. Form modals pass `variant="sheet"`; `Dialog` confirms stay `center`. |
| **Drawer / sheet tops** | Use `rounded-t-theme` (not `rounded-t-3xl`). |
| **Radius codemod (scoped)** | Shared chrome + Branding/Login/Targets/CallHistory: `rounded-xl` / `rounded-2xl` / `rounded-3xl` → `rounded-theme`; sheet tops → `rounded-t-theme`. Feature islands (Dialer, Attendance, Maps) still have residuals for later agents. |
| **Weight codemod (scoped)** | `font-black` / `font-extrabold` → `font-bold` in shared primitives + scoped consumers. Prefer `type-*` / `font-semibold` for new work. |
| **Badge `info`** | Uses `theme-info` (`bg-theme-info/10 text-theme-info border-theme-info/20`). Branding can override `--theme-info`. |
| **Emoji policy (touched)** | `AdminTargetsTab` announcement options + CTA: text + Lucide `Megaphone` (no persistent emoji). `CallHistoryView` channel chip: Lucide + shared `Badge`. |
| **Credibility models** | `BrandingSettingsTab` + `Login` brand marks use `rounded-theme`. |

**Later agents still own:** full a11y (A7), remaining feature-island `rounded-xl` / `font-black` sweep. Attendance rewrite → **Agent 3 (done)**. Dialer overlays → **Agent 5 (done)**; PowerDialerWidget indigo residual remains. Map editor chrome/touch → **Agent 8 (done)**. Alert/confirm migration → **Agent 4 (done)**.

### Wave 10 Agent 2 — Navigation & IA (July 17, 2026) — additive notes

**DLS version stays v1.4** (no bump). Navigation feels like one system across desktop sidebar, mobile bottom nav, overflow drawer, and Admin chrome.

| Topic | Standard |
| --- | --- |
| **Canonical label map** | `telecaller-app/src/shared/constants/navTaxonomy.ts` → `NAV_LABELS` + `ADMIN_NAV_GROUPS`. Use these strings for primary destinations; do not invent synonyms ("Leads CRM", "Calls Hub", "Layout Maps", "Control Panel", "Training HQ"). |
| **Primary labels** | Dashboard · CRM (mobile umbrella) · Leads · Calls · Maps · Attendance · Training · My Profile · Templates · Shortcuts · Full Screen · Admin · Account · Workspace |
| **Admin destinations** | Single `ADMIN_NAV_GROUPS` drives Admin page tabs **and** sidebar Operations/Admin submenu. Same id/label/icon/tone everywhere. |
| **IA shell** | Desktop: Sidebar → PageHeader → Content. Mobile: Bottom Nav → context actions → Content. One overflow drawer (`MobileDrawer`) for secondary workspace tabs; `MobileProfileDrawer` for Account tools only. |
| **History** | Tab / subtab changes **push** history (match sidebar `<Link>`). Do not `replace: true` for primary navigation. Mobile drawer uses `<Link to="/?tab=…">` (push). |
| **Mobile FABs** | Global Dial FAB stays `bottom-20 right-6` (`ModalHost`). Contextual Add Lead FAB only on Leads/Calls tabs at `bottom-36 right-6` (stacked above dial). Theme tokens on dial FAB (no indigo island). |
| **Admin chrome** | No redundant "Back to CRM" (breadcrumb / bottom nav suffice). Dead readOnly "Search console…" removed. Mobile Admin title uses `NAV_LABELS.admin`. |

**Remaining debt for later agents:** Attendance full migrate → **Agent 3 (done)**; Dialer overlays → **Agent 5 (done)** (PowerDialerWidget indigo residual remains); Map editor touch/chrome → **Agent 8 (done)**; mass alert→Dialog → **Agent 4 (done)**.

### Wave 10 Agent 8 — Map Experience (July 17, 2026) — additive notes

**DLS version stays v1.4** (no bump). Map chrome + touch safety only — **no** plot geometry algorithms, Firestore plot schema, or permission model changes. Attendance / Dialer not touched. `useAdminMapEditor` alert/confirm → migrated by Agent 4.

| Topic | Standard |
| --- | --- |
| **Touch edit gate** | `useMapEditCapability` — unlock when `(any-pointer: fine)` **or** `lg+` and not coarse-primary-only. Coarse/touch-primary: force view mode; banner *"Use a larger screen to edit maps"*; view/pan/zoom remain. Desktop mouse workflows unchanged. |
| **Edit panel (mobile)** | `AdminMapSidebar` uses Wave 5 `Drawer` `position="bottom"` `size="lg"` below `md`; docked `aside` at `md+`. No more `h-1/2` stacked edit panel. |
| **Project map (mobile)** | `ProjectMapSidebar`: search/filters stay as bottom chrome; selected-plot details open in bottom `Drawer`. Desktop keeps docked sidebar. |
| **Map chrome tokens** | `AdminMapHeader`, `AdminMapSidebar`, `AdminMapSettings`, `AdminMapEditor`, `ProjectMapSidebar` → `theme-*` / `rounded-theme` / `focus-visible:ring-theme-ring` / icon-button `min-h-11 min-w-11` + `aria-label`. |
| **Invalid utilities fixed** | Removed broken classes (`indigo-505`, `indigo-605`, `indigo-550`, `hover:bg-indigo-55`, etc.) from map chrome/settings. |

**Remaining map debt:** Full Pointer Events migration for true touch editing; ProjectMap page header residual `font-black` / status pill chrome; AdminMapCanvas cursor/hit-testing still mouse-oriented. JSON import feedback uses Toast (Agent 4).

### Wave 10 Agent 3 — Attendance Module (July 17, 2026) — additive notes

**DLS version stays v1.4** (no bump). Agent attendance surface migrated to shared primitives; clock-in/out/break/status behavior unchanged.

| Topic | Standard |
| --- | --- |
| **Primary surface** | `AttendanceTab` — `Card` / `CardHeader` / `CardBody`, shared `Button` / `Badge` / `EmptyState` / `DataTable`, `Dialog` confirms (already Wave 5). |
| **Tokens** | `theme-card` / `theme-text` / `theme-muted` / `theme-border` / `theme-surface` / `theme-accent` / `theme-success` / `theme-warning` / `theme-danger`. No raw gray / indigo / emerald islands. |
| **Radius / type** | `rounded-theme`; `type-page-title` / `type-card-title` / `type-label` / `type-kpi` / `type-secondary`. |
| **Emoji / motion** | Lucide `Calendar` / `Clock` / `Coffee` / `Timer` only — no persistent emoji. No `animate-pulse` on break CTA (solid `Button` variant). |
| **Status chips** | Attendance row status → shared `Badge` (`success` present, `warning` late, `default` else). Today status: Offline / Clocked In / On Break / Completed. |
| **History** | Hand-rolled `<table>` → `DataTable` (`density="comfortable"`, sort by date desc). Empty → `EmptyState`. |
| **Nav label** | Page title uses `NAV_LABELS.attendance` from `navTaxonomy.ts`. |
| **Related chrome** | `AdminAttendanceTab` KPI tiles: `rounded-theme` + theme success/warning/danger icon wells (no green/yellow/rose raw). `DashboardHeader` / `MobileStatusPanel` already on theme tokens — left as-is. |

**Remaining debt:** Admin timesheet matrix still local grid (functional, not DataTable); optional loading skeletons if attendance store adds explicit loading flags later. Dialer overlays closed under Agent 5 (PowerDialerWidget indigo residual remains). Map chrome/touch closed under Agent 8. Alert/confirm migration closed under Agent 4.

### Wave 10 Agent 5 — Dialer Experience (July 17, 2026) — additive notes

**DLS version stays v1.4** (no bump). Dialer overlays adopt Modal/Drawer Contract §3f chrome; call placement / IVR / logging pipelines unchanged.

| Topic | Standard |
| --- | --- |
| **Host** | Outbound + map simulated dialer → shared `Modal` `variant="sheet"` `size="sm"`; IVR ringing → `Modal` `variant="center"` `size="md"`. No `fixed inset-0` slate/indigo islands. |
| **Dismiss** | `closeOnBackdrop={false}` (avoid accidental hang-up). Escape / header Close → end call (outbound) or decline IVR (`clearActiveIvrCall`). |
| **Tokens** | `bg-theme-card` / `theme-surface` / `theme-border` / `theme-accent` / `theme-success` / `theme-danger` — not indigo or dark-only slate-900. Light + dark via appearance tokens. |
| **Status** | `DialerStatusChip`: colored dot **plus** status text (`role="status"` `aria-live="polite"`). Not color-only. |
| **Controls** | Large mute / speaker (≥44px) with visible labels + `aria-pressed` / `aria-label`; end call = large `theme-danger` circle. IVR Answer / Decline use shared `Button` (`success` / `outline`); Answer uses flex grow — **not** invalid `flex-2`. |
| **Motion** | No decorative bounce / ping / fake waveform bars. Connecting = calm text hint; active = mono timer only. |
| **Shared chrome** | `telecaller-app/src/features/calls/components/DialerChrome.tsx` — presentational helpers only. Lead Detail `SimulatedDialer` (inline card) aligned to same tokens; pipelines not merged. |

**A11y delivered:** `role="dialog"` `aria-modal` `aria-labelledby` / `aria-describedby`, focus trap, Escape, return-focus (via `Modal` / `useOverlayFocus`), live status + duration, labeled controls.

**Dialer a11y (Agent 7):** Modal `closeLabel` `"End call"` / `"Decline call"`; IVR sole host = ModalHost (Dashboard passes `activeIvrCall={null}`). Outbound dual state hosts remain by design until a later merge. MANUAL QA keyboard/SR/theme on dialer still required.

### Wave 10 Agent 4 — Dialog & Interaction (July 17, 2026) — additive notes

**DLS version stays v1.4** (no bump). Presentation-only: replace native `alert` / `confirm` / `prompt` with shared Toast + Dialog. No business-logic / Firestore / schema changes. Outcomes preserved (delete still deletes after confirm, etc.).

| Topic | Standard |
| --- | --- |
| **Informational / success / error** | `useToast()` — `success` \| `error` \| `warning` \| `info`. Prefer Toast over blocking Dialog for non-destructive feedback. |
| **Confirm / danger** | Shared `Dialog` via `InteractionDialog` `mode="confirm"`; `confirmVariant="danger"` for deletes; backdrop opt-out via Dialog danger default. |
| **Prompt (text input)** | `InteractionDialog` `mode="prompt"` — Dialog + shared `Input`, labeled, Enter submits, Escape / Cancel dismisses (`onCancel` when needed). |
| **Blocking info (rare)** | `InteractionDialog` `mode="alert"` — OK-only Dialog (e.g. plot summary on inventory map click). |
| **Host** | `telecaller-app/src/shared/components/ui/InteractionDialog.tsx` — composes existing `Dialog` / `Input`; do **not** invent a parallel dialog system. |
| **ESLint** | `no-alert: error` + `no-restricted-globals` for `alert` / `confirm` / `prompt` in `telecaller-app/eslint.config.js`. |

**Migrated (49 → 0 call sites in `src/`):** `useAdminMapEditor`, `useBrandingSettings`, `AdminTargetsTab`, `AdminMapSettings`, `AdminMapHeader`, `ProjectMapsView`, `ProjectMap`, `ProjectFormModal` (+ hosts `AdminMapEditor`, `BrandingSettingsTab`).

**Leftovers:** none in `telecaller-app/src`. Soft residual: older feature files may still use local `FeedbackDialog` state patterns (already on shared Dialog) — leave as-is; prefer `InteractionDialog` + Toast for new work.

### Wave 10 Agent 6 — Responsive Design (July 17, 2026) — additive notes

**DLS version stays v1.4** (no bump). Layout / overflow / touch-target polish only — **no** business logic, schema, API, or Map Pointer Events editing changes.

| Topic | Standard |
| --- | --- |
| **Shell overflow** | Dashboard / Admin content regions keep `overflow-x-hidden` + `min-w-0`; toolbars wrap or scroll (`overflow-x-auto` + `scrollbar-none` / `overscroll-x-contain`). |
| **Touch targets** | Interactive controls in touched chrome ≥ **44px** on mobile (`min-h-11` / `min-w-11`); compact resume at `sm+` (`sm:min-h-0` / `sm:h-8`) matching Button primitive. |
| **Admin chrome** | Mobile tab strip: `min-h-11` + `rounded-theme` (not tiny pills). Dense toolbars (Leads / Users / Projects / Attendance) wrap + ≥44px controls. |
| **PageHeader** | `min-h-14` with column stack on narrow; actions `flex-wrap`; breadcrumb may scroll horizontally. |
| **Tables** | Prefer existing mobile alternatives (`LeadsMobileGrid`, `ResponsiveDataView`). Wide matrices (Admin timesheet) → horizontal scroll + sticky header + sticky first column. `DataTable` already scrolls + sticky thead. |
| **Map header** | `AdminMapHeader` matches PageHeader chrome (`header-brand-strip`, stacked rows); utilities + tools `flex-wrap`; secondary tools use a More menu below `md`; bulk bar `flex-wrap`. No primary horizontal scrollbar. |
| **Power Dialer** | `PowerDialerWidget` on `theme-*` / `rounded-theme` / `Badge`; controls `min-h-11`; no indigo/purple/emoji/ping islands. |
| **Bulk bar** | `BulkActionsPanel` theme tokens + ≥44px controls; sits above mobile bottom nav (`bottom-20`). |

**Files touched:** `PowerDialerWidget`, `Admin` (mobile tabs), `PageHeader`, `DashboardHeader`, `LeadsWorkspace`, `LeadListPresetStrip`, `QuickAccessStatusTabs`, `BulkActionsPanel`, `AdminLeadsTab`, `AdminUsersTab`, `AdminProjectsTab`, `AdminAttendanceTab`, `AdminMapHeader`, `AttendanceTab`, `ui-registry.md`.

**Remaining debt for A9:** Cleared under Wave 10 Agent 9 (see Agent 9 notes below). Soft: Admin timesheet not on `DataTable` (functional scroll/sticky only). Full outbound dialer state merge (Dashboard `useDashboardDialer` vs ModalHost) deferred — IVR dual-mount cleared under A7.

### Wave 10 Agent 9 — Visual Polish (July 17, 2026) — additive notes

**DLS version stays v1.4** (no bump). Presentation-only cohesion pass — eliminate remaining “two apps” islands. No business logic / schema / API changes.

| Topic | Standard |
| --- | --- |
| **Agent Profile** | Lucide achievement icons (no emoji); `theme-*` / `rounded-theme` / `type-*`; shared `Badge` + `Button`; no hover-lift; toggles use `theme-accent` (no indigo). |
| **Training** | `NAV_LABELS.training`; theme cards; `EmptyState` for empty objections; docs panel `theme-accent-muted` (no indigo island). |
| **Admin Users teams** | Team cards `rounded-theme` + `border-theme-border`; members via `Badge`; empty → `EmptyState`. |
| **Admin Targets** | Avatar wells `bg-theme-accent-muted`; section icons `text-theme-accent`; demote raw user ID copy. |
| **Project Map header** | `type-card-title`; Available/Sold via shared `Badge`; plot status chips → semantic theme tokens; loader `border-theme-accent`. |
| **App loaders** | Boot / Suspense spinners → `bg-theme-bg` + `border-theme-accent` (not emerald/slate islands). |
| **Lead Detail** | Status via `Badge` + `getLeadStatusBadgeVariant`; hide raw Firestore ID from header; Call CTA solid (no decorative `animate-pulse`); `type-card-title`. |
| **Leads table groups** | Group header dots/washes → semantic `theme-*` / sky (no purple/blue/amber raw islands). |
| **Lead status colors** | `leadColors.ts` → theme tokens + `getLeadStatusBadgeVariant` helper. |
| **Call History** | KPI wells theme semantic; empty → `EmptyState`; status chips via `Badge`. |
| **Message / WhatsApp chrome** | Voice/doc bubbles → `theme-accent` (no indigo). |
| **Emoji sweep (scoped)** | `leadTemplates` labels, `performanceUtils` badge strings, reports outcome labels, proximity competitor copy — text only. |

**Files touched:** `AgentProfileView`, `TrainingHQView`, `agentStats`, `AdminUsersTab`, `AdminTargetsTab`, `ProjectMap`, `App`, `LeadDetailsPage`, `LeadsDesktopTable`, `leadColors`, `CallHistoryView`, `MessageContentRenderer`, `leadTemplates`, `performanceUtils`, `CustomDateRangeReports`, `LeadProximityInsights`, `ui-registry.md`.

**Leftover soft debt (non-blocking):** deeper `font-black` / `rounded-xl` residues in WhatsAppInbox, Admin KPI widgets, AgentReportCard, ThemeMockupPreview; A7 MANUAL QA checklist; Map Pointer Events + outbound dialer dual-host merge.

### Wave 10 Agent 7 — Accessibility (July 17, 2026) — additive notes

**DLS version stays v1.4** (no bump). Presentation / semantics / focus only — no business logic, schema, API, or permission changes. Map Pointer Events rewrite skipped (Agent 8 gate stands). **Do not claim perfect WCAG AA without MANUAL QA.**

| Topic | Standard |
| --- | --- |
| **Modal / Drawer `closeLabel`** | Optional prop (default `"Close"`). Dialer outbound / simulated → `"End call"`; IVR ringing → `"Decline call"`. |
| **IVR host** | Sole IVR ringing overlay = `ModalHost` `DialerOverlay`. Dashboard mount passes `activeIvrCall={null}` to avoid dual focus traps. Outbound still has two state hosts (Dashboard dialer vs AppShell DialPad) — merge deferred. |
| **Focus imprint** | Interactive chrome: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring`. Applied to ThemeToggle, sidebar nav helpers, DesktopSidebar collapse, SidebarFooter sign-out, MobileBottomNav, Dial FAB / Add Lead FAB. |
| **Icon-only labels** | Collapse / Sign out / Theme options / collapsed sidebar destinations / Account bottom-nav control labeled. |
| **Dropdowns** | Notification + status menus: Escape dismiss, click-outside, `aria-expanded` / `aria-haspopup`, unread announced in text (`sr-only` + count in bell label). Mark-read controls ≥44px + focus ring. |
| **Status** | Dialer / Power Dialer already text + color; notification unread not color-alone. |
| **Agent Profile** | Preference switches: labeled checkboxes + `peer-focus-visible` ring; Copy link button focusable/labeled. Visual theme residual → A9. |

**Files touched:** `Modal`, `Drawer`, `DialerOverlay`, `SimulatedDialerOverlay`, `Dashboard` (IVR null-out), `DashboardHeader`, `AgentProfileView`, `ThemeToggle`, `DesktopSidebar`, `SidebarFooter`, `SidebarNavigationMenu`, `CRMSubmenu` / `CallsSubmenu` / `MapsSubmenu` / `OperationsDeskSubmenu`, `sidebarNavStyles`, `MobileBottomNav`, `ModalHost`, `ui-registry.md`.

**MANUAL QA leftover (required before claiming AA):**
- [ ] Keyboard: Tab through header → status menu → notifications → ThemeToggle; Escape closes menus; no focus trap outside open Modal/Drawer
- [ ] Dialer: Escape / header control ends outbound call (`End call`); IVR Decline via header (`Decline call`); only one IVR dialog when ringing on Dashboard
- [ ] Screen reader: icon-only sidebar (collapsed) + Account + Dial FAB announce names; dialer status/live region updates
- [ ] Light + dark: focus ring visible on chrome + dialer controls
- [ ] Mobile: bottom nav + profile drawer focus order; FAB focus rings

### Wave 10 Agent 10 — QA & Consistency (July 17, 2026) — Wave 10 complete summary

**DLS version stays v1.4** (no bump). Audit-only close-out; Agent 9 visual polish may still have been concurrent at scoring time.

| Gate | Result |
| --- | --- |
| Native `alert` / `confirm` / `prompt` in `src/` | **0** (ESLint `no-alert` + `no-restricted-globals` enforced) |
| Nav taxonomy | **PASS** — `NAV_LABELS` / `ADMIN_NAV_GROUPS` drive sidebar, bottom nav, drawers, Admin |
| Modal / Dialog / Dialer a11y | **PASS (code)** — focus trap, Escape, return-focus, `closeLabel` End/Decline call; MANUAL QA checklist above still open |
| Lint | **2 pre-existing errors** (auth/`useUsersStore`) + restricted-import warnings — not Wave 10 regressions |
| Build | **PASS** (`vite build` OK) |

**Strict scores (before → after Wave 10 estimate):** Design 7.8 → **8.9** · UX 7.5 → **9.0** · A11y 7.0 → **8.8** · Responsive 7.5 → **9.0** · Visual 7.0 → **8.5** (Agent 9 concurrent). Targets Design≥9.5 / Visual≥9 / A11y≥9 **not fully met**.

**Cohesion verdict:** **CONDITIONAL PASS** — primary chrome + Agent 9 polished islands (Profile, Training, Admin Users/Targets, ProjectMap header, Lead Detail header, Call History KPIs, Leads group colors) read as one product. Soft secondary residues remain (WhatsAppInbox / Admin KPI widgets / ThemeMockup).

**Post–Wave 10 debt (priority):** (1) Soft residual `font-black` / `rounded-xl` on WhatsAppInbox, AdminDashboardKPICards, AgentReportCard, ThemeMockupPreview; (2) A7 MANUAL QA checklist; (3) Map Pointer Events + outbound dialer dual-host merge; (4) Shared residual indigo (`Toast` info, `sidebarNavStyles` tones, `NotFound` / `ErrorBoundary` / `CallRecordingPlayer`).

### Wave 10 continuation — island sweep (July 17, 2026)

**DLS version stays v1.4** (no bump). Thin feature-island token sweep after Agent 10 CONDITIONAL PASS (Design 8.9 / Visual 8.5).

| Topic | What changed |
| --- | --- |
| **Weight** | All `font-black` / `font-extrabold` in `src/features` → `font-bold` (0 leftovers). |
| **Radius** | High-traffic + admin settings `rounded-xl` → `rounded-theme` (sheet tops untouched). Residual: `ThemeMockupPreview` only (theme sandbox). |
| **Emoji** | Cleared persistent emoji UI in `leadTemplates`, `CustomDateRangeReports`, `LeadProximityInsights`, `PendingDiscountsApprovals`, `AdminTrainingTabs` coaching/events — text + Lucide. |
| **Indigo → theme** | `CallHistoryView` KPI well, `Toast` info, `NotFound`, `ErrorBoundary`, `SegmentedStageTracker` selected state, `sidebarNavStyles` leads/users/slate tones, `CallRecordingPlayer`. `AdminTargetsTab` already theme-clean (skipped). |
| **Skipped / coordinate** | Agent 9 Profile/Training HQ files not mid-conflict; Training admin placeholders owned here. |

**Remaining soft debt:** A7 MANUAL QA; Map Pointer Events + dialer dual-host; ThemeMockupPreview sandbox radii; sparse semantic rainbow on niche admin charts (not indigo wells). Honest post-sweep estimate: Design **~9.1** / Visual **~8.9** — likely ≥9 Design; Visual still just under 9 without Agent 9 screenshot close-out.

### Inviting Work Atmosphere (July 17, 2026) — additive notes

**DLS version stays v1.4** (no bump). Token-value upgrade only — no second design system, no business logic. Appearance + branding writers unchanged in responsibility.

| Topic | Before → After (intent) |
| --- | --- |
| **Light canvas** | Cool flat sage `#f3f6f4` + pure white cards → warm sage `#f1f5f2`, soft card `#fcfdfc`, surface `#e5ece7` |
| **Light type** | Cold slate text `#0f172a` / muted `#5a6b63` → forest charcoal `#15201c` / friendlier muted `#5f7269` |
| **Light borders / ring** | `#d5e0da` / `#b8d9d0` → softer `#d7e1db` / `#c2d9cf` |
| **Dark canvas** | Near-void `#0b1a16` + tight cards → inviting forest `#0c1b17`, lifted card `#17352c`, surface `#143028` |
| **Dark type / borders** | Harsh white + dim muted → soft `#eef3f0` / `#a0b3aa`; clearer border `#23453c` |
| **Semantics** | Neon-leaning danger `#ef4444`, gold `#c9a227`, success `#43A047` → cohesive coral `#D65C5C`, soft gold `#C4A032`, success `#3D9B4A`; **info** `#2A7D8C` (teal, not sky island) |
| **Elevation** | Flat black micro-shadows → green-tinted soft depth (`--elevation-sm` / `--elevation-md`); dark card-premium uses elevation tokens |
| **Canvas glow** | Stronger brand radials → calmer green/gold washes for all-day comfort |
| **Login** | Pulsing orbs + hardcoded gold → static token-driven glows; `shadow-elevation-sm` |
| **Badge `info`** | Sky raw utilities → `theme-info` (branding override via `--theme-info`) |

**Sources of truth (kept in sync):** `telecaller-app/src/index.css` (`:root` / `.dark`), `useThemeStore` `STRUCTURAL_*`, `brandPalette.ts` defaults, `useBrandingStore` identity writers (accent / semantic / soft `--box-shadow`).

**Preserve:** Admin branding still overrides accent, success, warning, danger, info, radius, shadow intensity, gradients. Appearance still owns structural surfaces on light/dark flip.

**Risks:** Orgs with saved Firestore branding colors keep their identity (only defaults + CSS fallbacks change). Soft off-white cards may look “less white” next to screenshots of pure `#fff`. Danger coral is slightly softer — still readable on Badge / Dialog danger.

### Brand Customizer → Login & loading (July 18, 2026) — additive notes

**DLS version stays v1.4** (no bump). Presentation-only: login + boot screens consume Brand Customizer tokens.

| Topic | Standard |
| --- | --- |
| **Bootstrap** | `useBrandingStore` mounts at `App` root (pre-auth). `applyBrandingToDom` + `ga_branding_cache` theme login/boot before Firestore. |
| **Controls** | Existing Brand Colors + Surfaces + company/logo/tagline — no separate login atmosphere fields. |
| **Surfaces** | Login left = `app-canvas`; form = `card-premium`; hero = `sidebar-brand-rail` (sidebar gradient). Boot = `BrandedBootScreen`. |
| **Rules** | `settings/branding` public-read so unauthenticated login can load live theme; write remains admin-only. |

### Wave 10 — Inviting surfaces (July 17, 2026) — additive notes

**DLS version stays v1.4** (no bump). Presentation-only polish on **primary daily paths** so work surfaces feel calm and inviting. Coordinates with theme-token refresh — consumers use `theme-*` / `type-*` / shared primitives so palette changes apply automatically. **No business logic.**

| Surface | Standard |
| --- | --- |
| **Shell** | `PageHeader` / `DashboardHeader` / sidebar / bottom nav: calmer density, `type-page-title` / `type-card-title`, `rounded-theme`, active rail accent via `theme-warning` (not hardcoded gold hex). |
| **Bottom nav** | Soft `rounded-theme` pills (not `rounded-full` clusters); `font-semibold`; frosted `bg-theme-card/95`. |
| **Leads command bar** | Card-level quiet chrome + flush preset strip; chips separated by a light rule; empty → friendly `EmptyState` + `Button` reset. |
| **Lead detail** | Calm sticky header via shared `Button` / `Badge`; no hover-scale; mid tabs use accent card (not brand-gradient); not-found → `EmptyState`; timeline/scripts on theme tokens (no slate/indigo/amber islands). |
| **Attendance** | Already DLS — tighter vertical rhythm (`space-y-5`), month chip on `theme-card`. |
| **Dialer chrome** | Contact block uses `type-card-title`; hierarchy only — no decorative motion. |
| **Stage tracker** | Theme surface + semantic dots (`theme-accent` / `warning` / `success` / `danger`); no gray/white islands. |

**Motion:** Functional transitions only (`transition-colors`). No decorative pulse / bounce / scale on primary chrome.

**Files touched:** `PageHeader`, `DashboardHeader`, `DesktopSidebar`, `sidebarNavStyles`, `MobileBottomNav`, `LeadsWorkspace`, `LeadListPresetStrip`, `LeadDetailsPage`, `SmartCallScript`, `LeadInteractionHistory`, `AttendanceTab`, `DialerChrome`, `SegmentedStageTracker`, `ui-registry.md`.

### Wave 10 — Admin & secondary CRM polish (July 17, 2026) — additive notes

**DLS version stays v1.4** (no bump). Invite-to-work language on Admin shell + reports widgets + WhatsApp/calls residual islands. Presentation-only; Admin tab routing unchanged.

| Surface | Standard |
| --- | --- |
| **Admin shell** | Content well `p-3 md:p-5` / `space-y-4`; pinned chrome stays `bg-theme-card` + `PageHeader`. |
| **Report widgets** | Prefer shared `Card` / `CardHeader` / `CardBody` + `type-label` headers; soft wells = `bg-theme-surface` + `border-theme-border` + `rounded-theme` + `shadow-elevation-sm`. |
| **KPI tiles** | `AdminDashboardKPICards` / date-range KPIs: theme card shell + elevation-sm; icon wells `theme-accent-muted` / semantic `/15`. |
| **Status chips** | Shared `Badge` (`success` / `info` / `warning` / `default`) — no gray/green/blue raw islands. |
| **Empty states** | `EmptyState` inside Card (agents board, report card select, rated-calls table). |
| **WhatsApp / calls** | Inbox + in-call bar: `theme-success` / `theme-danger` / `rounded-theme` / `shadow-elevation-*` (no emerald/rose/green raw). Bubbles `rounded-theme`. |
| **Training admin** | Section icons `text-theme-accent`; forms on `theme-surface`; event CTAs `theme-warning` / `theme-danger`. |
| **Theme mockup chrome** | Outer preview chrome on theme tokens; inner sandbox may keep CSS-var preview frame. |
| **Forms / modals** | Sheet modals keep `px-6 py-5` body + `px-6 py-4` header/footer; consumers use `FIELD_*` + shared Button. |

**Indigo cleared on admin/calls paths.** Maps: chrome-only (no geometry). Profile / Training HQ verified clean (no indigo/gray islands).

**Files touched:** `Admin`, `AdminDashboardHeader`, `AdminDashboardKPICards`, `AgentStatusBoard`, `ProjectInventoryDashboard`, `AgentReportCardTab`, `CustomDateRangeReports`, `CallQualityTab`, `AdminTrainingTabs`, `CloudFunctionCodeReference`, `WebhookSimulatorConsole`, `ThemeMockupPreview`, `EvolutionIntegrationsPanel`, `AdminTargetsTab`, `WhatsAppInboxView`, `InCallWhatsAppBar`, `ProjectMapsView`, `ui-registry.md`.

---

### InteractionDialog

File: `telecaller-app/src/shared/components/ui/InteractionDialog.tsx`  
Last updated: July 17, 2026

| Property | Class / pattern |
| --- | --- |
| Shell | Shared `Dialog` → `Modal` (focus trap, Escape, return-focus) |
| Prompt field | Shared `Input` with label |
| Confirm footer | Cancel outline → Confirm primary/danger (FormActions via Dialog) |
| Alert footer | Single OK (cancelLabel) |

**Pattern notes:** Hooks expose `interaction` + `clearInteraction`; page/tab hosts render `<InteractionDialog />`. Toast for non-blocking messages.

### DialerOverlay / SimulatedDialerOverlay

File: `telecaller-app/src/features/calls/components/DialerOverlay.tsx`, `SimulatedDialerOverlay.tsx`, `DialerChrome.tsx`  
Last updated: July 17, 2026

| Property | Class / pattern |
| --- | --- |
| Host | `Modal` sheet (outbound) / center (IVR); IVR only from `ModalHost` |
| Close label | Outbound `closeLabel="End call"`; IVR `closeLabel="Decline call"` |
| Surface | `bg-theme-card` `border-theme-border` `rounded-theme` (via Modal) |
| Status chip | `bg-theme-surface` `border-theme-border` + dot `bg-theme-accent` \| `bg-theme-success` + text |
| Avatar idle | `bg-theme-accent-muted` `border-theme-accent/30` `text-theme-accent` |
| Avatar active | `bg-theme-success/15` `border-theme-success/30` `text-theme-success` |
| Timer | `font-mono` `text-theme-success` `tabular-nums` |
| Mute on | `bg-theme-danger/10` `border-theme-danger/40` `text-theme-danger` |
| Speaker on | `bg-theme-accent-muted` `border-theme-accent/40` `text-theme-accent` |
| End call | `bg-theme-danger` circle `h-16 w-16` |
| IVR Answer | `Button` `variant="success"` |
| IVR Decline | `Button` `variant="outline"` |

**Pattern notes:** Presentation-only; do not change dial / answer / end / IVR bridge / call-log triggers. Prefer `DialerChrome` helpers for any future dialer surfaces.

---

## 1. Core Principles

| Principle | Meaning |
| --- | --- |
| **Calm over decorative** | Prefer quiet surfaces, theme borders, and Lucide icons. No gamified chrome in persistent UI. |
| **Information hierarchy first** | Tier 1 goals scan in &lt;3s. Supporting widgets stay quieter. Weight and size encode importance. |
| **Brand as accent** | Deep green + warm gold are accents and CTAs — not wallpaper. Content sits on `theme-card` / canvas. |
| **Productivity over novelty** | Every visual choice should help an agent work faster. If a first-time user would not understand it faster, do not change it. |

**Density target:** ~70% Linear/Stripe content density + ~30% Salesforce-like chrome. Open dashboard canvas; keep sidebar/header compact.

---

## 2. Design Tokens

**Rule:** Extend the existing system. Do **not** introduce a new token architecture.

### Appearance vs branding

| Layer | Owner | What it sets |
| --- | --- | --- |
| **Appearance** | `useThemeStore` / light–dark | Resolves Light / Dark / System (`dark` class). Structural defaults until branding overwrites. |
| **Branding** | `useBrandingStore` / Theme & Branding | Identity + surfaces: `--theme-accent`, `--theme-secondary`, light/dark `--theme-bg` / card / text / border / sidebar, `--radius`, `--box-shadow`, canvas / sidebar / brand gradients. Applied at **app bootstrap** (not only after login) via Firestore + `ga_branding_cache`. |

**Login & loading:** use the same tokens — `app-canvas` / `BrandedBootScreen` / login form + `sidebar-brand-rail`. Customize via existing Brand Colors + Surfaces (no separate login fields). Verify: change Primary → Go Live → log out → login/boot reflect the new palette.

### Semantic utilities (prefer these)

| Token / class | Use |
| --- | --- |
| `bg-theme-bg` / `app-canvas` | Page canvas (incl. login left column & boot screens) |
| `bg-theme-card` / `bg-theme-surface` | Cards / inset surfaces |
| `text-theme-text` / `text-theme-muted` | Primary / secondary copy |
| `border-theme-border` | Default borders |
| `text-theme-accent` / `bg-theme-accent` / `bg-theme-accent-muted` | Brand actions & soft accents |
| `text-theme-secondary` | Secondary / gold accents (login checkmarks, rail highlights) |
| `text-theme-success` / `warning` / `danger` / `info` | Status meaning (not decoration) |
| `bg-brand-gradient` / `text-brand-gradient` | Primary CTAs / wordmarks |
| `sidebar-brand-rail` / `header-brand-strip` | Shell brand chrome + login hero panel |
| `BrandedBootScreen` | Auth loading + Suspense fallback (theme tokens + company name) |

### Baseline palette (defaults)

| Role | Value |
| --- | --- |
| Primary (brand green) | `#2E7D32` → hover `#256A2A` (chrome gradients may use deep `#0F5C4C`) |
| Secondary (soft gold) | `#C4A032` → hover `#B08F2A` |
| Success | `#3D9B4A` — distinct from primary |
| Warning | `#C4A032` |
| Danger | `#D65C5C` |
| Info | `#2A7D8C` |
| Light canvas / card | `#f1f5f2` / `#fcfdfc` |
| Dark canvas / card | `#0c1b17` / `#17352c` |

Indigo / purple / raw gray islands in new or Wave‑1‑touched UI are **superseded**. Remapped `indigo-*` utilities may still resolve via branding bridges — prefer explicit `theme-*` on new work.

---

## 3. Card Contract

One card language. Premium means elevation hierarchy, **not** a larger radius.

| Property | Spec |
| --- | --- |
| **Radius** | `--radius` (branding default **12**). Utilities: `rounded-theme`, `rounded-b-theme`, `rounded-t-theme`. Do not hardcode `rounded-xl` / `rounded-2xl` / 20px on cards or widget shells. |
| **Padding** | Page cards: `CardHeader`/`CardBody`/`CardFooter` (`px-6 py-4` / `p-6`). Widget bodies: `p-3.5` compact / `p-5` comfortable (WidgetGrid). Prefer `space-widget` / `space-widget-compact` helpers. |
| **Shadow / elevation** | Default: `shadow-elevation-sm`. Raised/premium hover: `shadow-elevation-md`. No hover translate. |
| **Border** | `border border-theme-border` (or transparent only for intentional borderless variant). |
| **Surface** | `bg-theme-card`. |
| **Header** | Shared `CardHeader` or widget `WidgetHeader` — bottom border, no decorative chrome. |

**Primitives**

- `Card` → `rounded-theme` + `shadow-elevation-sm` + theme border
- `.card-premium` → same radius/`--radius`; elevation hover only
- `.widget-shell` → Agent dashboard tile chrome; quiet border hover (no `-translate-y`)

**Branding note:** Do not migrate Firestore `borderRadius` values. Client default is 12 only when the field is missing.

---

## 3a. DataTable Contract (Wave 2 — v1.1)

Canonical table language for Admin lists (shared `DataTable`) and alignment target for the custom Leads desktop table. **Adoption only** — do not invent tokens mid-implementation; do not change sort/filter/page/CSV/search algorithms; do not merge Leads into the shared primitive without a separate decision.

**Primitives:** `telecaller-app/src/shared/components/DataTable.tsx`, `Badge`, `EmptyState`.  
**Leads exception:** `LeadsDesktopTable` / `LeadsTableRow` remain custom for grouping/compact/filter-row; they must follow this contract visually.  
**Consumers (v1.1):** AdminLeadsTab, AgentLeaderboardTab, AdminUsersTab, AdminProjectsTab, LeaveRequestsManagement, AuditSettingsTab, AdminAttendanceTab, AdminRosterTab, plus Leads desktop/mobile presentation.

### Surface

| Spec | Value |
| --- | --- |
| Container | `bg-theme-card`, `border-theme-border`, `rounded-theme` |
| Elevation | Quiet `shadow-elevation-sm` when the table is the card (avoid double chrome if parent already cards) |
| Dividers | `divide-theme-border` |

### Header

| Spec | Value |
| --- | --- |
| Background | Sticky `bg-theme-surface` (`sticky top-0 z-20`, optional `shadow-sm`) |
| Typography | `type-label` / `font-semibold` uppercase tracking; **no** `font-black` / `font-extrabold` |
| Height | **44px** (`h-11`) — see Density (§3c) |
| Sort control | Native `<button>` + Lucide chevron + focus ring (below) |

### Row states

| State | Spec |
| --- | --- |
| Default | `bg-theme-card`; body text `text-theme-text` at regular weight unless hierarchy says otherwise |
| Hover | `hover:bg-theme-surface/60` |
| Selected | `bg-theme-accent-muted/40` (not indigo) |
| Density | Comfortable `h-12` / compact `h-10` on shared primitive; Leads uses existing compact/normal padding |

### Selection

| Spec | Value |
| --- | --- |
| Wash | `bg-theme-accent-muted/40` |
| Checkbox | `border-theme-border text-theme-accent` + theme focus ring |
| Labels | Prefer `aria-label` on select-all / select-row (shared `DataTable`) |

### Hover

Quiet surface tint only — **no** translate/lift theater on rows.

### Focus

Interactive table chrome uses Wave 1.5 imprint:

`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring`

Applies to: search, export, sort headers, pagination, checkboxes, Leads row action buttons / group collapse.

### EmptyState

| Context | Spec |
| --- | --- |
| Shared `DataTable` | Compact `EmptyState` (`variant="compact"`, quiet / `hideIcon` as needed) — **not** italic slate empty rows |
| Leads desktop | Empty owned by parent workspace (unchanged); do not invent a second empty language inside the table |

### Badge usage

| Use | Spec |
| --- | --- |
| Status / priority / SLA / role / leave type | Shared `Badge` + semantic `variant` (`default` \| `primary` \| `success` \| `warning` \| `danger` \| `info`) |
| Forbidden | Persistent emoji in chips; decorative pulse on badges |
| Ranks | Numeric rank badges (Wave 1 leaderboard pattern), not medals |

### Motion rules (tables)

| Allowed | Forbidden in table chrome |
| --- | --- |
| Short color/border `transition-colors` | Decorative `animate-pulse` on overdue / SLA / HOT / pending counts |
| Functional state change | Looping gamified motion in dense lists |

Aligns with §9 Motion + §10 Emoji Policy.

### Toolbar contract

| Spec | Value |
| --- | --- |
| Height band | **48px** (`min-h-12`) |
| Search | Theme input (`bg-theme-card` / surface, `border-theme-border`, `rounded-theme`, placeholder `text-theme-muted`); Lucide `Search` |
| Export | Outline `Button` + Lucide `Download`; **same CSV behavior** |
| Behavior | Search may reset page; filter IA owned by Command Surface / Filter Contract (§3d) |

### Pagination contract

| Spec | Value |
| --- | --- |
| Height band | **48px** (`min-h-12`) |
| Chrome | `bg-theme-surface`, `border-theme-border`, `rounded-theme` |
| Copy | Quiet `type-label` / muted “Showing Page X of Y” |
| Controls | Outline `Button` Prev/Next + Lucide chevrons + focus ring |
| Behavior | Existing page math unchanged |

Hierarchy + measurable density continue in §3b / §3c.

---

## 3b. Table Hierarchy Contract (Wave 2 — v1.1)

Purpose: prevent every column from equal visual weight. Consumers emphasize primary columns; the shared `DataTable` defaults body cells to regular weight so hierarchy can emerge.

| Tier | Columns (CRM examples) | Visual treatment |
| --- | --- | --- |
| **Primary** | Lead Name, Status, Follow-up (or equivalent key columns) | `text-theme-text` + `font-semibold` / `font-bold` only where meaning needs weight |
| **Secondary** | Phone, Source, Assigned, Project | `text-theme-text` or quiet `text-theme-muted`; regular weight |
| **Tertiary** | Created, Updated, Internal IDs, touchpoint counts | `text-theme-muted` / `type-label`; never compete with primary |

**Shared primitive default:** body cells use regular `text-theme-text` (no global `font-medium` / `font-bold`). Column `className` / consumer renders own the hierarchy.

**Table Scan Test:** within ~2s a first-time user should identify primary entity, status, next action, owner, and selection — adjust typography weight first, not more color, when columns compete.

---

## 3c. Table Density Contract (Wave 2 — v1.1)

Measurable chrome heights for shared `DataTable` (and table ecosystem alignment). Optional `density` prop: `comfortable` (default) \| `compact`.

| Region | Height | Notes |
| --- | --- | --- |
| **Toolbar** | **48px** | Search / export row; `min-h-12`; normalized horizontal gap |
| **Header** | **44px** | `h-11`; sticky `bg-theme-surface`; `type-label` / `font-semibold` (no `font-black`) |
| **Row (comfortable)** | **48px** | Default Admin density; `h-12` |
| **Row (compact)** | **40px** | Optional via `density="compact"`; `h-10` |
| **Pagination** | **48px** | Footer bar; `min-h-12` |

Normalize checkbox column padding, toolbar spacing, and pagination spacing to match these bands. Selection wash = `bg-theme-accent-muted` (not indigo). Checkboxes = `text-theme-accent` + theme focus ring.

---

## 3d. Command Surface / Filter Contract (Wave 3 — v1.2)

> **Authoritative as of DLS v1.2.** Formalizes filter / search / toolbar / bulk / preset chrome as **command surfaces**. Aligns with Table Density (§3c) when filters sit near tables. Presentation wrappers only — **do not** invent a second filter state layer. Preserve Leads **draft → Search → applied** model (no instant-apply / debounce-as-live-filter).

**Primitives:** `LeadFilterFieldControl` (field control — reuse, do not fork), `LeadListFilterChips` (canonical removable chips — one path), `FilterSearchInput`, `FilterPanelShell` (thin chrome shells; no filter state).

### Surfaces covered

Filter bars, search bars, toolbars, bulk action bars, preset strips — **one visual level**, Stripe-Dashboard quiet, not decorative widgets.

| Spec | Value |
| --- | --- |
| **Bar surface** | Sit on `bg-theme-surface` (or `theme-card` when the bar *is* the card). `border-theme-border`. Prefer `rounded-theme`. |
| **Elevation** | **No decorative elevation.** Quiet `shadow-elevation-sm` only when the surface is itself a card edge; do not stack card-in-card. |
| **Density** | One visual level; consistent control heights / baseline alignment; 8pt spacing rhythm (`gap-2` / `gap-3`). |
| **Color** | Theme tokens only — no rainbow borders, indigo islands, or unnecessary borders. |

### Measurable heights (align with Table Density)

| Region | Height | Notes |
| --- | --- | --- |
| **Toolbar / search / bulk bar** | **48px** band | `min-h-12`; Lucide icon + control; matches DataTable toolbar (§3a / §3c) |
| **Comfortable filter field** | **~40px** | Non-dense `LeadFilterFieldControl` / panel inputs (`py-2` + `rounded-theme`) |
| **Dense column filter (Excel row)** | **24px** (`h-6`) | Sticky thead filter row — keep dense; do not inflate to 44px |
| **Table header (adjacent)** | **44px** (`h-11`) | Unchanged — §3c |
| **Chip row** | Content height | `gap-2`; chips use control padding, not pill theater |

### Control chrome

| Concern | Rule |
| --- | --- |
| **Radius** | `rounded-theme` / `--radius` on fields, search, panel shell, chips. Sheet top radius may stay larger for gesture. Avoid new `rounded-full` pill defaults for chips. |
| **Typography** | `type-label` / `font-semibold` on chrome labels; **no** `font-black` / `font-extrabold` on command surfaces. |
| **Icon placement** | Lucide leading (search) or trailing (select chevron); `text-theme-muted`; `aria-hidden` when decorative. |
| **Filled field** | Accent-muted wash: `border-theme-accent/50 bg-theme-accent/10` when value present — not indigo/gray. |
| **Focus** | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring` (Wave 1.5 imprint). |
| **Search** | Shared `FilterSearchInput`: Lucide `Search`, theme input, `rounded-theme`, `h-10`, required `aria-label` (or placeholder-as-label). Match DataTable toolbar; consumer owns query wiring. |

### Action hierarchy

| Role | Spec |
| --- | --- |
| **Primary** | Apply / Search — `bg-theme-accent` + `text-theme-accent-fg` |
| **Secondary** | Reset / Cancel / outline — `border-theme-border` + `bg-theme-card` / surface; muted idle |
| **Destructive** | Clear All / remove — `text-theme-danger` (text button or chip dismiss); not loud red fills |

### Chips (canonical path)

| Spec | Value |
| --- | --- |
| **Component** | `LeadListFilterChips` — **one** shared presentation; do not add parallel `FilterChip` / `AdminFilterChip` |
| **Meaning** | Removable summary of **applied** filters — distinct from status `Badge` |
| **Chrome** | `bg-theme-accent-muted`, `text-theme-accent`, `border-theme-border`, `rounded-theme`, Lucide `X` |
| **Clear All** | `text-theme-danger` |
| **A11y** | Per-chip remove labeled (`aria-label`); keyboard-focusable |

### Apply model (hard fence)

Leads column filters: **draft → Search (or Enter) → applied**. Preset / chip clear / Reset may write applied per existing hook semantics. **Do not** introduce instant filtering, debounce-as-live-filter, or auto-search under this contract. No query / Firestore / saved-filter model changes in presentation waves.

### Empty (when filters yield zero)

Prefer shared `EmptyState variant="compact"` + reset affordance. Do not invent a second empty language inside filter chrome.

### Consumers (v1.2)

| Surface | Canonical path |
| --- | --- |
| Leads desktop | `LeadListDesktopFilterRow` + `LeadFilterFieldControl` (sticky thead) |
| Leads mobile | `LeadListMobileFilterSheet` |
| Leads chips / presets / command bar | `LeadListFilterChips`, `LeadListPresetStrip`, `LeadsWorkspace` |
| Admin advanced panel | `LeadsFilterPanel` via `FilterPanelShell` |
| Admin / DataTable search | `FilterSearchInput` |
| Legacy (deprecated) | `QuickAccessStatusTabs`, `LeadsFilters`, `AdvancedFiltersPanel` — do not remount; prefer canonical paths above |

### Non-goals (this contract)

No second filter architecture; no merge of `LeadListFilters` and Admin `AdvancedFilters` state; no user-saved preset backend; no emoji on presets/tabs; no Forms/Modals redesign.

---

## 3e. Form Contract (Wave 4 — **canonical as of v1.3**)

> **Authoritative as of DLS v1.3.** Formalizes field / action / form-host chrome. Aligns with Wave 1.5 focus + Command Surface §3d action hierarchy. **Do not** invent a parallel form framework.

**Primitives (harden / reuse — do not fork):** `Input`, `Select`, `Textarea`, `Checkbox`, `Button`, thin `FormActions`, shared `Modal` / `Dialog`. Shared field chrome helpers: `formField.ts` (`useFormFieldIds`, control/label classes).

**`.input-premium` bridge:** CSS class aliases shared field radius / surface / focus-visible tokens. Major lead + admin + utility form consumers use shared primitives; residual dense editors may still use `.input-premium` / `FIELD_CONTROL_CLASS` where density requires it.

**Wave 4 consumer status (2026-07-13):** Major Leads create/edit, lead-detail tools, Admin modal hosts + settings tabs, Login, and utility call/link/campaign modals adopted shared `Input` / `Select` / `Textarea` / `Checkbox` + `FormActions` + `Modal` where practical. Phase 4 presentation polish complete — see [`directives/wave4-phase4-validation.md`](directives/wave4-phase4-validation.md).

### Field chrome

| Concern | Rule |
| --- | --- |
| **Surface** | `bg-theme-surface`, `border-theme-border`, **`rounded-theme`** (`var(--radius)`) |
| **Text** | Value `text-theme-text`; labels `type-label` / `font-semibold text-theme-muted`; avoid `font-black` on field labels |
| **Focus** | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring` (Wave 1.5 imprint) |
| **Label** | Auto-generate stable `id` when omitted; `htmlFor` always associated when `label` set |
| **Required** | Optional visual `*` (`text-theme-danger`) when HTML `required` is set — **do not** change which fields are required |
| **Helper** | Optional `helperText` muted under field |
| **Error** | `error` string under field; danger border; **`aria-invalid`** + **`aria-describedby`**; error replaces helper when both would show |
| **Spacing** | Field stack `space-y-1.5`; section / grid rhythm prefer `gap-3` / `gap-4` (8pt) |

### Section layout

| Concern | Rule |
| --- | --- |
| **Section title** | `type-label` / `font-semibold text-theme-accent` (or muted); `border-theme-border` dividers |
| **Grouping** | Preserve existing IA (e.g. LeadSubmission sections); unify chrome only |
| **Density** | ~70% Linear/Stripe + ~30% Salesforce chrome — match Waves 1–3 |

### Validation chrome (presentation)

| Concern | Rule |
| --- | --- |
| **Inline error** | Prefer per-field `error` on shared primitives (AddLead / UserAccount pattern) |
| **No `alert()`** | For routine field errors in new chrome |
| **Schemas** | Owned by validation layer — **out of Wave 4 presentation scope** |
| **Success** | Theme success + dual CTAs where already present; **no** persistent emoji on form controls / success copy |

### Action bars (inherit Command Surface §3d)

| Role | Spec |
| --- | --- |
| **Primary** | Save / Create / Submit — `Button` `primary` (`bg-theme-accent` + `text-theme-accent-fg`) |
| **Secondary** | Cancel / dismiss — `Button` `outline` (`border-theme-border`) |
| **Destructive** | Delete / remove — `text-theme-danger` text/ghost (not loud fills by default) |
| **Helper** | Optional thin `FormActions` — layout only; **no** form state ownership |
| **Premium map** | `btn-premium-primary` ≈ Primary; `btn-premium-secondary` ≈ Secondary — one hierarchy |

### Modal / dialog hosts (form-related)

| Concern | Rule |
| --- | --- |
| **Shell** | Prefer shared `Modal` / `Dialog`; theme overlay; `rounded-theme` |
| **A11y** | Full overlay contract in **§3f** — `role="dialog"`, `aria-modal`, titled via `aria-labelledby`, close `aria-label`, Escape, focus trap, return-focus |
| **Footer** | Right-aligned; Secondary then Primary; Destructive optional leading (`FormActions`) |
| **Focus trap** | **Delivered in Wave 5** — see Modal/Drawer Contract §3f |

### Non-goals (this contract)

No Zod / schema / required-set changes; no Firestore / submit / routing; no second form kit (`FormKit`). Sheet-style TemplateCenter / BulkLeadImport host migration and modal focus trap delivered in Wave 5 (§3f). Wave 4 close-out: [`directives/wave4-complete.md`](directives/wave4-complete.md).

---

## 3f. Modal/Drawer Contract (Wave 5 — **canonical as of v1.4**)

> **Authoritative as of DLS v1.4.** Formalizes overlay chrome for `Modal` / `Dialog` / `Drawer`. Aligns with Form Contract §3e hosts + Command Surface §3d actions + Motion §9 + A11y §12. **Do not** invent a third overlay system or parallel `Sheet.tsx`.

**Primitives (reuse — do not fork):** `Modal`, `Dialog`, `Drawer`, shared `useOverlayFocus` / `getOverlayFocusableElements` (Modal exports; Drawer imports).

**Wave 5 consumer status (2026-07-13):** High-value form hosts, TemplateCenter sheet, BulkLeadImport, CallAudit / Shortcuts / Merge overlays, mobile filter sheets, Customizer / Mobile profile / DialPad drawers, and high-traffic confirms adopt shared overlays. Phase 4 static + tooling **PASS**; interactive keyboard / SR / Light–Dark remain **MANUAL QA** residuals — see [`directives/wave5-phase4-runtime-validation.md`](directives/wave5-phase4-runtime-validation.md).

### Primitives

| Primitive | Role |
| --- | --- |
| **`Modal`** | Canonical overlay host (forms, large tools, sheets via `variant`) |
| **`Dialog`** | Confirm / short prompt — **always** composes `Modal` |
| **`Drawer`** | Edge / bottom sheet sibling — same a11y contract as Modal; not a third visual language |

### Shell

| Concern | Rule |
| --- | --- |
| **Overlay** | `bg-theme-overlay` + quiet blur; one token for all hosts |
| **Surface** | `bg-theme-card`, `border-theme-border`, **`rounded-theme`** (sheet top may use larger radius for gesture) |
| **Motion** | Center: scale/fade enter; Bottom sheet: `animate-sheetSlideUp`; Side drawer: edge slide — functional only |
| **Sizes** | Modal: `sm` \| `md` \| `lg` \| `xl` \| `2xl`; Drawer: `sm` \| `md` \| `lg` (width/height by position) |
| **Variants** | Modal `variant?: "center" \| "sheet"` — sheet = bottom on small, centered `sm+`; **no** separate Sheet primitive |
| **Backdrop** | `closeOnBackdrop` default `true`; Dialog danger defaults `false` (overridable) |

### Structure

| Region | Rule |
| --- | --- |
| **Header** | Title `font-semibold` / quiet; optional subtitle muted; close control labeled via `closeLabel` (default `"Close"`) ≥44px + `focus-visible` ring |
| **Body** | Scrollable; form fields follow Form Contract §3e |
| **Footer** | Right-aligned; **FormActions** for forms; Dialog Confirm = Secondary outline then Primary/Danger |

### Accessibility

| Concern | Rule |
| --- | --- |
| **Semantics** | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` (required), optional `aria-describedby` |
| **Dismiss** | Labeled close; Escape; backdrop click (unless destructive confirm / explicit `closeOnBackdrop={false}`) |
| **Focus** | Trap while open (`useOverlayFocus`); initial focus to first focusable or panel; **return focus** to opener on close |
| **Scroll** | Lock body scroll while open |

### Adoption

| Prefer | Avoid |
| --- | --- |
| Shared Modal / Dialog / Drawer | New `fixed inset-0` one-offs |
| Dialog for confirm / blocking result | `window.alert` / `confirm` for in-app chrome |
| Sheet **variant** of Modal for TemplateCenter-class layouts | Parallel `Sheet.tsx` design system |

### Non-goals (this contract)

No open/close business logic / ModalRegistry redesign; no Firestore; no filter Apply model change; no second form kit; toast redesign optional and separate. Native `alert`/`confirm`/`prompt` sites were soft residuals after Wave 5 — **cleared in Wave 10 Agent 4** via Toast + `InteractionDialog`. Wave 5 close-out: [`directives/wave5-complete.md`](directives/wave5-complete.md).

---

## 4. Spacing

**8pt rhythm.** Prefer multiples of 8px (or 4px half-steps when dense).

| Utility | Value | Use |
| --- | --- | --- |
| `space-widget` | padding 16px | Comfortable widget/body padding |
| `space-widget-compact` | padding 12px | Dense tiles |
| `gap-widget` | gap 12px | Inner stacks / lists |
| `gap-widget-tight` | gap 8px | Compact stacks |

**Gap rules**

- Dashboard grid: `gap-3` (12px) between tiles — keep open canvas.
- Inside widget bodies: prefer `gap-widget` / `gap-widget-tight` over ad-hoc `gap-*` soup.
- Section strips and cards: consistent horizontal padding with headers (`px-4`/`px-5` widget; `px-6` page cards).

**Padding rules**

- Chrome (header/sidebar) stays compact (`h-14` primary bars).
- Content areas get breathing room; do not pad chrome to “feel premium.”

---

## 5. Widget Contract

```
Widget
  Header  — Lucide icon + title + optional actions
  Body    — primary content, then supporting metrics
  Footer  — optional metadata / single CTA (omit if unused)
```

| Concern | Rule |
| --- | --- |
| **Header** | `WidgetHeader` (densities `compact` \| `comfortable`). Grid owns shell + header; widget bodies do **not** duplicate titles. |
| **Body** | Primary job first (ring, list, funnel). Use `gap-widget*`, `type-*`, theme tokens. |
| **Footer** | Optional; prefer omit over decorative chrome. |
| **Empty** | `EmptyState variant="compact"` (+ `preset` / `hideIcon` in dense tiles). No one-off italic gray empties. |
| **Loading** | Functional only; no ornamental pulse on idle chrome. Prefer skeleton/quiet placeholder over decorative animation. |
| **Actions** | In header only when they clarify the widget job. Section-level actions (Customize) live on the section strip. |

### Outside-in adoption order

1. Shell (canvas / sidebar / page frame)  
2. Header  
3. Layout (grid / section strips)  
4. Typography  
5. Colors / tokens  
6. Content spacing  
7. Then widget interiors  

### Primitive-first rule

Before inventing local chrome, use: `Card` / `.card-premium` / `.widget-shell`, `WidgetHeader`, `EmptyState`, `CircularProgressRing`, `DataTable`, `FilterSearchInput`, `FilterPanelShell`, `LeadFilterFieldControl`, `LeadListFilterChips`, `type-*`, `space-*` / `gap-*`, `shadow-elevation-*`, `rounded-theme`.

---

## 6. KPI Contract

| Tier | Widgets (examples) | Visual weight |
| --- | --- | --- |
| **Tier 1** | Calls Today, Bookings Today, Team Goals | Largest rings / `type-kpi`; personal targets outrank team dual-inline rings |
| **Tier 2** | Leaderboard, Pipeline, Telecaller Metrics, Call Logs, Tasks | Full body chrome; scannable lists/bars; no competing celebration |
| **Tier 3** | Coaching Tip, Leave, Events, Roster | Quieter headers; must not overpower Tier 1 |

### Visualization rules (meaning-driven)

- **Ring (`CircularProgressRing`)** — %-to-goal only (value/max). Default stroke `text-theme-accent`. No nested gray card.
- **Large number** — absolute volume without a target (if introduced later).
- **Progress bar / funnel bar** — stage or share of whole; label meaning clearly (e.g. cumulative “Reached Contacted+”).
- **Delta / status text** — “Target met” / “N to go” with success/muted tokens — not persistent 🎉.
- Do not add decorative charts that do not answer a work question.

---

## 7. Typography Scale

| Level | Utility / pattern | Weight rule |
| --- | --- | --- |
| **Page** | `type-page-title` | Bold (700) — page/workspace titles only |
| **Section** | `type-section-title` | Semibold (600) — section strips |
| **Card / widget** | `type-card-title` | Semibold (600) — widget titles |
| **Body** | default `text-theme-text` | Regular; readable controls ≥ `text-[11px]` in dense tiles |
| **Caption / label** | `type-label`, `type-secondary` | Regular muted — labels, timestamps, helper copy |
| **KPI numeral** | `type-kpi` | Bold (700) + tabular nums — numbers that matter |

**Weight rules:** Bold is for importance, not default. Prefer `type-*` / `font-semibold` / `font-bold` over `font-black` / `font-extrabold`. EmptyState (default + compact) uses `font-semibold`.

`type-*` encodes **weight/color**; consumers still choose size (`text-xs` / `text-sm` / etc.).

---

## 8. Elevation

One shadow language:

| Class | Token | Use |
| --- | --- | --- |
| `shadow-elevation-sm` | `--elevation-sm` | Default cards / widgets |
| `shadow-elevation-md` | `--elevation-md` (= branding `--box-shadow`) | Raised / hover emphasis |

Dark mode slightly deepens `--elevation-sm`. Widget style variants (`standard` / `raised` / `frosted` / `borderless`) are light forks of the **same** shell — not alternate design systems. Canonical look = **standard**.

---

## 9. Motion

| Allowed | Forbidden in persistent chrome |
| --- | --- |
| Mount transitions that communicate state (e.g. ring stroke ease-in) | Decorative `animate-pulse` on titles/icons |
| Sheet/modal enter (`animate-sheetSlideUp`, `animate-scaleUp`) | Hover translate / lift theater on every tile |
| Short color/border transitions | Looping sparkles, gamified bounce |

**Functional only.** Prefer solid status dots over pulsing live indicators unless pulse uniquely aids recognition.

---

## 10. Emoji Policy

| Context | Policy |
| --- | --- |
| **Persistent UI** (headers, widget bodies, ranks, status, shifts, category chips) | ❌ No emoji — use Lucide, numeric ranks, status dots + text |
| **Transient achievements** (toasts, one-shot celebrations) | ✅ Optional emoji OK |

Examples of Wave 1 fixes: streak = number + “Streak”; leaderboard = `1`/`2`/`3`; shifts = AM/PM/NT/Off; target met = color + text.

---

## 11. Chart Selection Guide

| Visualization | When to use |
| --- | --- |
| **Ring** | Progress toward a numeric goal (Calls/Bookings/Team Goals). |
| **Bar (horizontal)** | Stage mix / funnel share; keep labels meaning-clear (cumulative vs exclusive). |
| **Line** | Trend over time (reports later) — not required on Agent dashboard tiles. |
| **Sparkline** | Dense inline trend only when it answers a scan question; do not decorate. |
| **Progress (linear)** | Simple completion within a list row or badge panel. |
| **Delta** | Change vs target/yesterday — text or small signed number with success/danger color. |

Wave 1 Agent dashboard: rings + funnel bars + numeric lists. Do not introduce chart libraries for novelty.

---

## 12. Accessibility

| Area | Rule |
| --- | --- |
| **Contrast** | Prefer `text-theme-text` / `text-theme-muted` over pure black/white; ensure muted text stays readable on card/surface. |
| **Keyboard** | Preserve focus order; do not trap focus in decorative chrome. Modals/menus must remain keyboard operable. |
| **Focus** | Visible focus rings via theme ring tokens; do not remove outline without a replacement. |
| **Targets** | Interactive controls ≥ **44px** touch target on mobile (`py-2.5 px-4` preferred over fixed short heights). |
| **Semantics** | Rings: SVG `aria-hidden` with visible text labels. Status: color **and** text (not color alone). |
| **Light + dark** | All `bg-*` / `text-*` / `border-*` additions support both modes or use semantic `theme-*`. |

---

## 13. Future Screens

Lead pages, Admin, Reports, Forms, and Tables should **adopt this language** — not invent new card radii, emoji chrome, or indigo islands.

### Suggested adoption order (post Wave 5)

1. **DataTable** — **Done (v1.1).** Shared primitive + consumer adoption. See §3a–3c; [`directives/wave2-complete.md`](directives/wave2-complete.md).  
2. **Filters** — **Done (v1.2).** Command Surface / Filter Contract §3d; primitives + Leads/Admin adoption. See [`directives/wave3-complete.md`](directives/wave3-complete.md).  
3. **Forms** — **Done (v1.3).** Form Contract §3e; primitives + Leads/Admin/Login/modal consumer adoption + Phase 4 polish. See [`directives/wave4-complete.md`](directives/wave4-complete.md).  
4. **Modals & Drawers** — **Done (v1.4).** Modal/Drawer Contract §3f; focus trap; sheet variant; Dialog / Drawer consumer adoption. See [`directives/wave5-complete.md`](directives/wave5-complete.md).  
5. **Lead detail** (already partially aligned — extend, don’t rewrite language)  
6. **Admin** non-table chrome (team cards, settings panels) — residual cleanup  
7. **Reports**  
8. **Settings**

Waves 2–5 are **closed**. **v1.4 is production-canonical** for dashboard + tables + filters + forms + overlays. Keep business logic and IA stable unless separately scoped.

---

## 14. Regression Checklist

Every presentation change after Wave 1 must preserve:

- [ ] Widget customization  
- [ ] Widget ordering  
- [ ] Resize behavior (`widget.h` / customizer contract)  
- [ ] Theme switching (appearance)  
- [ ] Branding customization  
- [ ] Dark mode  
- [ ] Responsive layouts  
- [ ] Accessibility  
- [ ] Keyboard navigation  
- [ ] Existing animations that communicate state  

Visual screenshot baseline: [`directives/wave1-visual-baseline.md`](directives/wave1-visual-baseline.md).

---

## 15. Do Not Change (Wave 1 fence — still stands for polish)

Hard scope fence — different from “Keep.” Do not redesign or expand into:

- Widget architecture (IDs, visibility model, preference store shape)  
- Grid system / `getWidgetColSpan` contract  
- Customizer workflow (long-press, dashed ring, open/close)  
- Dashboard routing  
- KPI data sources / scoring formulas  
- Attendance logic  
- Admin surfaces, DataTable/filters/forms redesign (Wave 2)  
- Theme engine rewrite / new token architecture  
- Maps / Training HQ redesign  
- Gamification **logic** / font family replacement  

---

## 16. Wave 1.5 — Stabilization (done July 13, 2026)

Stabilization pass completed before Wave 2. Report: [`directives/wave1.5-report.md`](directives/wave1.5-report.md).

Remaining non-blocking residuals (out of Agent-widget scope or deferred):
- Fold dual-row attendance into primary header on `lg+`
- Sidebar gold inset → secondary token / sidebar P3 redesign
- Agent Profile / Training HQ / Project Maps indigo–gray islands (Wave 2 adjacent tabs)
- Manual PNG capture of visual baseline (checklist ready; shots pending)

**Focus rings (Wave 1.5 imprint):** Interactive chrome should use `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring` (do not remove outlines without a visible replacement). Shared `DataTable` sort controls, search, and checkboxes follow the same imprint.

Wave 2 **approved complete** (2026-07-13): shared DataTable + Leads/Admin consumer adoption formalized as **DLS v1.1** (§3a–3c). Wave 3 **validated complete** (2026-07-13): Filter / Command Surface Contract formalized as **DLS v1.2** (§3d). Wave 4 **validated complete** (2026-07-13): Form Contract formalized as **DLS v1.3** (§3e). Wave 5 **validated complete** (2026-07-13): Modal/Drawer Contract formalized as **DLS v1.4** (§3f). Soft residuals (MANUAL QA keyboard/SR/theme, team cards) deferred to later waves or operational follow-up; native alert/confirm cleared in Wave 10 Agent 4.

---

## Brand shell quick reference

| Property | Correct class / token |
| --- | --- |
| Theme system | Tailwind v4 `@import "tailwindcss"`; tokens in `index.css` |
| Page canvas | `app-canvas` |
| Sidebar | `sidebar-brand-rail` |
| Header strip | `header-brand-strip` |
| Card | `Card` / `card-premium` / `widget-shell` + `rounded-theme` |
| Button primary | `btn-premium-primary` or `bg-theme-accent` / brand gradient |
| Button secondary | `btn-premium-secondary` |
| Type scale | `type-page-title` … `type-kpi` |
| Elevation | `shadow-elevation-sm` \| `md` |
| Empty (compact) | `EmptyState variant="compact"` |

---

# Imprinted patterns (historical + still accurate)

*Consolidate useful imprint. Stale indigo/gray Admin & Leads list patterns are **superseded by Wave 1 language** above — migrate when those surfaces enter Wave 2.*

## Pattern Notes (active)

### 1. Modal sheet pattern

- Full-overlay modals share slide-up on mobile and fade/scale on desktop.
- Container:
  `className="bg-theme-card shadow-2xl w-full md:max-w-2xl overflow-hidden border-t md:border border-theme-border flex flex-col rounded-t-3xl md:rounded-3xl animate-sheetSlideUp md:animate-scaleUp"`
- Mobile drag handle:
  `<div className="md:hidden w-12 h-1 bg-theme-border rounded-full mx-auto my-3 flex-shrink-0" />`
- Prefer `rounded-theme` for menus where Wave 2 touches modals; sheet top radius may stay larger for gesture affordance.

### 2. Form buttons & touch targets

- Prefer padding (`py-2.5 px-4` or `py-2 px-3`) over fixed heights.
- Mobile interactive targets ≥ 44px.

### 3. Typography & accessibility

- Prefer `text-theme-text` / `text-theme-muted`.
- Forbidden typos like `text-slate-455`.
- All new `bg-*` / `text-*` / `border-*` support light + dark (or semantic tokens).

### 4. Shell

- App root: `app-canvas text-theme-text` (`ModalHost.tsx`).
- Desktop sidebar: `sidebar-brand-rail` with light text overrides (independent of appearance mode).
- Control Panel headers: `PageHeader` + `header-brand-strip`.

### 5. Lead Details Workspace (partially aligned)

- Page: `LeadDetailsPage.tsx` + `LeadPipelineTracker.tsx`
- Canvas: `app-canvas`; sticky header `h-14` + `header-brand-strip`
- Pipeline: equal-width stage grid; active = `bg-brand-gradient`; completed = `bg-theme-accent-muted`; no emoji stage labels
- Body grid: `xl:grid-cols-3`, `gap-5`, `min-w-0`
- Segmented tabs: inactive = theme surface; active = `bg-brand-gradient text-white`
- Cards: `card-premium`; accents via `text-theme-accent` / gold — avoid hard indigo/purple

---

## Desktop Sidebar Navigation (active)

Files: `DesktopSidebar.tsx`, `SidebarNavigationMenu.tsx`, `sidebar/sidebarNavStyles.ts`  
Last updated: July 10, 2026 (Wave 1: intentional P3 skip — keep as-is)

| Property | Class / Token |
| --- | --- |
| Width | `w-[248px]` expanded / `w-[72px]` collapsed |
| Item text | `text-[13px] font-medium` (active: `font-semibold`) |
| Sub-item text | `text-[12px] font-medium` |
| Category label | `text-[10px] font-bold uppercase tracking-[0.14em]` with `pt-5 pb-2` |
| Active item | `bg-theme-accent-muted text-theme-accent` + inset left accent bar |
| Icons | `w-4 h-4` primary / `w-3.5 h-3.5` nested — `navIconColor` / `sidebarIcon(tone)` |
| Subtree | `ml-3.5 pl-2.5 border-l border-theme-border/70` |

**Pattern notes:**

- Reuse helpers in `sidebarNavStyles.ts`.
- Collapsible groups must use `sidebarGroupRow` + `sidebarGroupLink` + `sidebarGroupToggle`.
- Every sub-item includes a color-coded icon via `sidebarSubIcon`.
- Profile nav uses `UserRound` (not clock).
- Feature-tinted icons aid wayfinding — do not flatten to monochrome without evidence.

---

## Wave 1 Phase 2 — Shared Primitives (July 13, 2026)

| Property | Class / Token |
| --- | --- |
| Radius SSoT | `--radius` (default **12**) |
| Card | `Card` → `rounded-theme` + `shadow-elevation-sm` |
| Premium card | `.card-premium` → `var(--radius)` |
| Widget shell | `.widget-shell` + `shadow-elevation-sm` |
| Widget header | `WidgetHeader` — `compact` / `comfortable` |
| Typography | `type-*` utilities |
| Spacing | `space-widget*` / `gap-widget*` |
| Empty compact | `EmptyState variant="compact"` + presets |
| KPI rings | `CircularProgressRing` — %-to-goal; `text-theme-accent` |

See Phase 2 validation: [`directives/wave1-phase2-validation.md`](directives/wave1-phase2-validation.md).

---

## Wave 1 Phase 3 — Agent Dashboard Widget Adoption (July 13, 2026)

**Scope:** Agent CRM dashboard widget interiors + `DashboardHeader` quiet chrome. Presentation only.

| Pattern | Rule |
| --- | --- |
| Shell ownership | `WidgetGrid` owns `widget-shell` + `WidgetHeader` |
| Body spacing | `gap-widget` / `gap-widget-tight` |
| Typography | Tier 1 via larger ring + `type-kpi` / `type-label` |
| Rings | %-to-goal only |
| Empties | Compact `EmptyState` (+ `hideIcon` when dense) |
| Rank / status | Numeric ranks; status dots + text |
| Pipeline bars | `theme-accent` → muted → `theme-warning` → `theme-success` |
| Tokens | `theme-*` / `rounded-theme` on touched widgets |
| Motion | No ornamental pulse in persistent chrome |
| Header | Compact `h-14`; static Lucide title icon; streak number + label |

Full changelog: [`directives/wave1-phase3-notes.md`](directives/wave1-phase3-notes.md).

---

## Superseded imprint (do not copy for new UI)

*Kept for archaeology / Wave 2 migration reference. Prefer §1–13 language instead.*

### Company Overview Dashboard Widgets (Admin) — SUPERSEDED

File: `AdminDashboard.jsx` (June 20, 2026)

Legacy pattern used `bg-white` / `slate` / **`indigo-500` accents**, `rounded-xl`, `shadow-sm`, hover scale on funnel elements.  
**Wave 2 Admin** should adopt Card Contract + theme tokens from this DLS — do not extend indigo islands.

### Leads Workspace List — SUPERSEDED (chrome)

File: `LeadsWorkspace.jsx` (June 26, 2026)

Legacy pattern used gray surfaces and **indigo** detail links / Log Call outlines.  
**Wave 2 DataTable / Filters** should replace indigo link chrome with `text-theme-accent` and theme borders while preserving interaction model (row checkboxes, stage controls independent of name links).
