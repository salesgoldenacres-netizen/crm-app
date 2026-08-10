import { useVirtualizer } from "@tanstack/react-virtual";
import type { VirtualizationEngine, VirtualizationOptions, VirtualItem } from "./VirtualizationEngine";

/**
 * TanStackVirtualEngine (Wave 8 Phase 2D)
 * Default virtualization engine implementation backed by @tanstack/react-virtual.
 * Swap this class to change the engine without touching any renderer or feature code.
 */
export class TanStackVirtualEngine implements VirtualizationEngine {
  private virtualizer: ReturnType<typeof useVirtualizer<HTMLElement, Element>> | null = null;

  constructor(virtualizer: ReturnType<typeof useVirtualizer<HTMLElement, Element>>) {
    this.virtualizer = virtualizer;
  }

  getVirtualItems(): VirtualItem[] {
    if (!this.virtualizer) return [];
    return this.virtualizer.getVirtualItems().map((item) => ({
      index: item.index,
      start: item.start,
      size: item.size,
      key: item.key,
      lane: item.lane,
    }));
  }

  getTotalSize(): number {
    return this.virtualizer?.getTotalSize() ?? 0;
  }

  scrollToIndex(index: number, options?: { align?: "start" | "center" | "end" | "auto" }): void {
    this.virtualizer?.scrollToIndex(index, options);
  }

  update(_options: VirtualizationOptions): void {
    // TanStack React Virtualizer is hook-driven; updates are triggered by re-renders.
  }
}

/**
 * Hook-based factory for TanStackVirtualEngine.
 * Must be called inside a React component.
 */
export function useTanStackVirtualEngine(
  options: VirtualizationOptions
): TanStackVirtualEngine {
  // eslint-disable-next-line react-hooks/incompatible-library -- Known third-party React Compiler compatibility advisory: TanStack Virtual's useVirtualizer returns functions on the instance that React Compiler skips memoizing by default. This wrapper isolates the third-party boundary.
  const virtualizer = useVirtualizer<HTMLElement, Element>({
    count: options.count,
    estimateSize: options.estimateSize,
    overscan: options.overscan ?? 10,
    getScrollElement: options.getScrollElement as () => HTMLElement | null,
  });
  return new TanStackVirtualEngine(virtualizer);
}
