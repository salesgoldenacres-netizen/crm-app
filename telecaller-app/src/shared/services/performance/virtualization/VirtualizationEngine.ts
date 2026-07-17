/**
 * VirtualizationEngine Interface (Wave 8 Phase 2D)
 * Pluggable engine contract. TanStack Virtual is the default implementation.
 * Future engines (react-window, custom) can be swapped without touching renderers.
 */

export interface VirtualItem {
  index: number;
  start: number;
  size: number;
  key: string | number | bigint;
  lane: number;
}

export interface VirtualizationOptions {
  count: number;
  estimateSize: (index: number) => number;
  overscan?: number;
  getScrollElement: () => HTMLElement | null;
}

export interface VirtualizationEngine {
  /** All currently virtualized (visible + overscan) items. */
  getVirtualItems(): VirtualItem[];
  /** Total scrollable height/width in pixels. */
  getTotalSize(): number;
  /** Scroll a specific index into view. */
  scrollToIndex(index: number, options?: { align?: "start" | "center" | "end" | "auto" }): void;
  /** Notify the engine when options change. */
  update(options: VirtualizationOptions): void;
}
