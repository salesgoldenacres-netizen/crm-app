# Forecast Strategies

This directive outlines rules for mathematical forecasting strategies.

## Supported Strategies

1. **Moving Average Forecast Strategy**
   - Calculates the rolling arithmetic mean of the last $N$ valid observations.
   - Derives confidence score from the Coefficient of Variation ($CV = \frac{\sigma}{\mu}$).
   - Supports recursive multi-step extrapolation for horizons > 1.

2. **Linear Trend Forecast Strategy**
   - Fits an Ordinary Least Squares (OLS) regression line ($y = mx + b$).
   - Derives confidence from the Coefficient of Determination ($R^2$).
   - Classifies trend direction (`"up"`, `"down"`, or `"stable"`) based on the slope.
