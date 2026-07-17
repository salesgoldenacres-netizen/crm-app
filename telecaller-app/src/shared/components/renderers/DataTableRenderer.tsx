import DataTable, { DataTableProps } from "@/shared/components/DataTable";

/**
 * DataTableRenderer (Wave 8 Phase 2D)
 * Thin adapter delegating to the canonical DataTable primitive.
 * Zero behaviour change — this is purely an adapter for RendererFactory.
 */
export default function DataTableRenderer<T>(props: DataTableProps<T>) {
  return <DataTable {...props} />;
}
