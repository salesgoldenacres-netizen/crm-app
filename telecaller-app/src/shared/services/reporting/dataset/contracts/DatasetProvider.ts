// src/shared/services/reporting/dataset/contracts/DatasetProvider.ts
import { DatasetFragment } from "./DatasetFragment";
import { DatasetKey } from "./DatasetKey";
import { DatasetContext } from "./DatasetContext";
import { Report } from "../../contracts/Report";

export interface DatasetProviderMetadata {
  readonly id: string;
  readonly version: string;
  readonly displayName: string;
  readonly outputKey: DatasetKey<DatasetFragment>;
  readonly dependsOn: readonly DatasetKey<DatasetFragment>[];
  readonly cacheability: {
    readonly supportsCaching: boolean;
    readonly ttlMs?: number;
  };
  readonly tags: readonly string[];
}

export interface DatasetProviderRequest {
  readonly report: Report<unknown>;
  readonly context: DatasetContext;
}

export interface DatasetProvider<TFragment extends DatasetFragment = DatasetFragment> {
  readonly metadata: DatasetProviderMetadata;
  provide(request: DatasetProviderRequest): Promise<TFragment>;
}
