# Analytics Provider Contract

Defines structural bounds for individual execution tiers.

## Contracts

```typescript
export interface AnalyticsProvider {
  getDashboardMetrics(projectId?: string, username?: string): Promise<DashboardMetrics>;
  getActivityMetrics(projectId?: string, username?: string): Promise<ActivityMetrics>;
  getPipelineMetrics(projectId?: string): Promise<LeadPipelineMetrics>;
  getBookingMetrics(projectId?: string): Promise<BookingMetrics>;
  getTeamMetrics(projectId?: string): Promise<TeamMetrics>;
}
```

Providers are decoupled execution engines. In subsequent waves, additional providers can be registered to fetch metrics from:
- Cloud Scheduler aggregate snapshots (Tier 2/3)
- BigQuery Analytics tables
- Looker Studio endpoints
- Machine Learning forecasting models
