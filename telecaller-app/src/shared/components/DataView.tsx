import { DataTableProps } from "./DataTable";
import RendererFactory, { RendererConfiguration } from "./renderers/RendererFactory";

export interface DataViewProps<T> extends DataTableProps<T> {
  config: RendererConfiguration;
}

export default function DataView<T>({
  config,
  ...tableProps
}: DataViewProps<T>) {
  return <RendererFactory config={config} {...tableProps} />;
}
