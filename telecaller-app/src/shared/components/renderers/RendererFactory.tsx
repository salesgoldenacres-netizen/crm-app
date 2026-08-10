import DataTableRenderer from "./DataTableRenderer";
import VirtualizedRenderer from "./VirtualizedRenderer";
import MobileCardRenderer from "./MobileCardRenderer";
import VirtualizedMobileCardRenderer from "./VirtualizedMobileCardRenderer";
import { VirtualizationErrorBoundary } from "./VirtualizationErrorBoundary";
import { DataTableProps } from "../DataTable";

export interface RendererConfiguration {
  mode: "desktop" | "mobile";
  virtualization: "auto" | "always" | "never";
  overscan?: number;
  virtualizationThreshold?: number;
}

export const DEFAULT_RENDERER_CONFIGURATION: Required<Omit<RendererConfiguration, "mode">> = {
  virtualization: "auto",
  virtualizationThreshold: 100,
  overscan: 10,
};

export interface RendererFactoryProps<T> extends DataTableProps<T> {
  config: RendererConfiguration;
}

export default function RendererFactory<T>({
  config,
  data,
  ...tableProps
}: RendererFactoryProps<T>) {
  const mode = config.mode;
  const virtualization = config.virtualization;
  const threshold = config.virtualizationThreshold ?? DEFAULT_RENDERER_CONFIGURATION.virtualizationThreshold;
  const overscan = config.overscan ?? DEFAULT_RENDERER_CONFIGURATION.overscan;

  const shouldVirtualize =
    virtualization === "always" ||
    (virtualization === "auto" && data.length >= threshold);

  if (mode === "mobile") {
    // Mobile card lists window only above the configured threshold (F-3); small
    // lists keep the simpler non-virtualized card layout.
    if (shouldVirtualize) {
      return (
        <VirtualizationErrorBoundary data={data} {...tableProps}>
          <VirtualizedMobileCardRenderer data={data} overscan={overscan} {...tableProps} />
        </VirtualizationErrorBoundary>
      );
    }
    return <MobileCardRenderer data={data} {...tableProps} />;
  }

  if (shouldVirtualize) {
    return (
      <VirtualizationErrorBoundary data={data} {...tableProps}>
        <VirtualizedRenderer data={data} overscan={overscan} {...tableProps} />
      </VirtualizationErrorBoundary>
    );
  }

  return <DataTableRenderer data={data} {...tableProps} />;
}
