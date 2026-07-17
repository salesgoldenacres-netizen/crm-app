# Dataset Pipeline

This directive defines execution rules for dataset pipelines and middleware.

## Middleware Execution
- Middleware must implement the `DatasetMiddleware` contract.
- Interceptors wrap provider execution:
```typescript
async execute(ctx: DatasetMiddlewareContext, next: DatasetMiddlewareNext): Promise<DatasetFragment>
```
- Each middleware executes `next()` to propagate down the pipeline chain.
- Middleware handles cross-cutting concerns: profiling durations, logging telemetry, and cancellation checks.
