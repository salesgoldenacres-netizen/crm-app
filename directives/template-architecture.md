# Template Architecture

This directive defines the modular template composition architecture.

## Architecture Blueprint
```text
ReportTemplate
      │
      ▼
TemplateValidator (structural and loop dependency validator)
      │
      ▼
CompositionExecutionPlanner
      │
      ▼
ExecutionPlan (immutable dependency batches)
      │
      ▼
CompositionPipeline (stages execution and hooks)
      │
 ┌────┼────┬─────┐
 ▼    ▼    ▼     ▼
Hooks Provider Cache Validator
 │    │    │     │
 └────┼────┴─────┘
      ▼
SectionBuilders (Header, Summary, Metrics, Forecast, Footer)
      │
      ▼
ReportComposer (builds manifest, sorts, and deep-freezes ComposedReport)
      │
      ▼
DocumentTransformationService (one-way mapping to RenderableDocument)
      │
      ▼
RenderableDocument
```

## Immutable Deep Freeze Checkpoints
1. **Template Load**: Freeze template immediately when entering registry.
2. **Planner Output**: Freeze the resolved `ExecutionPlan` batches.
3. **Section Outputs**: Freeze generated `ReportSection` output.
4. **Composer Output**: Deep freeze `ComposedReport` before returning.
5. **Transformation Output**: Deep freeze `RenderableDocument` target.
