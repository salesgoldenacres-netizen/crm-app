# Wave 8 Phase 2A Release Notes

## Overview

Wave 8 Phase 2A introduces enterprise-grade data boundaries and authorization controls. It transitions the CRM from inline role checks to a centralized permission model, preparing the platform for multi-project and tenant-isolated operations.

## Key Enhancements

- **Centralized Authorization**: Shipped `AuthorizationService` and `useAuthorization()` to manage security checks in one place.
- **Active Scoping**: Built `ProjectScopeContext` and `useProjectScope()` hooks to manage current workspace boundaries.
- **Harden Queries**: All lead live listeners are updated to query leads with an optional `projectId` parameter, avoiding client-side over-fetching.
- **AI Proposal Hardening**: Copilot Drawer now performs security re-verification immediately before proposal mutation execution.

## Verification

All 216 test cases passed, and the production Vite bundle builds successfully.
