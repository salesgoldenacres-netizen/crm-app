# Wave 8 — Risk Assessment & Mitigations

This document outlines key technical risks, dependency locks, and migration challenges for the Wave 8 modernization.

---

## 1. Architectural Risks

### Firestore Index Limits
- **Risk**: Enforcing strict project scoping on all lead filters requires complex composite indexes. Firestore has a hard limit of 200 composite indexes per database.
- **Mitigation**: Standardize query sorting and filter criteria. Group composite indexes logically and avoid multiplying index combinations by using single-field query constraints on the client.

### Client-Side Listener Fan-Out
- **Risk**: Active real-time listeners on large paginated streams can exceed Firestore connection thresholds and drive up read costs if they are not cleaned up.
- **Mitigation**: Enforce auto-cleanup of listeners on component unmount and restrict real-time synchronization to active view tabs only.

---

## 2. Migration & Backfill Complexity

### Lead Partitioning (`projectId` backfill)
- **Risk**: Existing leads lack a `projectId` field. Introducing project-scoped queries on the client will render legacy leads invisible.
- **Mitigation**: Deploy a migration Cloud Function to execute a one-time backfill, tagging all legacy leads with a default project ID (e.g., `default-project-1`). Clients must not activate project-scoped queries until this backfill is 100% complete.

### Audit Log Decoupling
- **Risk**: Removing client-side audit writes might lead to missing logs if background cloud functions experience delays.
- **Mitigation**: Implement a fallback log verification in the backend mutation pipelines. Ensure Firestore triggers use retry-on-failure.

---

## 3. Operational Risks

### Quota and Cost Spikes
- **Risk**: Server-computed aggregate counters (Tier 2) and on-demand `count()` operations (Tier 4) could increase write operations if lead status updates occur in high frequencies.
- **Mitigation**: Batch status writes and implement debounce controls on client-side status mutation CTAs.
