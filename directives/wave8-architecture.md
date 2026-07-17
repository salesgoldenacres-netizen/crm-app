# Wave 8 — Modernization & Scaling Architecture

This document outlines the core architectural boundaries, service abstractions, and data isolation strategies for the Wave 8 release.

---

## 1. Data Partitioning & Project Scoping

To scale lead management securely across multiple projects, the system enforces a partition boundary at the database level:

```
Lead
 ├── organizationId  (System boundary)
 ├── projectId       (Project boundary)
 └── assignedTo      (Owner boundary)
```

### Architectural Mandates
1. **No Unscoped Queries**: Every Firestore read targeting `leads` must specify a `projectId` boundary matching the active user's authorized projects.
2. **Security Rules Validation**: Firestore Security Rules must check incoming read/write requests:
   ```javascript
   allow read, write: if request.auth != null && 
     resource.data.projectId in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.allowedProjects;
   ```
3. **Cursor-Based Lists**: Offset pagination is prohibited. All list query streams must use `startAfter(lastVisible)` cursor references and hard limit thresholds (max 50–100 items).

---

## 2. Analytics Service & Four-Tier KPI Routing

To protect Firestore from expensive, on-demand read storms, analytics are decoupled using an `AnalyticsService` abstraction. Real-time list calculations are separated from historical aggregations:

```
Client UI
   └── [Consumes] ──> AnalyticsService (Unified Abstraction)
                          ├── Tier 1: Local Client Aggregations (Today's metrics)
                          ├── Tier 2: Incremental Server Counters (Near-real-time aggregates)
                          ├── Tier 3: Scheduled Cloud Function Cron (Historical conversion trends)
                          └── Tier 4: Server-Side count() Aggregations (Filter counts)
```

### Classification matrix
- **Tier 1 (Client-derived)**: Personal metrics (e.g., "my calls logged today") calculated client-side from reactive listeners.
- **Tier 2 (Incremental server counters)**: Operations widgets (e.g., "total active leads in project") updated incrementally by Cloud Function triggers on document change and stored in aggregate records.
- **Tier 3 (Scheduled historical reporting)**: Complex analytics (e.g., "monthly conversion funnels") calculated by nightly scheduled functions.
- **Tier 4 (On-demand filtered metrics)**: Smart filter tallies computed on-demand using Firestore's native server-side `count()` function.

---

## 3. Responsive Layout Adaptations (DLS v1.4 Locked)

Mobile and tablet layouts adapt dynamic presentation styles while remaining strictly within the design tokens of DLS v1.4:

| Component Type | Desktop (≥1024px) | Tablet (768–1023px) | Mobile (<768px) |
| --- | --- | --- | --- |
| **Drawer** | Slide-out from right | Slide-out from right (wider) | Bottom sheet (90–95% height) |
| **Dialog** | Centered popover | Centered popover | Full-screen modal overlay |
| **Lead Lists** | Multicolumn DataTable | Compact DataTable | Stacked flex-cards |
| **Navigation** | Sticky sidebar | Collapsible sidebar | Sticky bottom bar + overflow |

---

## 4. Enterprise Authorization & Auditing

- **AuthorizationService**: Centralizes all security decisions (e.g. `canReadLead()`, `canAssignLead()`, `canUseCopilot()`). Gated by user role permissions, project memberships, and active feature flag layers.
- **Audit Pipeline**: All auditing is decoupled. Clients are prohibited from writing records. Writes to `/leads` trigger background logs to an asynchronous `/auditLogs` log.
