// src/shared/services/reporting/dataset/providers/LeadConversionDatasetProvider.ts
import { DatasetProvider, DatasetProviderMetadata } from "../contracts/DatasetProvider";
import { DatasetFragment } from "../contracts/DatasetFragment";
import { DatasetKey } from "../contracts/DatasetKey";
import { SalesSummaryDatasetKey } from "./SalesSummaryDatasetProvider";

export interface LeadConversionDataset extends DatasetFragment {
  readonly conversionRate: number;
  readonly conversionFunnel: {
    readonly rawLeads: number;
    readonly successfulConversions: number;
  };
}

export const LeadConversionDatasetKey: DatasetKey<LeadConversionDataset> = {
  id: "lead-conversion-dataset",
};

export class LeadConversionDatasetProvider implements DatasetProvider<LeadConversionDataset> {
  public readonly metadata: DatasetProviderMetadata = {
    id: "LeadConversionDatasetProvider",
    version: "1.0.0",
    displayName: "Lead Conversion Data Provider",
    outputKey: LeadConversionDatasetKey,
    dependsOn: [SalesSummaryDatasetKey],
    cacheability: { supportsCaching: true, ttlMs: 30000 },
    tags: ["conversion", "leads"],
  };

  public async provide(request: { report: any }): Promise<LeadConversionDataset> {
    const rows = request.report.rows || [];
    const rawLeads = rows.length;

    const successfulConversions = rows.filter((r: any) => r.metric === "Active Leads").length;
    const conversionRate = rawLeads > 0 ? successfulConversions / rawLeads : 0;

    return Object.freeze({
      conversionRate,
      conversionFunnel: {
        rawLeads,
        successfulConversions,
      },
    });
  }
}
