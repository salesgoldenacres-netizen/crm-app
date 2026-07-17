# Forecasting Architecture

This directive defines the modular forecasting subsystem design.

## Core Hierarchy
```text
Report
   │
   ▼
MetricSeriesExtractor (groups, sorts chronologically, filters NaN/Infinity)
   │
   ▼
MetricSeries (exposes unit & source tags)
   │
   ▼
ForecastService (facade entry point)
   │
   ▼
ForecastEngine (validates request & handles strategy timings)
   │
   ▼
ForecastStrategyRegistry (runtime strategy storage)
   │
   ▼
ForecastStrategy (pure mathematical strategies: Moving Average, Linear Trend)
```

## Architecture Principles
1. **Mathematical Isolation**: Calculations are exclusively performed inside strategies.
2. **Report Decoupling**: Strategies only inspect normalized `MetricSeries`, never report rows or DOM schemas.
3. **Immutability**: All inputs and result payloads remain strictly read-only.
