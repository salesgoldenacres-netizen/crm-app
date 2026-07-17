// src/shared/services/reporting/dataset/contracts/DatasetKey.ts
import { DatasetFragment } from "./DatasetFragment";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface DatasetKey<_TFragment extends DatasetFragment> {
  readonly id: string;
}
