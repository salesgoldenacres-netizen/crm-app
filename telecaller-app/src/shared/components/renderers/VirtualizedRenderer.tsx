import { useRef, useMemo } from "react";
import { DataTableProps } from "@/shared/components/DataTable";
import { useVirtualization } from "./virtualization/hooks/useVirtualization";
import { FixedRowHeightStrategy } from "./virtualization/strategies/FixedRowHeightStrategy";
import EmptyState from "@/shared/components/ui/EmptyState";

const DEFAULT_ROW_HEIGHT = 48;

export interface VirtualizedRendererProps<T> extends DataTableProps<T> {
  overscan?: number;
}

export default function VirtualizedRenderer<T>({
  columns,
  data,
  emptyMessage = "No records found.",
  selectedRowIds = [],
  onSelectionChange,
  getRowKey,
  density = "comfortable",
  overscan = 10,
}: VirtualizedRendererProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rowHeight = density === "compact" ? 36 : DEFAULT_ROW_HEIGHT;

  const strategy = useMemo(() => new FixedRowHeightStrategy(rowHeight), [rowHeight]);
  
  const { startIndex, endIndex, startPad, totalHeight } = useVirtualization({
    containerRef,
    totalItems: data.length,
    overscan,
    strategy,
  });

  if (data.length === 0) {
    return <EmptyState title="No records" description={emptyMessage} />;
  }

  const handleRowSelect = (rowId: string) => {
    if (!onSelectionChange) return;
    if (selectedRowIds.includes(rowId)) {
      onSelectionChange(selectedRowIds.filter((id) => id !== rowId));
    } else {
      onSelectionChange([...selectedRowIds, rowId]);
    }
  };

  // Generate the slice of data rows to display
  const visibleRows: Array<{ index: number; row: T }> = [];
  for (let i = startIndex; i <= endIndex && i < data.length; i++) {
    visibleRows.push({ index: i, row: data[i] });
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto w-full rounded-lg border border-theme-border"
      style={{ height: "600px", maxHeight: "80vh" }}
      role="grid"
      aria-rowcount={data.length}
    >
      {/* Sticky Header */}
      <div
        className="sticky top-0 z-10 grid bg-theme-surface border-b border-theme-border font-semibold text-theme-muted"
        style={{
          gridTemplateColumns: `${onSelectionChange ? "40px " : ""}${columns.map(() => "1fr").join(" ")}`,
          position: "sticky",
          top: 0,
        }}
        role="row"
      >
        {onSelectionChange && (
          <div className="px-3 py-3 flex items-center" role="columnheader">
            <input
              type="checkbox"
              className="rounded border-theme-border text-theme-accent focus:ring-theme-ring"
              checked={selectedRowIds.length === data.length && data.length > 0}
              onChange={(e) => {
                if (!onSelectionChange) return;
                onSelectionChange(
                  e.target.checked
                    ? data.map((row, i) => (getRowKey ? getRowKey(row) : String(i)))
                    : []
                );
              }}
              aria-label="Select all rows"
            />
          </div>
        )}
        {columns.map((col) => (
          <div
            key={col.key}
            className={`px-3 py-3 text-xs uppercase tracking-wide flex items-center ${col.headerClassName ?? ""}`}
            role="columnheader"
          >
            {col.header}
          </div>
        ))}
      </div>

      {/* Virtual Scroll Area */}
      <div
        style={{ height: `${totalHeight}px`, position: "relative" }}
        role="rowgroup"
        aria-label="Virtualized rows"
      >
        {visibleRows.map(({ index, row }) => {
          const rowId = getRowKey ? getRowKey(row) : String(index);
          const isSelected = selectedRowIds.includes(rowId);

          return (
            <div
              key={rowId}
              role="row"
              aria-rowindex={index + 1}
              aria-selected={isSelected}
              className={`grid border-b border-theme-border transition-colors ${
                isSelected ? "bg-theme-accent/5" : "hover:bg-theme-hover"
              }`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${rowHeight}px`,
                transform: `translateY(${startPad + (index - startIndex) * rowHeight}px)`,
                gridTemplateColumns: `${onSelectionChange ? "40px " : ""}${columns.map(() => "1fr").join(" ")}`,
              }}
            >
              {onSelectionChange && (
                <div className="px-3 flex items-center" role="gridcell">
                  <input
                    type="checkbox"
                    className="rounded border-theme-border text-theme-accent focus:ring-theme-ring"
                    checked={isSelected}
                    onChange={() => handleRowSelect(rowId)}
                    aria-label={`Select row ${index + 1}`}
                  />
                </div>
              )}
              {columns.map((col) => (
                <div
                  key={col.key}
                  className={`px-3 flex items-center text-sm text-theme-text ${col.className ?? ""}`}
                  role="gridcell"
                >
                  {col.render
                    ? col.render(row, index)
                    : String((row as Record<string, unknown>)[col.key] ?? "")}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
