// src/shared/components/renderers/virtualization/contracts/RowHeightStrategy.ts
export interface RowHeightStrategy {
  getHeight(index: number): number;
}
