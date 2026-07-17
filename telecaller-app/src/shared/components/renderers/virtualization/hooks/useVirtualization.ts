// src/shared/components/renderers/virtualization/hooks/useVirtualization.ts
import { useState, useEffect, useMemo, RefObject } from "react";
import { VirtualRange } from "../contracts/VirtualRange";
import { RowHeightStrategy } from "../contracts/RowHeightStrategy";
import { DefaultVirtualizationEngine } from "../DefaultVirtualizationEngine";

export interface UseVirtualizationOptions {
  containerRef: RefObject<HTMLElement | null>;
  totalItems: number;
  overscan: number;
  strategy: RowHeightStrategy;
}

export function useVirtualization({
  containerRef,
  totalItems,
  overscan,
  strategy,
}: UseVirtualizationOptions): VirtualRange {
  const [scrollTop, setScrollTop] = useState(0);
  const [clientHeight, setClientHeight] = useState(0);

  const engine = useMemo(() => new DefaultVirtualizationEngine(), []);

  // Update scroll height and client height
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      setScrollTop(el.scrollTop);
    };

    // Initialize values
    setScrollTop(el.scrollTop);
    setClientHeight(el.clientHeight);

    el.addEventListener("scroll", handleScroll, { passive: true });

    // Handle container resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setClientHeight(entry.contentRect.height || el.clientHeight);
      }
    });
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [containerRef, totalItems]);

  return useMemo(() => {
    return engine.calculateRange(scrollTop, clientHeight, totalItems, overscan, strategy);
  }, [engine, scrollTop, clientHeight, totalItems, overscan, strategy]);
}
