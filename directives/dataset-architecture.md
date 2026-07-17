# Dataset Engine Architecture

This directive defines the modular data preparation engine architecture.

## Execution Flow
```text
ReportRequest
      │
      ▼
DatasetContext
      │
      ▼
DatasetValidator (structural / schema / metadata checks)
      │
      ▼
DatasetExecutionPlanner
      │
      ▼
DatasetExecutionPlan (topological batches and dependency graphs)
      │
      ▼
DatasetExecutionScheduler
      │
      ▼
DatasetPipeline (intercepts scheduler; applies middleware)
      │
 ┌────┼────┬─────┐
 ▼    ▼    ▼     ▼
Mid1 Mid2 Mid3  Mid4 (Middleware Interceptors)
 │    │    │     │
 └────┼────┴─────┘
      ▼
DatasetProviders (SalesSummary, LeadConversion)
      │
      ▼
ReportDataset (immutable data container and DatasetManifest metadata)
      │
      ▼
ReportComposer (composition input gateway)
```

## Deep Freezing Checkpoints
1. **Dataset Registry Entries**: Freeze provider structures on registration.
2. **Execution Plans**: Freeze `DatasetExecutionPlan` outputs.
3. **Fragment Outputs**: Freeze individual `DatasetFragment` outputs produced by providers.
4. **Final ReportDataset**: Deep freeze the completed `ReportDataset` containing manifest metadata before returning.
