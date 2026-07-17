// src/shared/services/reporting/dataset/providers/SalesSummaryDatasetProvider.ts
import { DatasetProvider, DatasetProviderMetadata } from "../contracts/DatasetProvider";
import { DatasetFragment } from "../contracts/DatasetFragment";
import { DatasetKey } from "../contracts/DatasetKey";

export interface SalesSummaryDataset extends DatasetFragment {
  readonly totalSalesCount: number;
  readonly aggregateRevenue: number;
  readonly averageOrderValue: number;
}

export const SalesSummaryDatasetKey: DatasetKey<SalesSummaryDataset> = {
  id: "sales-summary-dataset",
};

export class SalesSummaryDatasetProvider implements DatasetProvider<SalesSummaryDataset> {
  public readonly metadata: DatasetProviderMetadata = {
    id: "SalesSummaryDatasetProvider",
    version: "1.0.0",
    displayName: "Sales Summary Data Provider",
    outputKey: SalesSummaryDatasetKey,
    dependsOn: [],
    cacheability: { supportsCaching: true, ttlMs: 60000 },
    tags: ["sales", "revenue"],
  };

  public async provide(request: { report: any }): Promise<SalesSummaryDataset> {
    const rows = request.report.rows || [];
    
    let totalSalesCount = 0;
    let aggregateRevenue = 0;
    
    for (const row of rows) {
      if (typeof row.value === "number") {
        totalSalesCount++;
        aggregateRevenue += row.value;
      }
    }

    const averageOrderValue = totalSalesCount > 0 ? aggregateRevenue / totalSalesCount : 0;

    return Object.freeze({
      totalSalesCount,
      aggregateRevenue,
      averageOrderValue,
    });
  }
}
