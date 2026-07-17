# Job Runner & Executor (Wave 9 Phase 3)

Runnable components:

- **JobRunner**: Manages the running execution state maps, tracking timestamps, statuses, and custom failure strings.
- **JobExecutor**: Coordinates service APIs. Responsible for wrapping the generated records inside Csv/Excel documents and invoking `ExportService`.
