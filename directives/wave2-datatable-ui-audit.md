# Wave 2 — DataTable Ecosystem UI/UX Audit

**Scope:** Shared `DataTable` primitive + major CRM table consumers (especially daily Leads desktop table, Admin DataTable tabs, Agent leaderboard admin table). Treat **both** `DataTable.tsx` and the primary Leads desktop table (`LeadsDesktopTable` / `LeadsTableRow`) as the “DataTable ecosystem.”  
**Out of scope (this phase):** UI implementation / redesign, filter logic changes, data hooks, business rules, Forms/Modals waves, inventing screenshot PNGs.  
**Constraint:** Presentation-only recommendations later; adopt DLS **v1.0** tokens (`theme-*`, `rounded-theme`, `type-*`, `EmptyState`, motion + emoji policies). No new token architecture.  
**Density target:** ~70% Linear/Stripe content density + ~30% Salesforce-like chrome (aligned with Wave 1).  
**Guiding question:** Would a first-time user understand this faster than before? If no, do not change it.  
**Governed by:** [`ui-registry.md`](../ui-registry.md) Design Language **v1.0** (Wave 1 + Wave 1.5 approved).

**Sources reviewed:** `ui-registry.md` (v1.0), `telecaller-app/src/shared/components/DataTable.tsx`, `LeadsDesktopTable.tsx`, `LeadsTableRow.tsx`, `LeadsMobileGrid.tsx`, `SegmentedStageTracker.tsx`, `Badge.tsx`, `EmptyState.tsx`, `AgentLeaderboardTab.tsx`, `AdminLeadsTab.tsx`, `AdminUsersTab.tsx`, `AdminAttendanceTab.tsx`, `AdminRosterTab.tsx`, `AdminProjectsTab.tsx`, `LeaveRequestsManagement.tsx`, `AuditSettingsTab.tsx`.

---

## Executive Summary

The CRM has **two parallel table languages**: (1) a shared `DataTable` used across Admin (leads, users, projects, roster, attendance exports, leave, audit, agent leaderboard), and (2) a custom high-traffic `LeadsDesktopTable` that already adopts many DLS v1.0 tokens (`bg-theme-card`, sticky `bg-theme-surface` headers, accent checkboxes) but still carries Wave‑0 chrome (emoji group labels, indigo selection, `font-black`, overdue `animate-pulse`, gray/slate islands in rows). Shared `DataTable` is functionally solid (sort, page, select, search, CSV) but is a **pre‑DLS island** — almost entirely `slate` / `indigo` / `gray` / `rounded-xl` / italic empty copy — so every Admin consumer inherits that debt even when parent cards use `theme-*`.

Wave 2 is **ready for presentation modernization** without architecture or logic changes: fix the shared primitive first, then align Leads desktop + Admin column chrome, then quiet badges/empties/selection. **Overall readiness: Medium — high daily traffic on Leads; Admin tables shippable but visibly off-brand vs Agent dashboard.**

---

## Design Debt Scoreboard

| Area | Design Debt | Priority | Rationale |
| --- | --- | --- | --- |
| Shared DataTable primitive | **High** | **P1** | Hardcoded slate/indigo shell; all Admin tables inherit non‑DLS chrome |
| Leads desktop table (highest-traffic) | **High** | **P1** | Theme shell OK; emoji groups, indigo select, weight/pulse/gray row debt |
| Table density / row hierarchy / hover/focus | **Medium** | **P1** | Comfortable padding OK; selection + hover use indigo/slate; weak focus |
| Headers / sticky / sorting chrome | **Medium** | **P1** | Leads sticky is good; DataTable headers slate + bold uppercase; no sticky |
| Empty & loading states in tables | **High** | **P1** | Italic slate empties; no `EmptyState`; no shared loading skeleton |
| Selection / bulk actions chrome | **Medium** | **P2** | Selection works; indigo wash + gray checkboxes on DataTable |
| Status chips / badges inside rows | **High** | **P1** | Emoji priority/SLA; ad-hoc gray/amber chips vs Badge + theme tokens |
| Mobile/responsive table patterns | **Low–Medium** | **P2** | Leads mobile grid mostly tokenized; DataTable is overflow-x only |
| Token compliance (theme-* vs slate/indigo) | **High** | **P1** | DataTable is a slate/indigo island; Leads/Admin mix theme + legacy |

---

## Audit by Area

### 1. Shared DataTable primitive

**File:** `telecaller-app/src/shared/components/DataTable.tsx`  
**Consumers:** `AdminLeadsTab`, `AdminUsersTab`, `AdminProjectsTab`, `AdminRosterTab`, `AdminAttendanceTab` (partial), `LeaveRequestsManagement`, `AuditSettingsTab`, `AgentLeaderboardTab`

#### Keep

- Generic `ColumnDef` + `render` API — right abstraction for Admin reuse.
- Built-in sort, optional pagination, selection, internal/external search, CSV export — do not rip out for presentation.
- Lucide sort chevrons (not emoji).
- Pagination via shared `Button` outline — good hook for DLS buttons later.
- `rowClassName` / `getRowKey` / `emptyMessage` extension points — enough for consumers without forking.

#### Problems

**P1 — Pre‑DLS token island (slate / indigo / gray / white)**

- **Current issue:** Shell uses `bg-white dark:bg-slate-900`, `border-slate-*`, `divide-slate-*`, search `focus:ring-indigo-500`, selection `bg-indigo-50/20`, checkboxes `text-indigo-600` / `border-gray-300`, cells `text-slate-700`.
- **Why it hurts enterprise UX:** Agent dashboard speaks `theme-*`; Admin tables look like a different product. Dark mode and branding accent cannot flow through.
- **Recommendation:** Remap surfaces to `bg-theme-card` / `bg-theme-surface`, borders `border-theme-border`, text `text-theme-text` / `text-theme-muted`, focus `ring-theme-ring`, selection wash `bg-theme-accent-muted` (or subtle accent tint), checkboxes `text-theme-accent` / `border-theme-border` (mirror Leads header checkbox).
- **Why — expected user benefit:** One CRM visual language from dashboard → Admin lists.

**P1 — Radius / elevation vs Card Contract**

- **Current issue:** Container + pagination footer use `rounded-xl`; no `rounded-theme` / `shadow-elevation-*`.
- **Why it hurts enterprise UX:** Same radius debt Wave 1 fixed on widgets.
- **Recommendation:** `rounded-theme`; optional quiet `shadow-elevation-sm` only if parent does not already card-wrap (avoid double chrome).
- **Why — expected user benefit:** Consistent card language with DLS v1.0.

**P2 — Toolbar search/export styling**

- **Current issue:** Inline SVG search icon; slate input; export button overrides with slate borders + emerald icon.
- **Why it hurts enterprise UX:** Ad-hoc toolbar vs Filter/Button patterns coming later.
- **Recommendation:** Theme input + Lucide `Search` / `Download`; keep CSV behavior; defer full Filter Contract to later Wave 2 phase.
- **Why — expected user benefit:** Scannable, brand-aligned controls without changing search logic.

#### Design Debt: High | Priority: P1

---

### 2. Leads desktop table (highest-traffic workflow)

**Files:** `LeadsDesktopTable.tsx`, `LeadsTableRow.tsx`  
**Note:** Custom table — **not** `DataTable`. Highest daily agent path.

#### Keep

- Sticky header on `bg-theme-surface` + `shadow-sm` — excellent for long lists.
- Shell already on `bg-theme-card` / `divide-theme-border` / theme header labels.
- Compact vs normal density modes — matches productivity density target.
- Header + row checkboxes already use `border-theme-border` / `text-theme-accent` / `focus:ring-theme-ring`.
- Name links to lead detail with accent hover — clear primary action.
- Grouping by status/priority with collapse — useful ops structure (presentation of labels needs quieting, not removal of grouping).
- `React.memo` on table/row — keep; presentation-only edits should preserve memo props.

#### Problems

**P1 — Emoji in persistent group headers (Emoji Policy violation)**

- **Current issue:** Group names like `Raw Leads 📥`, `Hot Priority 🔥`, `Booked & Reserved 🏆`, etc.
- **Why it hurts enterprise UX:** Violates DLS v1.0 persistent-UI emoji ban; slows first-time scan vs color + text (Wave 1 leaderboard lesson).
- **Recommendation:** Plain labels + existing color dot (`w-2 h-2 rounded-full`); drop emoji from group titles. Keep collapse/expand.
- **Why — expected user benefit:** Professional pipeline grouping readable in &lt;1s.

**P1 — Row selection + hover still indigo / gray**

- **Current issue:** Selected row `bg-indigo-50/20`; hover `hover:bg-gray-55 dark:hover:bg-gray-700/30` (typo-like utility).
- **Why it hurts enterprise UX:** Conflicts with theme checkboxes; reads pre-brand.
- **Recommendation:** Selection `bg-theme-accent-muted/40` (or equivalent quiet accent); hover `hover:bg-theme-surface/60` (mirror mobile grid).
- **Why — expected user benefit:** Clear selected state that matches brand, not Material indigo.

**P2 — Typography weight noise**

- **Current issue:** Group headers `font-black`; follow-up `font-black`; overdue/today labels `font-black` + overdue `animate-pulse`.
- **Why it hurts enterprise UX:** Bold-as-default fights Type scale; pulse is decorative motion in a dense list.
- **Recommendation:** Prefer `font-semibold` / `font-bold` / `type-label`; overdue = solid `text-theme-danger` (no pulse) — same meaning, quieter.
- **Why — expected user benefit:** Overdue still pops; less visual fatigue across hundreds of rows.

**P2 — Gray/slate islands in cells + action chrome**

- **Current issue:** Compact name stack `text-slate-800` / `text-gray-900`; phone `text-gray-650`; assigned `text-slate-800`; plot chip indigo borders; call button `border-indigo-200 text-indigo-650`.
- **Why it hurts enterprise UX:** Partial migration — table looks half Wave 1, half legacy.
- **Recommendation:** `text-theme-text` / `text-theme-muted`; actions `border-theme-border` + `text-theme-accent` / danger for archive.
- **Why — expected user benefit:** Consistent row scanning; accent means “action,” not random indigo.

**P3 — Group footer / borders**

- **Current issue:** Group header borders `border-gray-200` / `dark:border-slate-800`; footer `bg-gray-50` + `font-black text-gray-950`.
- **Recommendation:** Theme border/surface/muted; drop “Group total count” chrome weight or keep as quiet caption.
- **Why — expected user benefit:** Groups feel part of the same table, not colored banners from another skin.

#### Design Debt: High | Priority: P1

---

### 3. Table density / row hierarchy / hover/focus

#### Keep

- Leads compact/normal padding (`px-3 py-2` vs `px-6 py-4`) — good density control.
- DataTable default `px-6 py-4` + `text-xs sm:text-sm` — readable Admin density.
- Row hover color transition (intent is right; tokens wrong).

#### Problems

**P1 — No shared focus-visible language on interactive cells**

- **Current issue:** Sortable headers are clickable without clear `focus-visible` ring; row action buttons often lack Wave 1.5 ring pattern; checkboxes rely on browser/indigo rings inconsistently.
- **Why it hurts enterprise UX:** Keyboard users lose place in dense grids (Accessibility §12).
- **Recommendation:** Header buttons / sort controls: `focus-visible:ring-2 focus-visible:ring-theme-ring`; ensure action icon buttons get the same imprint as dashboard chrome.
- **Why — expected user benefit:** Predictable keyboard path through lists.

**P2 — Primary vs secondary cell hierarchy uneven**

- **Current issue:** Many cells force `font-medium` / `font-bold` equally (DataTable body applies `font-medium` globally).
- **Why it hurts enterprise UX:** Name, status, and follow-up should outrank source/created-by.
- **Recommendation:** Default body regular/muted; consumers emphasize name + status + follow-up only (presentation classNames — no column logic change).
- **Why — expected user benefit:** Faster “who / where in pipeline / when next” scan.

**P3 — No hover-lift (good)**

- Tables correctly avoid `-translate-y` theater — **keep**.

#### Design Debt: Medium | Priority: P1

---

### 4. Headers / sticky / sorting chrome

#### Keep

- Leads sticky `thead` (`sticky top-0 z-20`) — must preserve.
- Uppercase muted header labels — enterprise CRM familiar pattern; align weight to `type-label` / `font-semibold` rather than inventing new header UI.
- DataTable sortable affordance with ChevronUp/Down — keep metaphor.

#### Problems

**P1 — DataTable header tokens + weight**

- **Current issue:** `bg-slate-50`, `font-bold text-slate-500 uppercase tracking-wider`.
- **Recommendation:** `bg-theme-surface`, `type-label` / `text-theme-muted`, `font-semibold`; active sort column subtle `text-theme-text`.
- **Why — expected user benefit:** Headers match Leads + DLS without changing sort behavior.

**P2 — DataTable not sticky**

- **Current issue:** Overflow container scrolls whole table including header.
- **Why it hurts enterprise UX:** Long Admin pages lose column context (Leads already solved this).
- **Recommendation:** Optional sticky header inside overflow (presentation); default on when `pageSize` large or always for consistency with Leads.
- **Why — expected user benefit:** Same mental model: headers stay while scanning rows.

**P3 — Filter row lives in Leads thead**

- **Current issue:** `LeadListDesktopFilterRow` inside sticky header — valuable; Filter Contract is a later Wave 2 phase.
- **Recommendation:** Do not redesign filter IA in DataTable Phase 2; only ensure filter row tokens stay theme-aligned when touched.
- **Why — expected user benefit:** Avoid scope creep; filters get their own contract.

#### Design Debt: Medium | Priority: P1

---

### 5. Empty & loading states in tables

#### Keep

- `emptyMessage` prop on DataTable — good API hook.
- Consumer-specific copy exists (“No agents…”, “No users…”) — keep messages; change presentation.

#### Problems

**P1 — Empty = italic slate centered cell**

- **Current issue:** DataTable empty: `text-slate-400 italic`. Leads desktop has **no** empty body state in the table itself (empty handled upstream / blank tbody). Admin empties often italic gray outside tables too.
- **Why it hurts enterprise UX:** Wave 1 banned one-off italic gray empties; `EmptyState` exists and is unused here.
- **Recommendation:** Use `EmptyState variant="compact"` (or a table-scoped compact preset) inside the empty row / below toolbar; no emoji; Lucide optional via preset.
- **Why — expected user benefit:** Same empty language as Agent widgets; clearer “nothing here” vs broken UI.

**P2 — No shared loading skeleton for tables**

- **Current issue:** Loading is parent-dependent; DataTable has no `loading` prop / skeleton rows.
- **Recommendation (Phase 2 optional):** Quiet skeleton rows using `bg-theme-surface animate-pulse` (loading-only pulse allowed per Motion policy) — only if parents already expose loading; do not invent fake async.
- **Why — expected user benefit:** Avoid layout jump; match dashboard skeleton imprint.

#### Design Debt: High | Priority: P1

---

### 6. Selection / bulk actions chrome (if present)

#### Keep

- Controlled `selectedRowIds` / `onSelectionChange` on DataTable — correct pattern.
- Leads select-all + per-row toggle — keep behavior and memoized toggle handler.
- AdminLeads bulk selection wiring — keep; chrome only.

#### Problems

**P2 — Indigo selection wash + gray/indigo checkboxes on DataTable**

- **Current issue:** Checked row `bg-indigo-50/20`; checkboxes indigo/gray (see §1).
- **Recommendation:** Theme accent muted selection; theme checkboxes (copy Leads).
- **Why — expected user benefit:** Selected rows feel intentional brand state.

**P2 — Bulk action bars mixed tokens (AdminLeads)**

- **Current issue:** Surrounding search/bulk chrome mixes `bg-gray-*`, indigo pills, theme card — outside pure table but adjacent.
- **Recommendation:** When adopting DataTable tokens, lightly align adjacent bulk/search strip to `theme-*` / `rounded-theme` without changing bulk actions logic.
- **Why — expected user benefit:** Table + toolbar read as one tool.

**P3 — Select-all scope**

- DataTable select-all uses **filtered/sorted** `allIds` (full filtered set, not page-only) — document as Keep/behavior; do not change in presentation wave unless product asks.

#### Design Debt: Medium | Priority: P2

---

### 7. Status chips / badges inside rows

#### Keep

- Shared `Badge` primitive with theme variants — prefer this over one-offs.
- `SegmentedStageTracker` as status control in Leads/Admin leads — keep component; quiet colors later if needed.
- Meaning-driven IDLE / overdue / today labels — keep the **meaning**; quiet the chrome.

#### Problems

**P1 — Emoji in row status/priority chrome**

- **Current issue:** LeadsTableRow hot/cold `🔥`/`❄️`; AdminLeads SLA `🚨`, stuck `⏳`, HOT/COLD emoji + `animate-pulse` on SLA/HOT; AgentLeaderboardTab ranks `🥇🥈🥉` + banner `🔥` / points emoji.
- **Why it hurts enterprise UX:** Direct Emoji Policy + Motion violations in the highest-visibility list cells.
- **Recommendation:** Priority/SLA = `Badge` or small text chip + theme danger/warning/success (no emoji, no idle pulse). Leaderboard ranks = numeric `1`/`2`/`3` (Wave 1 widget precedent). Banner emoji → Lucide or remove.
- **Why — expected user benefit:** Status decoded by color + word, not emoji literacy.

**P2 — Ad-hoc chip recipes**

- **Current issue:** Gray follow-up pills, indigo points pills, green milestone tags, attendance status `rounded-full` gray/green/blue mixes.
- **Recommendation:** Standardize on `Badge` variants + `rounded-theme` (or keep pill only for true status chips per Card Contract note); map success/warning/danger to theme tokens.
- **Why — expected user benefit:** One chip language across Leads + Admin.

**P3 — SegmentedStageTracker palette**

- Stage colors are semantic (purple/amber/blue/emerald/rose) — acceptable for pipeline meaning; prefer not to force everything to accent green. Optional later pass: ensure borders/text use readable theme-adjacent pairs, not raw indigo islands in adjacent actions.

#### Design Debt: High | Priority: P1

---

### 8. Mobile/responsive table patterns (if any)

#### Keep

- Leads: desktop table `hidden md:block` + `LeadsMobileGrid` `block md:hidden` — correct split.
- Mobile grid largely on `theme-*` (card, border, danger/warning follow-up) — closer to DLS than desktop rows in places.
- DataTable `overflow-x-auto` — acceptable Admin default; do not invent card-list redesign unless product asks.

#### Problems

**P2 — Mobile status chip weight**

- **Current issue:** Status uses `font-extrabold` on mobile grid.
- **Recommendation:** `font-semibold` / `font-bold` per Typography rules.
- **Why — expected user benefit:** Align mobile list with type scale.

**P2 — DataTable has no dedicated mobile row layout**

- **Current issue:** Horizontal scroll on small screens for wide Admin columns.
- **Recommendation:** Keep overflow-x for Wave 2 Phase 2; document as known pattern. Optional later: stacked “definition list” row for 1–2 key Admin tables only if first-time clarity demands it — not default.
- **Why — expected user benefit:** Avoid premature responsive rewrite; Agents use Leads mobile path more.

**P3 — Touch targets on desktop action icons**

- Call/archive icon buttons are `p-1` — below 44px mobile target guidance; on desktop Leads they’re secondary. Prefer slightly larger hit area when touching action chrome (`p-2` / min size) without changing handlers.

#### Design Debt: Low–Medium | Priority: P2

---

### 9. Token compliance (theme-* vs slate/indigo islands)

#### Keep

- Leads table **chrome** (shell, sticky header, many labels) already theme-first — best ecosystem reference.
- Many Admin **parent** wrappers: `bg-theme-card rounded-xl border-theme-border` — good; inner DataTable undoes the win.
- `Badge` primary/success/warning/danger on theme tokens.

#### Problems

**P1 — Shared DataTable is the largest remaining slate/indigo island in CRM lists**

- Fixing the primitive multiplies across ~8 Admin surfaces — highest ROI (same as Wave 1 Card/EmptyState).

**P1 — Consumer column classNames reintroduce gray/indigo**

- AdminLeads / Users / Audit / Leave / Leaderboard column renders still pass `text-gray-*`, `text-indigo-*`, emoji badges even after primitive fix.
- **Recommendation:** Phase order = primitive tokens → Leads row/group quieting → Admin consumer chip/column pass (Batch adoption).

**P2 — `rounded-xl` on almost every Admin card wrapping tables**

- Align to `rounded-theme` when those wrappers are touched (Card Contract).

**P2 — Badge `info` variant still sky raw**

- Minor; prefer theme or document as exception.

#### Design Debt: High | Priority: P1

---

## Cross-Cutting Findings

1. **Two table systems, one product** — Leads custom table is ahead on theme tokens; DataTable is behind. Wave 2 must converge presentation without forcing Leads to migrate onto DataTable (behavior/IA stay).
2. **Primitive-first wins again** — Tokenizing `DataTable.tsx` alone removes most Admin visual debt; consumer emoji/chips remain a second pass.
3. **Emoji policy regresses hardest in lists** — Group headers, priority, SLA, leaderboard ranks, rewards banner. Same fix pattern as Wave 1 Agent leaderboard.
4. **EmptyState unused in tables** — Same debt scoreboard item as Wave 1 widgets pre-adoption.
5. **Motion** — Overdue/SLA `animate-pulse` in rows is noise; reserve pulse for true loading skeletons.
6. **Filters are adjacent, not this contract** — `LeadListDesktopFilterRow` / Admin filter panels: note only; formal Filter Contract = later Wave 2 phase.
7. **Gamification chrome vs logic** — Quiet medals/emoji in `AgentLeaderboardTab`; do not change points formulas (`getAgentPointsLocal`).

---

## Recommended Wave 2 order (primitives → adoption)

Mirror Wave 1 phases:

| Phase | Name | Deliverable |
| --- | --- | --- |
| **1** | **Audit (this doc)** | Design debt + DataTable Contract draft — **no UI code** |
| **2** | **Shared primitives** | Tokenize `DataTable` shell (surfaces, borders, text, selection, focus, radius); wire compact `EmptyState` for empty rows; optional sticky header; quiet toolbar search/export chrome |
| **3** | **Adoption — Leads ecosystem** | `LeadsDesktopTable` / `LeadsTableRow` / light `LeadsMobileGrid` weight: emoji groups → text; selection/hover theme; chip quieting; remove overdue pulse |
| **4** | **Adoption — Admin consumers** | Column/chip passes: `AdminLeadsTab`, `AgentLeaderboardTab`, Users/Projects/Roster/Leave/Audit (+ attendance table islands if in scope); `rounded-theme` on touched wrappers |
| **5** | **Validation** | Light/dark, empty/populated, selection, sort, sticky Leads, compact/normal; `tsc --noEmit`; table regression checklist |
| **6** | **Docs** | Formalize DataTable Contract in `ui-registry.md`; bump Design Language to **v1.1** changelog |

**Outside-in within tables:** shell tokens → header/sticky/sort chrome → row density/hover/selection → cell typography → badges/empties → consumer-specific chips.

---

## Explicit Non-Goals

- No business logic, scoring, SLA/escalation rules, or assignee/status write paths changes.
- No filter IA redesign / Filter Contract implementation (audit note only).
- No merging Leads desktop table into shared `DataTable` (keep dual implementation; align **look**).
- No Forms / Modals / Lead detail / Settings redesign.
- No theme engine rewrite or new token architecture.
- No Maps / Training HQ / Profile (except if they embed DataTable — still presentation-only if touched).
- No inventing visual baseline PNGs; capture list stays in [`wave1-visual-baseline.md`](wave1-visual-baseline.md).
- No gamification **logic** changes (points, badge unlock rules).

---

## Regression Checklist (table-specific)

Every Wave 2 table presentation change must preserve:

- [ ] Column sort (DataTable) and defaultSort
- [ ] Pagination page size / page index behavior
- [ ] Search (internal + external query) and `searchFields`
- [ ] CSV export contents/filename hooks
- [ ] Row selection + select-all + `getRowKey`
- [ ] `rowClassName` consumer overrides
- [ ] Leads compact ↔ normal column set
- [ ] Leads grouping / collapse / group filters
- [ ] Leads sticky header + inline filter row behavior
- [ ] Leads mobile grid vs desktop split (`md` breakpoint)
- [ ] Admin lead stage tracker / assignee controls still operable
- [ ] Theme switching (appearance) + dark mode on table shells
- [ ] Branding accent visible on selection/checkboxes/actions
- [ ] Keyboard: sort headers, checkboxes, row action buttons focusable
- [ ] No regression to call / archive / open-lead actions

---

## Don't Improve This / Do Not Change

Hard scope fence — different from Keep:

- Lead filter query model / `LeadListFilters` / apply-search semantics
- DataTable sort/filter/pagination **algorithms** (only chrome)
- Store hooks (`useLeadsStore`, `useAdminLeads`, points calculators)
- Routing to `/lead/:id`
- Bulk import / campaign / WhatsApp flows
- Attendance matrix custom table structure (beyond token quieting if explicitly in Phase 4)
- Replacing SegmentedStageTracker with a new status UX
- Admin IA / tab structure
- Forcing all tables onto one React component

### Implementation guideline — outside-in

1. DataTable shell tokens + empty  
2. Header / sort / sticky  
3. Selection / hover / focus  
4. Leads desktop groups + rows  
5. Admin consumer chips / leaderboard chrome  
6. Docs → DLS v1.1  

---

## Widget/Table Contract draft (propose DataTable Contract for DLS — draft only)

*To be formalized in `ui-registry.md` after Phase 2–4 implementation (v1.1). Draft for alignment only.*

```
DataTable (shared) / Table ecosystem
  Toolbar   — optional search + export (theme inputs/buttons; no slate/indigo)
  Header    — sticky when scrolling; type-label / theme-muted; sort chevrons Lucide
  Body      — theme-card rows; quiet hover (theme-surface); selection = accent-muted
  Cells     — primary: name/status/follow-up; secondary: muted meta
  Empty     — EmptyState compact (no italic gray one-offs)
  Footer    — pagination on theme surface; Button outline
```

| Concern | Draft rule |
| --- | --- |
| **Surface** | `bg-theme-card`, header `bg-theme-surface`, `border-theme-border`, `rounded-theme` |
| **Text** | `text-theme-text` / `text-theme-muted`; prefer `type-label` on headers; avoid `font-black` / `font-extrabold` |
| **Selection** | Checkbox `text-theme-accent` + `focus:ring-theme-ring`; selected row accent-muted wash — not indigo |
| **Status** | `Badge` or theme chips; **no emoji** in persistent row/header chrome; no decorative `animate-pulse` |
| **Empty** | `EmptyState variant="compact"` (+ optional preset); message via prop |
| **Motion** | Color/border transitions only; pulse only for loading skeletons |
| **Density** | Support compact/comfortable padding; default Admin comfortable; Leads keeps compact mode |
| **Mobile** | Leads: card/list grid OK; Admin DataTable: overflow-x OK until Filter/mobile phase |
| **Custom tables** | May remain separate components (Leads) but **must** obey this chrome contract |
| **Non-goals** | Do not change data hooks, sort math, or filter business logic under this contract |

---

## Appendix — Quick code anchors for Phase 2

| Concern | Anchor |
| --- | --- |
| DataTable shell slate/indigo | `DataTable.tsx` ~toolbar input `focus:ring-indigo-500`, container `rounded-xl border-slate-200`, empty italic slate |
| DataTable selection | checkbox `text-indigo-600`; row `bg-indigo-50/20` |
| Leads sticky + theme shell | `LeadsDesktopTable.tsx` `sticky top-0` / `bg-theme-card` |
| Leads emoji groups | `LeadsDesktopTable.tsx` `groups` names (`📥`, `🔥`, …) |
| Leads row chrome | `LeadsTableRow.tsx` indigo select, priority emoji, overdue `animate-pulse`, indigo call button |
| Leads mobile | `LeadsMobileGrid.tsx` theme tokens; `font-extrabold` status |
| Admin DataTable + emoji SLA | `AdminLeadsTab.tsx` SLA/STUCK/HOT chips |
| Leaderboard medals + banner | `AgentLeaderboardTab.tsx` `rankEmoji`, `🔥` banner, indigo points pill |
| Empty primitive | `EmptyState.tsx` — unused by tables today |
| Badge | `Badge.tsx` — prefer over one-off chips |

---

## Phase gate

**Stop after this audit.** User reviews findings before Phase 2 (shared DataTable primitive implementation). No UI redesign in Phase 1.
