# Wave 8 Audit — Reporting & Analytics (Agent 4)

This report establishes the modernization roadmap for metrics, aggregate logging, and manager dashboards.

---

## 1. Metric Execution Classifications

Every dashboard widget and reporting KPI is routed through the central `AnalyticsService`:

| Metric | Target Tier | Aggregation Method | Storage Details |
| --- | --- | --- | --- |
| **My Calls Today** | Tier 1 (Client-derived) | Computed local store query | InMemory app state |
| **Active Leads count** | Tier 2 (Incremental server counters) | Event-driven triggers | `/aggregations` metadata doc |
| **Historical conversion rate** | Tier 3 (Scheduled analytics) | Nightly Cloud Scheduler | `/aggregations/reports` collection |
| **Filtered lead search counts** | Tier 4 (On-demand filtered) | Firestore `count()` query | Direct Firestore count output |

---

## 2. Analytics Roadmaps

- **Manager Reports**: Provide summaries on lead assignment distributions per agent and site-visit ratios.
- **Conversion Funnels**: Track transitions: `New` → `Contacted` → `Visit Scheduled` → `Visited` → `Booked`.
- **Forecast Models**: Analyze booking velocity to project month-end conversions.
