import React from "react";
import { ColumnDef } from "@/shared/components/DataTable";
import Card from "./Card";
import Checkbox from "./Checkbox";
import EmptyState from "./EmptyState";

export interface MobileCardListProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  selectedRowIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  getRowKey?: (row: T) => string;
  emptyMessage?: string;
}

/**
 * MobileCardList Primitive (Wave 8 Phase 2B)
 * Presentation-only component that mirrors DataTable on mobile viewports.
 * Strictly layout-focused; zero business logic or domain awareness.
 */
export default function MobileCardList<T>({
  columns,
  data,
  selectedRowIds = [],
  onSelectionChange,
  getRowKey,
  emptyMessage = "No records found.",
}: MobileCardListProps<T>) {
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

  return (
    <div className="space-y-4 px-4 py-2">
      {data.map((row, rowIndex) => {
        const rowId = getRowKey ? getRowKey(row) : String(rowIndex);
        const isSelected = selectedRowIds.includes(rowId);
        
        // Use first column as the primary title
        const primaryCol = columns[0];
        const detailCols = columns.slice(1);

        return (
          <Card
            key={rowId}
            className={`border shadow-sm transition-all relative ${
              isSelected ? "border-theme-accent bg-theme-accent/5" : "border-theme-border"
            }`}
          >
            <div className="flex items-start gap-3">
              {onSelectionChange && (
                <div className="pt-1 select-none">
                  <Checkbox
                    id={`select-card-${rowId}`}
                    checked={isSelected}
                    onChange={() => handleToggleRow(rowId)}
                    aria-label={`Select item`}
                  />
                </div>
              )}

              <div className="flex-1 min-w-0">
                {/* Primary Card Title */}
                {primaryCol && (
                  <div className="text-sm font-semibold text-theme-text mb-3 flex items-center justify-between gap-2">
                    <span className="truncate">
                      {primaryCol.render ? primaryCol.render(row, rowIndex) : String((row as any)[primaryCol.key] ?? "")}
                    </span>
                  </div>
                )}

                {/* Attribute Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {detailCols.map((col) => {
                    const value = col.render
                      ? col.render(row, rowIndex)
                      : String((row as any)[col.key] ?? "");

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
        );
      })}
    </div>
  );
}
