// src/shared/components/renderers/virtualization/strategies/FixedRowHeightStrategy.ts
import { RowHeightStrategy } from "../contracts/RowHeightStrategy";

export class FixedRowHeightStrategy implements RowHeightStrategy {
  constructor(private readonly rowHeight: number) {
    if (rowHeight <= 0) {
      throw new Error("Row height must be greater than zero");
    }
  }

  getHeight(_index: number): number {
    return this.rowHeight;
  }
}
