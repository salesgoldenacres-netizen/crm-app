# Migration Framework

This directive details declarative migration rules.

## Processing Sequence
1. **Migration planning**: `MigrationPlanner` verifies available migration definitions to construct sequential upgrade paths (`MigrationPlan`).
2. **Execution loop**: `MigrationPipeline` executes the plan steps sequentially.
3. **Execution Records**: `MigrationResult` captures timings, skipped steps, warnings, and final resolved version.
