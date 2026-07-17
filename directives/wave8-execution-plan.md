# Wave 8 — Execution Plan

**Status:** **IN PROGRESS (PHASE 2C COMPLETE)**  
**DLS Version:** **v1.4** (locked)  
**App:** `telecaller-app/`  

---

## 1. Overview & Objectives

Wave 8 is an architecture-led modernization wave. Building directly on the Wave 6 and Wave 7 baselines, it focuses on scaling the Golden Acres CRM to 1M+ leads, establishing enterprise-grade security and project scoping, optimizing the mobile/tablet UX within DLS v1.4, and laying the foundation for a decoupled Analytics Service.

### Non-Goals for Wave 8
- No new AI capabilities (no Manager Digest, Predictive scoring, or Knowledge AI implementation).
- No DLS version bump (no new colors, fonts, or component overrides).
- No direct client-side audit writes.
- AI remains disabled by default.

---

## 2. Phase Board

| Phase | Milestone | Focus | Status |
| --- | --- | --- | --- |
| **Phase 1** | Scoping & Audits | Governance, planning, and architectural reviews | **COMPLETE** |
| **Phase 2A** | Project Scoping & Auth | Schema partitioning and client queries | **COMPLETE** |
| **Phase 2B** | Mobile UX Adaptations | Mobile/Tablet presentation styling | **COMPLETE** |
| **Phase 2C** | Analytics Service | Decoupled KPI infrastructure | **COMPLETE** |
| **Phase 2D-A**| Virtualization Foundation| Pluggable rendering infrastructure | **COMPLETE** |
| **Phase 2D-B**| Cursor Pagination | High-scale data fetching | **COMPLETE** |
| **Phase 2D-C**| Lead Page Cache | Project-segmented memory caching | **COMPLETE** |
| **Phase 2D-D**| Query Opt & Diagnostics | Advisory optimizer and performance context | **COMPLETE** |
| **Phase 3** | Integration & Performance | Load testing and scale verification | **COMPLETE** |

---

## 3. Engineering Work Tracks

### Track A: Scalability & Partitioning
- **Step 1**: Add `projectId` to leads schema and map users to `allowedProjects`.
- **Step 2**: Restructure all lead list loaders to enforce project-scoped queries.
- **Step 3**: Enforce index configuration for all scoped filters.

### Track B: Mobile Presentation Adaptation
- **Step 1**: Implement viewport checks in `Drawer` to render bottom sheet styles on mobile.
- **Step 2**: Apply keyboard-avoidance scrolling patterns in standard form layouts.
- **Step 3**: Collateral tables into flex-based stack cards for screens under 768px.

### Track C: Operational Analytics
- **Step 1**: Ship `AuthorizationService` to gate stats and report execution.
- **Step 2**: Expose the unified client Analytics Service interface with four-tier routing (Client -> Summary -> Aggregation).
- **Step 3**: Refactor widgets (CallsToday, BookingsToday, TeamGoals) to consume the service.

### Track D: Performance & Rendering Virtualization (2D)
- **Step A**: Implement stateless VirtualizationEngine, FixedRowHeightStrategy, useVirtualization hook, and VirtualizationErrorBoundary wrapper. (COMPLETE)
- **Step B**: Implement cursor-based pagination and opaque CursorToken. (COMPLETE)
- **Step C**: Implement lead caching with LRU evictions. (COMPLETE)
- **Step D**: Implement advisory query optimizer. (COMPLETE)
- **Step E**: Implement performance instrumentation and developer diagnostics. (COMPLETE)

