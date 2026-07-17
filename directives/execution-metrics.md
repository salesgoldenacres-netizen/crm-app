# Execution Metrics

Telemetry metrics gathered during the execution pipeline:

- **Total Duration (`totalDurationMs`)**: Full end-to-end pipeline run time.
- **Export Duration (`exportDurationMs`)**: Time elapsed formatting and serializing report document bodies.
- **Delivery Duration (`deliveryDurationMs`)**: Time elapsed exporting to delivery providers.
- **Execution Duration (`executionDurationMs`)**: Core logic processing duration (`totalDurationMs - exportDurationMs - deliveryDurationMs`).
