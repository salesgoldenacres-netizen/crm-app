# Wave 3 — Filter Ecosystem UI/UX Audit

**Scope:** Filter / search / preset / chip chrome across daily Leads workspace and Admin table filter surfaces. Treat the **canonical Leads filter stack** (`LeadListDesktopFilterRow` + field control + mobile sheet + chips + preset strip) and **Admin advanced panel + search + chips** as the ecosystem. Shared `DataTable` toolbar search is adjacent (already on DLS v1.1).  
**Out of scope (this phase):** UI implementation / redesign, filter algorithm changes, query building, Firestore queries, Forms/Modals waves, inventing screenshot PNGs, DLS **v1.2** bump.  
**Constraint:** Presentation-only recommendations later; adopt DLS **v1.1** tokens (`theme-*`, `rounded-theme`, `type-*`, `EmptyState`, motion + emoji policies, Table contracts where filters sit near tables). No new token architecture.  
**Density target:** ~70% Linear/Stripe content density + ~30% Salesforce-like chrome (aligned with Waves 1–2).  
**Guiding question:** Would a first-time user understand this faster than before? If no, do not change it.  
**Governed by:** [`ui-registry.md`](../ui-registry.md) Design Language **v1.1** (Wave 2 approved complete).

**Sources reviewed:** `ui-registry.md` (v1.1), `LeadListDesktopFilterRow.tsx`, `LeadFilterFieldControl.tsx`, `LeadListMobileFilterSheet.tsx`, `LeadListFilterChips.tsx`, `LeadListPresetStrip.tsx`, `LeadsWorkspace.tsx`, `leadListFilterConfig.ts`, `useLeadListFilters.ts`, `LeadsFilterPanel.tsx`, `AdvancedFiltersPanel.tsx`, `LeadsFilters.tsx`, `QuickAccessStatusTabs.tsx`, `AdminLeadsTab.tsx` (search + chips + panel mount), `DataTable.tsx` (toolbar search), `leadBinFilterConfig.ts` / `LeadBinWorkspace.tsx` (adjacent bin filters), `EmptyState.tsx`.

---

## Executive Summary

Leads daily filtering has already been **engineered into a coherent model** (draft → Search → applied; column-aligned desktop row; shared field config; mobile sheet; chips; built-in work-queue presets). That IA is a **Keep** — Wave 3 should modernize chrome, not invent a second filter system.

The debt is **visual and structural inconsistency**:

1. **Canonical Leads path** is mostly on `theme-*` but still uses `rounded-xl` / `font-black` / custom empty (not `EmptyState`), dense `text-[9px]`–`[10px]` labels, and `rounded-full` chips vs DLS radius.
2. **Admin Leads** still mounts a **parallel** advanced panel (`LeadsFilterPanel`) with gray/indigo islands, plus a separate search bar and ad-hoc chip strip — not the shared field control or chip component.
3. **Legacy siblings** (`LeadsFilters`, `AdvancedFiltersPanel`, `QuickAccessStatusTabs`) remain in the package with **emoji + slate/indigo** chrome; they are not on the current `LeadsWorkspace` mount path but confuse future adoption and violate Emoji Policy if remounted.
4. **DataTable toolbar search** is already DLS-aligned (Wave 2) — use it as the reference for Admin/shared search chrome; do not regress algorithms.

**Overall readiness: Medium-High** — strong filter engine + clear primitives to extract; presentation debt concentrated in Admin panel + legacy emoji surfaces + token/radius/EmptyState alignment. **No filter logic changes required for a successful Wave 3.**

---

## Design Debt Scoreboard

| Area | Design Debt | Priority | Rationale |
| --- | --- | --- | --- |
| Leads desktop filter row / sticky filters | **Low–Medium** | **P2** | Theme shell OK; density/radius/button chrome vs DLS; sticky behavior Keep |
| Advanced filters panel (Admin + legacy) | **High** | **P1** | Gray/indigo island; duplicate of Leads field set; not shared control |
| Mobile filter sheet | **Medium** | **P1** | Theme OK; `font-black`, `rounded-t-2xl`/`rounded-xl`, a11y on close |
| Search bars (Leads + DataTable toolbar) | **Medium** | **P1** | DataTable OK; Admin duplicate search chrome; legacy `LeadsFilters` gray/emoji |
| Filter chips / active filter summary | **Medium** | **P1** | Leads chips theme OK but `rounded-full`; Admin chips one-off |
| Quick tabs / status shortcuts | **High** | **P1** | `QuickAccessStatusTabs` emoji + rainbow borders (Wave 2 residual); presets strip cleaner |
| Admin table search/filter chrome | **High** | **P1** | Panel + search + chips not on shared primitives; count badge `rounded-full` |
| Saved presets | **Low** | **P2** | Built-in queues only (no user-saved store); strip mostly clean |
| Token / typography / radius / EmptyState vs DLS v1.1 | **High** | **P1** | `rounded-xl`, `font-black`, custom empty, gray borders in Admin panel |
| Accessibility (labels, focus, keyboard) | **Medium** | **P1** | Field `aria-label` OK; sheet close/search inputs missing labels; focus-visible uneven |

---

## Audit by Area

### 1. Leads desktop filter row / sticky filters

**Files:** `LeadListDesktopFilterRow.tsx` (inside `LeadsDesktopTable` sticky thead), `LeadFilterFieldControl.tsx`, config `leadListFilterConfig.ts`  
**Mount:** `LeadsWorkspace` → `LeadsDesktopTable`

#### Keep

- Column-aligned filter row under sticky headers — Excel-like productivity; Wave 2 validated sticky + filter placement must stay identical.
- Draft vs apply (`onSearch` / Enter) — prevents thrashing live queries; do not collapse into live-type-filter without product ask.
- Shared `LEAD_FILTER_FIELDS` + `LeadFilterFieldControl` for desktop and mobile.
- Filled-field accent wash (`border-theme-accent/50 bg-theme-accent/10`) — clear “this column is filtering.”
- Compact vs normal column visibility rules (`normalViewOnly`, `skipInCompact`, role hides).
- Search + Reset affordances with Lucide; Reset disabled when empty.

#### Problems

**P2 — Radius / type weight vs DLS**

- **Current issue:** Search button uses `rounded` (not `rounded-theme`); title weight elsewhere in workspace is `font-black`; dense `text-[10px]` without `type-label`.
- **Why it hurts enterprise UX:** Table body is v1.1; filter row still feels one generation older.
- **Recommendation:** `rounded-theme` on Search/Reset; prefer `font-semibold` / `type-label` for chrome labels; keep `h-6` dense height.
- **Why — expected user benefit:** One language from header → filter → row.

**P2 — Dense date-range readability**

- **Current issue:** Follow-up/created range uses `text-[9px]` dual date inputs in a 6px-tall shell.
- **Why it hurts enterprise UX:** First-time users may miss that two dates exist; tiny hit targets.
- **Recommendation:** Presentation only — slightly clearer “From–To” affordance / `min-w` / focus ring; do not change date semantics.
- **Why — expected user benefit:** Faster correct date filtering without training.

#### Design Debt: Low–Medium | Priority: P2

---

### 2. Advanced filters panel

**Live Admin mount:** `LeadsFilterPanel.tsx` via `AdminLeadsTab.tsx`  
**Sibling (exported, not on LeadsWorkspace path):** `AdvancedFiltersPanel.tsx`  
**Legacy toolbar (exported, unused on workspace):** `LeadsFilters.tsx` (opens advanced toggle pattern)

#### Keep

- Admin needs a panel for multi-field filters beside free-text search — valid IA for managers.
- Clear All affordance.
- Field set roughly mirrors list concerns (status, source, dates, assignee) — do not invent new fields in Wave 3.

#### Problems

**P1 — Pre-DLS / gray–indigo island (`LeadsFilterPanel`)**

- **Current issue:** Borders `border-gray-300` / `dark:bg-gray-700`; header `border-gray-100`; icon `text-indigo-500`; Clear All `text-gray-550`; shell `rounded-xl` not `rounded-theme`.
- **Why it hurts enterprise UX:** Admin tables are v1.1; opening Filters drops into Wave-0 chrome.
- **Recommendation:** Remap to `bg-theme-card` / `border-theme-border` / `bg-theme-surface` inputs / `text-theme-danger` Clear / Lucide accent (not indigo) / `rounded-theme`.
- **Why — expected user benefit:** Same CRM when filtering as when scanning the table.

**P1 — Duplicate control recipes vs `LeadFilterFieldControl`**

- **Current issue:** Hand-rolled inputs/selects; `AdvancedFiltersPanel` is a near-duplicate with slightly different options and tokens.
- **Why it hurts enterprise UX:** Two visual languages for the same job; maintenance drift (already diverged option lists).
- **Recommendation:** Phase 2 shared FilterField primitive (or reuse `LeadFilterFieldControl` patterns) for Admin panel presentation; **do not** merge Admin `AdvancedFilters` state model into `LeadListFilters` unless product asks (logic fence).
- **Why — expected user benefit:** Predictable controls; less “which filter UI am I in?”

**P2 — Dead / parallel `AdvancedFiltersPanel`**

- **Current issue:** Exported sibling with `dark:bg-gray-900` / `text-red-600` Clear; not mounted by Admin (Admin uses `LeadsFilterPanel`).
- **Recommendation:** Prefer one panel implementation in Phase 3 adoption; retire or re-export alias after presentation unify — **no behavior change**.
- **Why — expected user benefit:** One advanced panel look.

#### Design Debt: High | Priority: P1

---

### 3. Mobile filter sheet

**File:** `LeadListMobileFilterSheet.tsx`  
**Mount:** `LeadsWorkspace` (`md:hidden` Filters button)

#### Keep

- Bottom sheet + overlay (`bg-theme-overlay`, `animate-sheetSlideUp`) — good mobile pattern; gesture affordance for top radius may stay larger than `--radius` (DLS note on sheets).
- Reuses `LeadFilterFieldControl` + same field config.
- Sticky footer Reset / Search; Search applies + closes.
- Active count in subtitle.

#### Problems

**P1 — Typography / radius vs DLS**

- **Current issue:** Title `font-black`; labels `text-[9px] font-bold uppercase`; footer buttons `rounded-xl`; close control lacks `aria-label`.
- **Why it hurts enterprise UX:** Feels heavier/noisier than v1.1 tables; a11y gap on dismiss.
- **Recommendation:** `font-semibold` / `type-label`; `rounded-theme` on actions; `aria-label="Close filters"` on X; keep sheet motion.
- **Why — expected user benefit:** Calmer mobile filter pass; screen-reader safe dismiss.

**P2 — Overlay click-to-close without keyboard escape documentation**

- **Current issue:** Backdrop click closes; Escape not obviously wired.
- **Recommendation:** Add Escape-to-close in Phase 3 if cheap (presentation/a11y); do not change filter apply semantics.
- **Why — expected user benefit:** Keyboard parity with desktop Search/Reset.

#### Design Debt: Medium | Priority: P1

---

### 4. Search bars (Leads + shared DataTable toolbar)

**Files:** `DataTable.tsx` toolbar; `AdminLeadsTab.tsx` dedicated search card; legacy `LeadsFilters.tsx`  
**Note:** Canonical agent Leads list uses **column filters + presets**, not a global search bar in `LeadsWorkspace`.

#### Keep

- DataTable search: Lucide `Search`, `theme-*`, `rounded-theme`, focus ring imprint, page reset on type — **Wave 2 reference implementation**.
- Admin free-text search beside advanced filters — complementary to structured filters; keep both behaviors.
- Leads draft-field Enter → Search — keep apply model.

#### Problems

**P1 — Admin search is a second recipe**

- **Current issue:** Full-width card (`p-4 rounded-theme` — good) but separate from DataTable `enableSearch`; placeholder very long; no shared `FilterSearchInput` primitive.
- **Why it hurts enterprise UX:** Inconsistent height/icon/focus vs DataTable toolbar elsewhere in Admin.
- **Recommendation:** Extract shared search input chrome (presentation) matching DataTable toolbar; Admin may keep external query wiring.
- **Why — expected user benefit:** One search look across Admin tabs.

**P2 — Legacy `LeadsFilters` search (if remounted)**

- **Current issue:** `bg-gray-55`, `text-gray-400` icon, emoji grouping/view options (`🗂️` / `🔥` / `📋` / `⚡`), indigo active Advanced button.
- **Recommendation:** Do not remount as-is; if grouping/density chrome returns to command bar, use Lucide + plain labels (preset strip / density toggle in workspace already quieter).
- **Why — expected user benefit:** Avoid reintroducing Wave-0 emoji chrome next to v1.1 tables.

**P2 — DataTable search a11y**

- **Current issue:** Toolbar search input lacks explicit `aria-label` (relies on placeholder).
- **Recommendation:** `aria-label={searchPlaceholder}` or “Search table.”
- **Why — expected user benefit:** Consistent with Leads field controls.

#### Design Debt: Medium | Priority: P1

---

### 5. Filter chips / active filter summary

**Canonical:** `LeadListFilterChips.tsx` + `buildLeadFilterChips` in `leadListFilterConfig.ts`  
**Admin:** Inline chip map in `AdminLeadsTab.tsx`

#### Keep

- Applied-filter chips with per-chip clear + Clear All — excellent progressive disclosure.
- Result count adjacent to chips on Leads.
- Chip labels humanized (`Status: …`, `Queue: Overdue Follow-ups`).
- Admin chips removable per key — good; align styling only.

#### Problems

**P1 — Two chip implementations**

- **Current issue:** Leads uses shared component (`rounded-full`, accent-muted); Admin hand-rolls spans + `XCircle` with `rounded-theme`.
- **Why it hurts enterprise UX:** Same concept, different shape language vs Badge/DLS radius guidance.
- **Recommendation:** Shared `FilterChip` / reuse `LeadListFilterChips` presentation patterns; prefer `rounded-theme` (or documented chip radius) over `rounded-full` pills unless interaction requires pill; Lucide `X` consistently.
- **Why — expected user benefit:** Instant recognition of “active filter” anywhere.

**P2 — Chip vs Badge contract**

- **Current issue:** Filter chips are not `Badge`; row status uses `Badge` (Wave 2).
- **Recommendation:** Document Filter chips as a distinct Filter Contract element (removable), not status Badge — avoid forcing Badge API if remove affordance suffers.
- **Why — expected user benefit:** Status ≠ active filter; both stay scannable.

#### Design Debt: Medium | Priority: P1

---

### 6. Quick tabs / status shortcuts (emoji residuals from Wave 2)

**Live:** `LeadListPresetStrip.tsx` + `LEAD_LIST_PRESETS` in `LeadsWorkspace`  
**Legacy residual:** `QuickAccessStatusTabs.tsx` (exported; emoji-heavy status rail)

#### Keep

- Built-in work queues: All / My / Today’s Follow-ups / Overdue / Hot / Booked — high daily value; plain text labels already (no emoji).
- `role="tablist"` / `aria-selected` on preset strip.
- `Custom` dashed indicator when filters diverge from presets.
- Applying preset writes draft + applied together — Keep semantics.

#### Problems

**P1 — `QuickAccessStatusTabs` Emoji Policy violation (if still shipped or remounted)**

- **Current issue:** Persistent labels like `Raw Inbox 📥`, `Hot 🔥`, `Overdue ⚠️`, `Booked & Reserved ✅`, plus rainbow border colors and indigo active washes; scroll fades use `from-slate-50`.
- **Why it hurts enterprise UX:** Same debt Wave 2 removed from table groups; first-time scan is emoji/color noise vs Lucide + count.
- **Recommendation:** If this component remains in product paths, quiet to plain labels + Lucide + theme tokens (mirror preset strip). If unused, mark deprecate / do not remount without DLS pass.
- **Why — expected user benefit:** Queue scan in &lt;1s without emoji decoding.

**P2 — Preset strip vs command-bar density**

- **Current issue:** Strip uses `rounded-lg` / `rounded-md` / `font-bold`; workspace title `font-black`.
- **Recommendation:** Light token pass (`rounded-theme` where appropriate, `font-semibold`); do not change preset IDs or `build()` logic.
- **Why — expected user benefit:** Quieter command bar matching table chrome.

#### Design Debt: High (legacy tabs) / Low (live presets) | Priority: P1

---

### 7. Admin table search/filter chrome

**File:** `AdminLeadsTab.tsx` (Filters toggle, `LeadsFilterPanel`, search card, active chips, then `DataTable` without `enableSearch`)

#### Keep

- Filters button with active count badge — clear discoverability.
- Separation of structured filters vs text search vs table selection — understandable IA.
- Wave 2 already themed the Filters toggle active state and chip colors partially.

#### Problems

**P1 — Stacked chrome without shared primitives**

- **Current issue:** Toggle → gray panel → analytics blocks → search card → chips → DataTable. Visual rhythm is card-heavy; panel tokens lag search card.
- **Recommendation:** Tokenize panel to match search card / DataTable; optional vertical spacing quieting only (no IA reorder unless first-time-user test fails).
- **Why — expected user benefit:** Filter → results feel one surface.

**P2 — Count badge `rounded-full` + `text-white`**

- **Current issue:** Active filter count on toggle uses pill + white on accent.
- **Recommendation:** Align with Badge / theme accent-fg patterns from DLS.
- **Why — expected user benefit:** Consistent emphasis language.

**P3 — Other Admin tabs**

- **Current issue:** Users/Projects etc. rely on DataTable `enableSearch` (good). Admin Leads is the outlier with custom search + panel.
- **Recommendation:** Don’t force every Admin tab into advanced panels; Leads-specific is OK if chrome matches.

#### Design Debt: High | Priority: P1

---

### 8. Saved presets (if any)

**Finding:** **No user-persisted saved-filter store** in scope. Presets are **code-defined** `LEAD_LIST_PRESETS` (`all` | `mine` | `today` | `overdue` | `hot` | `booked`) matched via `matchLeadListPreset`. Branding “presets” elsewhere are theme presets — unrelated.

#### Keep

- Code presets + Custom sentinel — sufficient for Wave 3; do not build save/load UX unless product asks.
- `queueMode: "overdue"` special case documented in config — presentation may chip it; logic stays.

#### Problems

**P2 — No “save current filters” UI**

- **Current issue:** Power users cannot persist custom combinations.
- **Recommendation:** **Out of Wave 3** unless explicitly requested (would touch data model). Document as non-goal; only polish built-in strip chrome.
- **Why — expected user benefit:** Avoid scope creep; queues already cover common work.

#### Design Debt: Low | Priority: P2

---

### 9. Token / typography / radius / EmptyState alignment with DLS v1.1

#### Keep

- Canonical Leads filter controls already use `theme-card` / `theme-border` / `theme-ring` / accent filled state.
- Admin search card already on `rounded-theme` + elevation.
- DataTable empty uses `EmptyState` (Wave 2).

#### Problems

**P1 — Leads empty-after-filter is custom**

- **Current issue:** `LeadsWorkspace` empty block uses Lucide `UserCheck` + `font-semibold` copy — good content, not `EmptyState variant="compact"`.
- **Recommendation:** Swap presentation to shared `EmptyState` + Reset action; keep copy meaning.
- **Why — expected user benefit:** Same empty language as tables.

**P1 — Radius drift**

- **Current issue:** Filter ecosystem mixes `rounded`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-full`, `rounded-t-2xl`.
- **Recommendation:** Prefer `rounded-theme` for controls/panels; allow larger sheet top radius; avoid new pill defaults for chips.
- **Why — expected user benefit:** Matches Card/DataTable contracts.

**P2 — Type scale**

- **Current issue:** Widespread `font-black` / `font-bold` / raw `text-[9px]`–`[11px]` instead of `type-*`.
- **Recommendation:** Quiet to `font-semibold` + `type-label` where chrome; keep dense filter inputs readable.
- **Why — expected user benefit:** Less shouty command bar.

#### Design Debt: High | Priority: P1

---

### 10. Accessibility (labels, focus, keyboard)

#### Keep

- `LeadFilterFieldControl` sets `aria-label` from field label (including date from/to).
- Desktop Search/Reset have `aria-label` / `title`.
- Preset strip tablist semantics.
- Enter-to-Search on text/date fields.

#### Problems

**P1 — Gaps**

- **Current issue:** Mobile sheet close button missing `aria-label`; DataTable/Admin search rely on placeholder; Admin chip remove buttons lack accessible names; focus-visible rings inconsistent on custom buttons (some border-only).
- **Recommendation:** Labels on icon-only controls; `focus-visible:ring-2 focus-visible:ring-theme-ring` per Wave 1.5 imprint; preserve Enter/Search and checkbox keyboard from tables.
- **Why — expected user benefit:** Keyboard and AT users can filter without guessing.

**P2 — Multi-select on mobile/desktop dense**

- **Current issue:** Dense status control collapses multi-select to single `<select>` (by design); non-dense multi uses native multi with Ctrl/Cmd title.
- **Recommendation:** Keep behavior; only clarify presentation/help text if first-time confusion is proven — **do not** change selection model in Wave 3 without product ask.
- **Why — expected user benefit:** Stability over clever redesign.

#### Design Debt: Medium | Priority: P1

---

## Cross-Cutting Findings

1. **Two filter ecosystems, one product** — Agent Leads (`LeadListFilters` + column row) vs Admin (`AdvancedFilters` + panel). Unify **chrome**, not necessarily state models.
2. **Primitive-first still wins** — A shared FilterField + FilterChip + FilterSearchInput + FilterPanelShell would absorb most Admin debt without touching Firestore.
3. **Legacy exports are landmines** — `QuickAccessStatusTabs`, `LeadsFilters`, `AdvancedFiltersPanel` carry emoji/indigo; treat as migrate-or-deprecate in Phase 3, not as design inspiration.
4. **Emoji Policy unfinished at filter edges** — Wave 2 cleared table groups; status-tab residual and legacy grouping selects still violate if live.
5. **Apply-on-Search is a feature** — Do not “improve” into instant-apply without evidence; first-time users benefit from explicit Search on dense column filters.
6. **Lead Bin** (`leadBinFilterConfig` / `LeadBinWorkspace`) mirrors draft/applied model — include in Phase 3 token pass if touched; not a separate product wave.
7. **DLS v1.1 Table contracts apply beside filters** — Sticky filter row must remain; EmptyState/Badge/motion/emoji rules extend to filter chrome.

---

## Recommended Wave 3 phasing

| Phase | Focus | Outcome |
| --- | --- | --- |
| **1** | **Audit (this doc)** | Debt map; Keep vs change; draft Filter Contract |
| **2** | **Shared Filter primitives** | FilterField / FilterChip / FilterSearchInput / FilterPanelShell (or thin wrappers) on DLS v1.1 tokens; focus rings; no logic change |
| **3** | **Adoption** | Leads desktop row + mobile sheet + chips + preset strip chrome; Admin panel + search + chips; quiet/deprecate legacy emoji tabs; EmptyState for filtered-empty |
| **4** | **Validation** | Filter-specific regression checklist + `tsc`; sticky/apply/preset/chip clears unchanged |
| **5** | **DLS v1.2** | Formalize Filter Contract in `ui-registry.md` changelog |

**Outside-in:** shell/tokens → field control → chips/search → Leads adoption → Admin adoption → legacy quiet/deprecate → docs.

---

## Explicit Non-Goals

- No filter UI code changes in Phase 1 (this audit only).
- No DLS **v1.2** bump until Phase 5.
- No redesign of which fields filter, option lists as business rules, or query/Firestore semantics.
- No merge of Leads `LeadListFilters` and Admin `AdvancedFilters` state models unless separately scoped.
- No user-saved filter persistence / new preset backend.
- No Forms / Modals / Lead detail redesign.
- No forcing Leads desktop table onto shared `DataTable`.

---

## Regression Checklist (filter-specific)

- [ ] Draft edit does **not** apply until Search / preset / chip clear / Reset
- [ ] Enter in text/date fields triggers Search (desktop + mobile)
- [ ] Reset clears draft + applied; Search/Reset disabled states correct
- [ ] Preset strip applies correct built-in queues (`mine`, `today`, `overdue`, `hot`, `booked`, `all`)
- [ ] Custom indicator when filters diverge from presets
- [ ] Chip clear updates applied + draft; Clear All resets
- [ ] Desktop sticky header + filter row placement/behavior unchanged
- [ ] Compact vs normal filter column visibility unchanged
- [ ] Role hides (email / source / assigned) unchanged
- [ ] Mobile sheet open/close; Search applies and closes; Reset closes
- [ ] Admin advanced panel open/clear; Admin search string filtering; Admin chip remove
- [ ] DataTable toolbar search + CSV still work on tabs that use them
- [ ] `queueMode: overdue` still chips and filters correctly
- [ ] Theme + dark mode on all filter chrome
- [ ] Keyboard: focus rings visible; icon buttons labeled
- [ ] No regression to grouping / density / dialer / bulk actions adjacent chrome

---

## Don't Improve This / Do Not Change

Hard scope fence — different from Keep:

- Filter **algorithms** / `match*` helpers / Firestore queries
- `LeadListFilters` / `AdvancedFilters` / `LeadBinFilters` **shapes** (unless presentation-only display labels)
- `useLeadListFilters` apply/preset semantics
- Which status/source/priority **options** exist (business config)
- Saved-filter **data models** (none today — do not invent)
- Table sort/page/CSV/selection logic
- Routing, stores, bulk/campaign/WhatsApp flows
- Building a new filter product (facets, query builders, AI filters)

### Implementation guideline — outside-in

1. Shared Filter primitives (tokens, focus, radius)  
2. Field control chrome  
3. Chips + search input  
4. Leads row / sheet / presets / empty  
5. Admin panel + search + chips  
6. Legacy emoji surfaces quiet or deprecate  
7. Docs → DLS v1.2 Filter Contract  

---

## Draft Filter Contract (for later DLS — draft only)

*To be formalized in `ui-registry.md` after Phase 2–5 (expected **v1.2**). Draft for alignment only — not authoritative yet.*

```
Filter ecosystem
  Panel shell   — theme-card / theme-surface; border-theme-border; rounded-theme
  Field         — shared control; filled = accent-muted wash; focus ring-theme-ring
  Search input  — Lucide Search; theme input; rounded-theme; aria-label required
  Chips         — removable active filters; theme accent-muted; not status Badge
  Presets       — plain text work queues; tablist semantics; no emoji
  Mobile sheet  — overlay + sheet motion; footer primary Search; Escape/close labeled
  Empty         — EmptyState compact when filters yield zero rows
  Motion        — color/border transitions; sheet slide OK; no decorative pulse
```

| Concern | Draft rule |
| --- | --- |
| **Surface** | `bg-theme-card` / `bg-theme-surface`, `border-theme-border`, prefer `rounded-theme` |
| **Text** | `text-theme-text` / `text-theme-muted`; `type-label` on field labels; avoid `font-black` |
| **Active field** | Accent border/wash when value present — not indigo/gray |
| **Chips** | Removable summary of **applied** filters; Clear All uses `text-theme-danger` |
| **Presets / tabs** | Lucide optional; **no persistent emoji**; counts as text/`Badge` if needed |
| **Search** | Match DataTable toolbar chrome; do not change search field lists in presentation wave |
| **Apply model** | Preserve draft → Search on Leads column filters |
| **Empty** | `EmptyState variant="compact"` + reset affordance |
| **A11y** | Labels on icon buttons; focus-visible ring; Enter-to-Search preserved |
| **Adjacent tables** | Sticky filter row may stay inside Leads thead; must obey Table + Filter contracts |
| **Non-goals** | Do not change query math, option catalogs, or persistence under this contract |

---

## Appendix — Quick code anchors for Phase 2

| Concern | Anchor |
| --- | --- |
| Desktop filter row | `LeadListDesktopFilterRow.tsx` |
| Shared field control | `LeadFilterFieldControl.tsx` |
| Field + preset + chip config | `leadListFilterConfig.ts` |
| Filter state hook | `useLeadListFilters.ts` |
| Mobile sheet | `LeadListMobileFilterSheet.tsx` |
| Chips | `LeadListFilterChips.tsx` |
| Preset strip | `LeadListPresetStrip.tsx` |
| Command bar mount | `LeadsWorkspace.tsx` |
| Admin panel (live) | `LeadsFilterPanel.tsx` ← `AdminLeadsTab.tsx` |
| Admin search + chips | `AdminLeadsTab.tsx` ~search card / Active Filter Chips |
| DataTable search reference | `DataTable.tsx` toolbar |
| Legacy emoji tabs | `QuickAccessStatusTabs.tsx` |
| Legacy toolbar + emoji selects | `LeadsFilters.tsx` |
| Sibling advanced panel | `AdvancedFiltersPanel.tsx` |
| Lead bin filters | `leadBinFilterConfig.ts`, `LeadBinWorkspace.tsx` |
| Empty primitive | `EmptyState.tsx` |

---

## Phase gate

**Stop after this audit.** User reviews findings before Phase 2 (shared Filter primitives). No filter UI redesign and no DLS v1.2 in Phase 1.
