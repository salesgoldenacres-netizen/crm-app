// src/shared/components/renderers/virtualization/contracts/VirtualizationEngine.ts
import { RowHeightStrategy } from "./RowHeightStrategy";
import { VirtualRange } from "./VirtualRange";

export interface VirtualizationEngine {
  calculateRange(
    scrollTop: number,
    clientHeight: number,
    totalItems: number,
    overscan: number,
    strategy: RowHeightStrategy
  ): VirtualRange;
}
