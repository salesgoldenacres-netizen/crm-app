// src/shared/services/reporting/dataset/DatasetProviderRegistry.ts
import { DatasetKey } from "./contracts/DatasetKey";
import { DatasetFragment } from "./contracts/DatasetFragment";
import { DatasetProvider } from "./contracts/DatasetProvider";
import { SalesSummaryDatasetProvider, SalesSummaryDatasetKey } from "./providers/SalesSummaryDatasetProvider";
import { LeadConversionDatasetProvider, LeadConversionDatasetKey } from "./providers/LeadConversionDatasetProvider";

export class DatasetProviderRegistry {
  private providers = new Map<string, DatasetProvider>();

  public register(key: DatasetKey<DatasetFragment>, provider: DatasetProvider): void {
    if (this.providers.has(key.id)) {
      throw new Error(`[DatasetProviderRegistry] Provider with key id ${key.id} is already registered.`);
    }
    this.providers.set(key.id, provider);
  }

  public getProvider(key: DatasetKey<DatasetFragment>): DatasetProvider | undefined {
    return this.providers.get(key.id);
  }

  public clear(): void {
    this.providers.clear();
  }
}

const defaultProviderRegistry = new DatasetProviderRegistry();
defaultProviderRegistry.register(SalesSummaryDatasetKey, new SalesSummaryDatasetProvider());
defaultProviderRegistry.register(LeadConversionDatasetKey, new LeadConversionDatasetProvider());

export default defaultProviderRegistry;
export { defaultProviderRegistry as datasetProviderRegistry };
