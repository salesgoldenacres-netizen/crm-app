// src/shared/components/renderers/virtualization/DefaultVirtualizationEngine.ts
import { VirtualizationEngine } from "./contracts/VirtualizationEngine";
import { RowHeightStrategy } from "./contracts/RowHeightStrategy";
import { VirtualRange } from "./contracts/VirtualRange";

export class DefaultVirtualizationEngine implements VirtualizationEngine {
  calculateRange(
    scrollTop: number,
    clientHeight: number,
    totalItems: number,
    overscan: number,
    strategy: RowHeightStrategy
  ): VirtualRange {
    // Handle empty data or layout limits gracefully
    if (totalItems <= 0 || clientHeight <= 0) {
      return { startIndex: 0, endIndex: 0, startPad: 0, totalHeight: 0 };
    }

    // Clamp negative scrollTop values (e.g. iOS elastic bounce)
    const safeScrollTop = Math.max(0, scrollTop);

    let currentOffset = 0;
    let startIndex = 0;

    // Find the first visible index
    for (let i = 0; i < totalItems; i++) {
      const h = strategy.getHeight(i);
      if (currentOffset + h > safeScrollTop) {
        startIndex = i;
        break;
      }
      currentOffset += h;
    }

    // Accumulate total height of the scrollable list
    let totalHeight = 0;
    for (let i = 0; i < totalItems; i++) {
      totalHeight += strategy.getHeight(i);
    }

    // Find the last visible index
    let endIndex = startIndex;
    let visibleHeight = 0;
    for (let i = startIndex; i < totalItems; i++) {
      visibleHeight += strategy.getHeight(i);
      endIndex = i;
      if (currentOffset + visibleHeight >= safeScrollTop + clientHeight) {
        break;
      }
    }

    // Apply overscan with clamping boundaries
    const startOverscan = Math.max(0, startIndex - overscan);
    const endOverscan = Math.min(totalItems - 1, endIndex + overscan);

    // Calculate start padding (height of all items before the overscanned start index)
    let startPad = 0;
    for (let i = 0; i < startOverscan; i++) {
      startPad += strategy.getHeight(i);
    }

    return {
      startIndex: startOverscan,
      endIndex: endOverscan,
      startPad,
      totalHeight,
    };
  }
}
