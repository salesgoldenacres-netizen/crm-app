# Schedule Service (Wave 9 Phase 3)

`ScheduleService` Coordinates schedule definitions:

- Registers schedule trigger structures (cron, manual, queue).
- Exposes readonly definitions.
- Triggers jobs safely, checking enabled state.
