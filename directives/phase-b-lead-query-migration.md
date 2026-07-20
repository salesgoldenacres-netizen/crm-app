# Phase B — LeadQueryService migration

## Canonical path

```
Lead List UI → LeadQueryService → FirestorePaginationProvider → Firestore
```

Lead collections are **query results**, not application state. There is no global realtime list of all company leads.

## Rollback

**Removed in Phase F.** `VITE_LEGACY_LEADS_SNAPSHOT` no longer exists. List UIs always use `LeadQueryService`. See `directives/phase-f-completion-convergence.md`.

## Migrated UIs (on LeadQueryService)

- Manager + agent desktop leads list (`LeadsWorkspace` / `LeadsDesktopTable`)
- Mobile lead list (`LeadsMobileGrid`)
- Filters / search (same service; cursor resets to page 1 on spec change)
- Grouped view: one page → then group → virtualize (table)
- Kanban: same paginated page → column group → virtualize dense columns

## Remaining old path

- `DatabaseContext.leads` for **agents only**: optional narrow realtime (`assignedTo`, bound 100) for dashboard / dialer convenience — **not** list SoT
- Managers: `leads` array empty unless legacy flag
- Admin / dashboard analytics widgets that still consume `useLeadsStore().leads` — not yet on LeadQueryService (follow-up); list correctness no longer depends on them
- Lead Bin archived listener via `subscribeArchivedLeads` (bounded, separate collection)

## Verify

1. `npm run typecheck` in `telecaller-app`
2. `npx vitest run src/shared/services/leads/LeadQueryService.test.ts`
3. Open Leads List as manager → Next/Previous pages; change filter → returns to page 1
4. Kanban shows same page with virtualized dense columns
5. Confirm no `limit: 500` in `DatabaseContext` / production list path
