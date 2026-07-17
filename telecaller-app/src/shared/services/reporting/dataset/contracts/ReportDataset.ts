// src/shared/services/reporting/dataset/contracts/ReportDataset.ts
import { DatasetFragment } from "./DatasetFragment";
import { DatasetKey } from "./DatasetKey";
import { DatasetManifest } from "./DatasetManifest";

export interface ReportDataset {
  readonly manifest: DatasetManifest;
  get<T extends DatasetFragment>(key: DatasetKey<T>): T;
  tryGet<T extends DatasetFragment>(key: DatasetKey<T>): T | undefined;
  has(key: DatasetKey<unknown>): boolean;
  fragments(): readonly DatasetKey<DatasetFragment>[];
}
