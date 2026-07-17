# Dataset Providers

This directive defines standard dataset providers.

## Shipped Providers
- **SalesSummaryDatasetProvider**: Computes aggregate count of sales, average order sizes, and total revenue.
- **LeadConversionDatasetProvider**: Computes conversion ratios and tracks funnels. Has dependency on `SalesSummaryDatasetProvider` key.

## Rules
- Dataset providers must never import layout template or UI component files.
- All calculation states must remain pure and return deeply frozen outputs.
