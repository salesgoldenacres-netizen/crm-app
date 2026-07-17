# Scheduling Architecture (Wave 9 Phase 3)

This document diagrams the modular layout of the reporting scheduling and execution system:

```text
Trigger (Cron / Manual / Queue) ──> ScheduleService ──> JobRegistry ──> JobRunner ──> JobExecutor ──> Reporting & Export Services
```

- **ScheduleService**: Validates scheduling trigger definitions and configurations.
- **JobRegistry**: Implements registry maps to store definition contracts safely.
- **JobRunner**: Manages runtime statuses and uses `Clock` abstractions.
- **JobExecutor**: Encapsulates execution processes to avoid coupling definitions with run blocks.
- **Clock**: Decouples timestamp calculation for mock execution.
