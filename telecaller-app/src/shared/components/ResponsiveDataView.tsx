import { DataTableProps } from "./DataTable";
import DataView from "./DataView";
import { RendererConfiguration } from "./renderers/RendererFactory";

export interface ResponsiveDataViewProps<T> extends DataTableProps<T> {
  virtualization?: "auto" | "always" | "never";
  virtualizationThreshold?: number;
  overscan?: number;
}

/**
 * ResponsiveDataView (Wave 8 Phase 2D-A)
 * 
 * Preserves the exact same public API contract as Wave 8 Phase 2B/2C.
 * Feeds configuration rules strictly to the underlying DataView component.
 */
export default function ResponsiveDataView<T>({
  virtualization = "auto",
  virtualizationThreshold,
  overscan,
  ...props
}: ResponsiveDataViewProps<T>) {
  const desktopConfig: RendererConfiguration = {
    mode: "desktop",
    virtualization,
    virtualizationThreshold,
    overscan,
  };

  const mobileConfig: RendererConfiguration = {
    mode: "mobile",
    virtualization: "never",
  };

  return (
    <div className="w-full">
      {/* Desktop/Tablet Viewport */}
      <div className="hidden md:block">
        <DataView
          config={desktopConfig}
          {...props}
        />
      </div>

      {/* Mobile Viewport */}
      <div className="block md:hidden">
        <DataView
          config={mobileConfig}
          {...props}
        />
      </div>
    </div>
  );
}
