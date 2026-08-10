import { DataTableProps } from "./DataTable";
import DataView from "./DataView";
import { RendererConfiguration } from "./renderers/RendererFactory";

export interface ResponsiveDataViewProps<T> extends DataTableProps<T> {
  virtualization?: "auto" | "always" | "never";
  virtualizationThreshold?: number;
  overscan?: number;
  /**
   * Mobile card-list virtualization policy (F-3). Defaults to "auto" so large
   * mobile lists window automatically, but only above
   * `mobileVirtualizationThreshold` — small lists stay non-virtualized.
   */
  mobileVirtualization?: "auto" | "always" | "never";
  mobileVirtualizationThreshold?: number;
}

/** Conservative default: only window mobile card lists once they get large. */
const DEFAULT_MOBILE_VIRTUALIZATION_THRESHOLD = 80;

/**
 * ResponsiveDataView (Wave 8 Phase 2D-A)
 * 
 * Preserves the same public API contract as Wave 8 Phase 2B/2C (extended with
 * opt-in mobile virtualization). Feeds configuration rules strictly to the
 * underlying DataView component.
 */
export default function ResponsiveDataView<T>({
  virtualization = "auto",
  virtualizationThreshold,
  overscan,
  mobileVirtualization = "auto",
  mobileVirtualizationThreshold = DEFAULT_MOBILE_VIRTUALIZATION_THRESHOLD,
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
    virtualization: mobileVirtualization,
    virtualizationThreshold: mobileVirtualizationThreshold,
    overscan,
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
