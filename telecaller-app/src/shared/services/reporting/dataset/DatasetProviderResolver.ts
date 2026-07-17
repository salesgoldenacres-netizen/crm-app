// src/shared/services/reporting/dataset/DatasetProviderResolver.ts
import { DatasetProviderRegistry, datasetProviderRegistry } from "./DatasetProviderRegistry";
import { DatasetProvider } from "./contracts/DatasetProvider";
import { DatasetKey } from "./contracts/DatasetKey";
import { DatasetFragment } from "./contracts/DatasetFragment";
import { ProviderNotFoundError } from "./DatasetErrors";

export class DatasetProviderResolver {
  constructor(private readonly registry: DatasetProviderRegistry = datasetProviderRegistry) {}

  public resolve(key: DatasetKey<DatasetFragment>): DatasetProvider {
    const provider = this.registry.getProvider(key);
    if (!provider) {
      throw new ProviderNotFoundError(`[DatasetProviderResolver] DatasetProvider for key ${key.id} could not be resolved.`);
    }
    return provider;
  }
}
