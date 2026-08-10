import { useRef, useMemo } from "react";
import { DataTableProps } from "@/shared/components/DataTable";
import Card from "@/shared/components/ui/Card";
import Checkbox from "@/shared/components/ui/Checkbox";
import EmptyState from "@/shared/components/ui/EmptyState";
import { useVirtualization } from "./virtualization/hooks/useVirtualization";
import { FixedRowHeightStrategy } from "./virtualization/strategies/FixedRowHeightStrategy";

/** Estimated card height (px) used for fixed-height windowing on mobile. */
const DEFAULT_MOBILE_CARD_HEIGHT = 168;

export interface VirtualizedMobileCardRendererProps<T> extends DataTableProps<T> {
  overscan?: number;
  /** Fixed card height estimate for windowing math (cards share columns → ~uniform). */
  estimatedRowHeight?: number;
}

/**
 * VirtualizedMobileCardRenderer (F-3)
 *
 * Windowed variant of MobileCardList for large mobile datasets. Uses the shared
 * fixed-height virtualization engine so only the visible slice of cards mounts.
 * Only engaged above ResponsiveDataView's mobile virtualization threshold, so
 * ordinary small mobile lists keep the simpler non-virtualized layout.
 */
export default function VirtualizedMobileCardRenderer<T>({
  columns,
  data,
  selectedRowIds = [],
  onSelectionChange,
  getRowKey,
  emptyMessage = "No records found.",
  overscan = 6,
  estimatedRowHeight = DEFAULT_MOBILE_CARD_HEIGHT,
}: VirtualizedMobileCardRendererProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);

  const strategy = useMemo(
    () => new FixedRowHeightStrategy(estimatedRowHeight),
    [estimatedRowHeight]
  );

  const { startIndex, endIndex, startPad, totalHeight } = useVirtualization({
    containerRef,
    totalItems: data.length,
    overscan,
    strategy,
  });

  if (data.length === 0) {
    return <EmptyState title="No records" description={emptyMessage} />;
  }

  const handleToggleRow = (rowId: string) => {
    if (!onSelectionChange) return;
    if (selectedRowIds.includes(rowId)) {
      onSelectionChange(selectedRowIds.filter((id) => id !== rowId));
    } else {
      onSelectionChange([...selectedRowIds, rowId]);
    }
  };

  const visibleRows: Array<{ index: number; row: T }> = [];
  for (let i = startIndex; i <= endIndex && i < data.length; i++) {
    visibleRows.push({ index: i, row: data[i] });
  }

  const primaryCol = columns[0];
  const detailCols = columns.slice(1);

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto w-full"
      style={{ height: "70vh" }}
      role="list"
      aria-rowcount={data.length}
    >
      <div style={{ height: `${totalHeight}px`, position: "relative" }}>
        {visibleRows.map(({ index, row }) => {
          const rowId = getRowKey ? getRowKey(row) : String(index);
          const isSelected = selectedRowIds.includes(rowId);

          return (
            <div
              key={rowId}
              role="listitem"
              className="px-4"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${startPad + (index - startIndex) * estimatedRowHeight}px)`,
                paddingBottom: "1rem",
              }}
            >
              <Card
                className={`border shadow-sm transition-all relative ${
                  isSelected
                    ? "border-theme-accent bg-theme-accent/5"
                    : "border-theme-border"
                }`}
              >
                <div className="flex items-start gap-3">
                  {onSelectionChange && (
                    <div className="pt-1 select-none">
                      <Checkbox
                        id={`select-vcard-${rowId}`}
                        checked={isSelected}
                        onChange={() => handleToggleRow(rowId)}
                        aria-label="Select item"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {primaryCol && (
                      <div className="text-sm font-semibold text-theme-text mb-3 flex items-center justify-between gap-2">
                        <span className="truncate">
                          {primaryCol.render
                            ? primaryCol.render(row, index)
                            : String((row as Record<string, unknown>)[primaryCol.key] ?? "")}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {detailCols.map((col) => {
                        const value = col.render
                          ? col.render(row, index)
                          : String((row as Record<string, unknown>)[col.key] ?? "");

                        return (
                          <div key={col.key} className="flex flex-col gap-0.5">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-theme-muted">
                              {col.header}
                            </span>
                            <div className="text-theme-text font-medium truncate">
                              {value}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
