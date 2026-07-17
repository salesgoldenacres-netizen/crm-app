# Wave 8 Phase 2C Validation Guide

This document details the validation checklist and automated testing routines verifying correct behavior of the Analytics Service.

## Automated Verification

Run Vitest unit tests covering Routing, Caching, Deduplication, and Boundaries:
```bash
npx vitest run src/shared/services/analytics/analyticsService.test.ts
```

Check the whole test suite for regressions:
```bash
npm test
```

Ensure no TypeScript compilation issues:
```bash
npx tsc --noEmit
```

## Manual Verification Verification Scenarios

1. **Dashboard Widgets**: Check that CallsToday, BookingsToday, and TeamGoals widgets render identical layouts.
2. **Project Switching**: Changing project scoping reactively updates context hooks and clears out previous scopes' cached data.
3. **Permission Check**: Revoking user permissions throws a normalized `PERMISSION_DENIED` block instead of propagating undefined client reads.
4. **No Direct Firestore Reads**: Confirm dashboard widgets contain zero inline database or collection query statements.
