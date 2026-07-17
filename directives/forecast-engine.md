# Forecast Engine

This directive describes the Forecast Engine boundary parameters.

## Responsibilities
- Validate input request boundaries (positive `horizon`, non-empty `series`).
- Locate and execute selected forecasting strategies.
- Compute final performance duration metrics (`executionDurationMs`).
- Prevent any direct mathematical calculations (all math belongs to the concrete `ForecastStrategy` implementations).
