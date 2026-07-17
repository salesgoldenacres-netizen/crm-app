# Enterprise Authorization Architecture (Wave 8 Phase 2A)

This document describes the design, API contracts, and implementation of the centralized permission system in the Golden Acres CRM.

## Core Principles

1. **Backend as Source of Truth**:
   Permissions are gated at the database layer (Firestore Security Rules) and function runtime. The client-side `AuthorizationService` acts as a representation of these rules to hide/disable UI controls dynamically.

2. **Centralized Authority**:
   No inline checks targeting `user.role === ...` or direct `isManagerial` utility queries are allowed in UI features. All checks must pass through the `AuthorizationService` API.

3. **Layered Gating for AI**:
   AI actions are protected across 4 independent evaluation boundaries:
   - **Layer 1**: Global kill switch (`AI_ENABLED` flag)
   - **Layer 2**: Active user role validation
   - **Layer 3**: Project membership boundaries
   - **Layer 4**: Feature-specific capability flags (e.g. `lead-brief-v1`, `confirm-write`)

---

## Technical Specifications

### AuthorizationService Contracts

```typescript
export interface AuthorizationService {
  isProjectAuthorized(user: User | null, projectId?: string): boolean;
  canReadLead(user: User | null, lead: Lead, customRoles?: CustomRole[]): boolean;
  canUpdateLead(user: User | null, lead: Lead, customRoles?: CustomRole[]): boolean;
  canAssignLead(user: User | null, customRoles?: CustomRole[]): boolean;
  canUseCopilot(user: User | null, capabilityId: string, projectId?: string, customRoles?: CustomRole[]): boolean;
  canViewAnalytics(user: User | null, customRoles?: CustomRole[]): boolean;
  canManageUsers(user: User | null, customRoles?: CustomRole[]): boolean;
  canExecuteProposal(user: User | null, proposalType: string, lead: Lead, customRoles?: CustomRole[]): boolean;
}
```

### React Hooks integration

- `useAuthorization()`: Exposes reactive checks tied to the authenticated user.
- `useProjectScope()`: Exposes `activeProjectId` and allowed projects.

---

## Security Rules Enforcement

Firestore Security Rules must be synchronized with these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper: is user authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper: get current user document
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    // Helper: is user managerial (admin, upper/middle/lower management)
    function isManagerial(user) {
      return user.role in ['admin', 'upper_management', 'middle_management', 'lower_management'];
    }

    match /leads/{leadId} {
      allow read, write: if isAuthenticated() && (
        isManagerial(getUserData()) || 
        resource.data.assignedTo == request.auth.uid
      ) && (
        // Project Scoping Gate
        !('allowedProjects' in getUserData()) ||
        getUserData().allowedProjects.size() == 0 ||
        resource.data.projectId in getUserData().allowedProjects
      );
    }
  }
}
```
