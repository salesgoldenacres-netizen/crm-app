# Phase 3C — Type Safety Rollout (Increment 1)

**Date:** 2026-07-20  
**Status:** **COMPLETE** (increment 1)  
**Blueprint:** [`enterprise-remediation-blueprint.md`](./enterprise-remediation-blueprint.md) §3C  
**Baseline artifact:** [`.tmp/remediation-baselines-2026-07-20.json`](../.tmp/remediation-baselines-2026-07-20.json)

---

## Scope (this increment)

1. Enable `@typescript-eslint/no-explicit-any` as **`warn`** (not `error`).
2. Priority 1 typing pass on repository / listener / modal registry layer.
3. Priority 2 sample: `err: unknown` + `instanceof Error` catch pattern in one feature file.
4. Gates: `npm run typecheck` and `npm run lint` — **0 errors**.

---

## Changes

| File | Change |
|------|--------|
| `telecaller-app/eslint.config.js` | `no-explicit-any`: `off` → `warn` |
| `telecaller-app/src/shared/services/firebase/repositories.ts` | `setEvents(EventLog[])`; `subscribeToday` dispatches typed `AttendanceRecord` |
| `telecaller-app/src/shared/services/firebase/ListenerManager.ts` | Generic `ListenerEntry<T>`; removed `unknown` callback casts |
| `telecaller-app/src/shared/layouts/ModalRegistryContext.tsx` | Exported `TemplateModalContext`, `DialerStatus`; typed modal payloads |
| `telecaller-app/src/shared/layouts/AppShellContext.tsx` | `setTemplateContext(Partial<TemplateModalContext>)` |
| `telecaller-app/src/shared/layouts/ModalHost.tsx` | Wired `DialerStatus` / `TemplateModalContext` (typecheck follow-through) |
| `telecaller-app/src/features/admin/components/CallAuditRatingModal.tsx` | Catch pattern sample: `err: unknown` + `instanceof Error` |

**Reference (already compliant):** `SummaryDocumentProvider.ts`, `FirestoreAggregationProvider.ts`, `AnalyticsService.ts` use the same catch pattern.

---

## Metrics

| Metric | Before | After |
|--------|--------|-------|
| ESLint errors | 0 | 0 |
| ESLint warnings (total) | 4 (pre-rule) → **188** (rule enabled) | **186** |
| `@typescript-eslint/no-explicit-any` warnings | **184** | **182** |
| Priority 1 file `any` warnings | **0** | **0** |
| `tsc --noEmit` | pass | pass |

**Decision:** Do **not** promote `no-explicit-any` to `error` yet — 182 repo-wide warnings remain.

---

## Next increment (recommended)

**Increment 2 — shared layout + table layer**

1. **Priority 1 follow-through:** `ModalHost.tsx` remaining props (`addLead`, `updateLead`, `logCall`, `ivrSettings`, `activeIvrCall`) — 7 `any` warnings.
2. **Priority 1 follow-through:** `AppShell.tsx` store props (`projects`, `leadsStore`, `ivrStore`) — 3 warnings.
3. **Priority 2 — DataTable / MobileCardList:** Replace `(row as any)[col.key]` with generic row constraint or `Record<string, unknown>` accessor helper (~9 warnings).
4. Re-run lint; target **≤160** `no-explicit-any` warnings before considering scoped `error` override on `src/shared/services/firebase/**` and `src/shared/layouts/**`.

**Increment 3+:** Admin settings tabs, dashboard dialer hooks, plots/map canvas (largest clusters), then feature catch blocks batch.

---

## Exit gate for `error` mode

Promote `no-explicit-any` to `error` only when:

- Priority 1 paths (`repositories.ts`, `ListenerManager.ts`, `ModalRegistryContext.tsx`, `ModalHost.tsx`, `AppShell.tsx`) have **zero** warnings, **and**
- Program lead approves repo-wide warning budget or per-directory ESLint overrides are added.
