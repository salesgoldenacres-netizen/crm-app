# Wave 8 Audit — Performance & Scale (Agent 2)

This report profiles the CRM's behavior and cost structures at various scale increments, detailing recommendations for 1M+ lead scalability.

---

## 1. Scale Projections & Bottlenecks

### 100k+ Leads
- **Vulnerability**: Client-side sorting and filter processing on lists will start lagging, causing UI freeze frames.
- **Solution**: Centralize sorting on Firestore queries using ordered indexes and drop all JS-based sort iterations on local lists.

### 500k+ Leads
- **Vulnerability**: Listener costs will spike if components remain subscribed to lead collections.
- **Solution**: Transition lead feeds to run-once fetches (`getDocs`) combined with pagination, using active listeners only for the single lead details view.

### 1M+ Leads
- **Vulnerability**: Large collections will hit query timeout boundaries if unscoped.
- **Solution**: Enforce strict `projectId` scoping on all queries and limit results using a hard cursor constraint.

---

## 2. Rendering & List Virtualization

- **Observation**: Rendering 200+ list rows with complex sub-elements (chips, labels, actions) degrades DOM performance.
- **Recommendation**: Implement standard virtualized rendering (e.g. rendering only the 15 visible viewport rows) inside `DataTable`.
