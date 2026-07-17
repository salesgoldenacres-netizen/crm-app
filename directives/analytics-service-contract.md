# Analytics Service Contract

Defines interfaces and methods exposed by the central `AnalyticsService` instance to front-end callers.

## Public Interface

```typescript
export interface AnalyticsService {
  getDashboardMetrics(projectId?: string, username?: string): Promise<DashboardMetrics>;
  getActivityMetrics(projectId?: string, username?: string): Promise<ActivityMetrics>;
  getPipelineMetrics(projectId?: string): Promise<LeadPipelineMetrics>;
  getBookingMetrics(projectId?: string): Promise<BookingMetrics>;
  getTeamMetrics(projectId?: string): Promise<TeamMetrics>;
  invalidateCache(): void;
}
```

## Error Model

Every execution failure is caught and normalized to one of:
- `PROVIDER_UNAVAILABLE`
- `SUMMARY_NOT_FOUND`
- `COUNT_FAILED`
- `PROJECT_SCOPE_REQUIRED`
- `PERMISSION_DENIED`
