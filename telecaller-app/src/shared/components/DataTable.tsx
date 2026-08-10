import React, { useState, useMemo } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import Button from "./ui/Button";
import EmptyState from "./ui/EmptyState";
import FilterSearchInput from "./FilterSearchInput";

export interface ColumnDef<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  searchQuery?: string;
  searchFields?: string[];
  pageSize?: number;
  defaultSort?: { key: string; direction: "asc" | "desc" };
  emptyMessage?: string;
  className?: string;
  rowClassName?: (row: T, index: number) => string;

  // Checkbox Selection
  selectedRowIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  getRowKey?: (row: T) => string;

  // Toolbar & Search options
  enableSearch?: boolean;
  searchPlaceholder?: string;

  // CSV Export
  enableCsvExport?: boolean;
  csvFilename?: string;

  /** Row density — optional; defaults to comfortable (48px). Does not change APIs. */
  density?: "comfortable" | "compact";
}

const CHECKBOX_CLASS =
  "rounded border-theme-border text-theme-accent focus:ring-theme-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring cursor-pointer";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring";

export default function DataTable<T>({
  columns,
  data,
  searchQuery: externalSearchQuery,
  searchFields = [],
  pageSize,
  defaultSort,
  emptyMessage = "No records found.",
  className = "",
  rowClassName,
  selectedRowIds,
  onSelectionChange,
  getRowKey,
  enableSearch = false,
  searchPlaceholder = "Search...",
  enableCsvExport = false,
  csvFilename = "export",
  density = "comfortable",
}: DataTableProps<T>) {
  const isCompact = density === "compact";
  const rowHeightClass = isCompact ? "h-10" : "h-12";
  const cellPadClass = isCompact ? "px-3" : "px-6";
  const checkboxPadClass = isCompact ? "px-2" : "px-4";

  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(
    defaultSort || null
  );

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Internal Search State (if externalSearchQuery is not supplied)
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const activeSearchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;

  // Handle Header Sort Click
  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    setSortConfig((prev) => {
      if (prev && prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
    });
    setCurrentPage(1);
  };

  // 1. Apply Filtering
  const filteredData = useMemo(() => {
    if (!activeSearchQuery || searchFields.length === 0) return data;
    const query = activeSearchQuery.toLowerCase().trim();

    return data.filter((item) => {
      const record = item as Record<string, unknown>;
      return searchFields.some((field) => {
        const val = record[field];
        if (val === undefined || val === null) return false;
        return String(val).toLowerCase().includes(query);
      });
    });
  }, [data, activeSearchQuery, searchFields]);

  // 2. Apply Sorting
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      let valA: unknown = (a as Record<string, unknown>)[sortConfig.key];
      let valB: unknown = (b as Record<string, unknown>)[sortConfig.key];

      // Safe fallback/conversions
      if (valA === undefined || valA === null) valA = "";
      if (valB === undefined || valB === null) valB = "";

      if (typeof valA === "string") {
        const strB = valB as string;
        return sortConfig.direction === "asc"
          ? valA.localeCompare(strB)
          : strB.localeCompare(valA);
      } else {
        const numA = valA as number;
        const numB = valB as number;
        return sortConfig.direction === "asc"
          ? (numA > numB ? 1 : -1)
          : (numB > numA ? 1 : -1);
      }
    });

    return sorted;
  }, [filteredData, sortConfig]);

  // 3. Apply Pagination
  const paginatedData = useMemo(() => {
    if (!pageSize) return sortedData;
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = pageSize ? Math.ceil(sortedData.length / pageSize) : 1;

  // Selection logic helper
  const allIds = useMemo(() => {
    return sortedData.map((row) =>
      getRowKey ? getRowKey(row) : String((row as Record<string, unknown>).id ?? "")
    );
  }, [sortedData, getRowKey]);

  const allSelected = useMemo(() => {
    if (allIds.length === 0) return false;
    return allIds.every((id) => selectedRowIds?.includes(id));
  }, [allIds, selectedRowIds]);

  const handleSelectAllToggle = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange(allIds);
    } else {
      onSelectionChange([]);
    }
  };

  // CSV Export Trigger
  const handleExportCSV = () => {
    if (sortedData.length === 0) return;
    const headers = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(",");
    const rows = sortedData.map((row) => {
      return columns
        .map((col) => {
          const rawVal = (row as Record<string, unknown>)[col.key];
          const val = rawVal !== undefined && rawVal !== null ? String(rawVal) : "";
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(",");
    });

    const csvString = [headers, ...rows].join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${csvFilename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`flex flex-col w-full gap-3 ${className}`}>
      {/* Toolbar Controls — Density: 48px */}
      {(enableSearch || enableCsvExport) && (
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 min-h-12">
          {enableSearch && (
            <FilterSearchInput
              className="flex-grow sm:flex-grow-0 w-full sm:w-64"
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder || "Search table"}
              value={activeSearchQuery}
              onChange={(next) => {
                if (externalSearchQuery === undefined) {
                  setInternalSearchQuery(next);
                }
                setCurrentPage(1);
              }}
            />
          )}
          {enableCsvExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className={`flex items-center gap-1.5 px-3 h-10 text-xs font-semibold md:ml-auto rounded-theme ${FOCUS_RING}`}
            >
              <Download className="w-4 h-4 text-theme-accent" aria-hidden />
              <span>Export CSV</span>
            </Button>
          )}
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto rounded-theme border border-theme-border bg-theme-card shadow-elevation-sm transition-colors duration-300">
        <table className="min-w-full divide-y divide-theme-border text-xs sm:text-sm">
          <thead className="bg-theme-surface sticky top-0 z-20 shadow-sm">
            <tr className="h-11">
              {/* Checkbox column */}
              {onSelectionChange && (
                <th className={`w-10 ${checkboxPadClass} text-left align-middle`}>
                  <input
                    type="checkbox"
                    className={CHECKBOX_CLASS}
                    checked={allSelected}
                    onChange={(e) => handleSelectAllToggle(e.target.checked)}
                    aria-label="Select all rows"
                  />
                </th>
              )}

              {columns.map((col) => {
                const isSortedCol = sortConfig && sortConfig.key === col.key;
                const headerLabelClass = isSortedCol
                  ? "text-theme-text"
                  : "text-theme-muted";

                return (
                  <th
                    key={col.key}
                    className={`${cellPadClass} text-left align-middle select-none ${col.headerClassName || ""}`}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.key, true)}
                        className={`inline-flex items-center gap-1 type-label text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider bg-transparent border-0 p-0 cursor-pointer rounded-theme ${headerLabelClass} hover:text-theme-text ${FOCUS_RING}`}
                      >
                        <span>{col.header}</span>
                        <span className="text-[10px]" aria-hidden>
                          {isSortedCol ? (
                            sortConfig.direction === "asc" ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )
                          ) : (
                            <ChevronUp className="w-3.5 h-3.5 opacity-30" />
                          )}
                        </span>
                      </button>
                    ) : (
                      <div
                        className={`inline-flex items-center gap-1 type-label text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider ${headerLabelClass}`}
                      >
                        <span>{col.header}</span>
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-border bg-theme-card">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onSelectionChange ? 1 : 0)}
                  className={`${cellPadClass} py-8`}
                >
                  <EmptyState
                    variant="compact"
                    title={emptyMessage}
                    description=""
                    hideIcon
                    className="border-0 bg-transparent shadow-none rounded-none max-w-none py-2"
                  />
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rIdx) => {
                const customRowClass = rowClassName ? rowClassName(row, rIdx) : "";
                const id = getRowKey
                  ? getRowKey(row)
                  : String((row as Record<string, unknown>).id ?? "");
                const rowKey = id || `row-${rIdx}`;
                const isChecked = selectedRowIds?.includes(id) || false;

                return (
                  <tr
                    key={rowKey}
                    className={`${rowHeightClass} hover:bg-theme-surface/60 transition-colors ${
                      isChecked ? "bg-theme-accent-muted/40" : ""
                    } ${customRowClass}`}
                  >
                    {onSelectionChange && (
                      <td className={`w-10 ${checkboxPadClass} whitespace-nowrap align-middle`}>
                        <input
                          type="checkbox"
                          className={CHECKBOX_CLASS}
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              onSelectionChange([...(selectedRowIds || []), id]);
                            } else {
                              onSelectionChange((selectedRowIds || []).filter((x) => x !== id));
                            }
                          }}
                          aria-label="Select row"
                        />
                      </td>
                    )}

                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`${cellPadClass} whitespace-nowrap align-middle text-theme-text ${col.className || ""}`}
                      >
                        {col.render
                          ? col.render(row, rIdx)
                          : ((row as Record<string, unknown>)[col.key] as React.ReactNode)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer — Density: 48px */}
      {pageSize && totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 min-h-12 px-4 border border-theme-border bg-theme-surface rounded-theme">
          <div className="type-label text-[10px] sm:text-xs text-theme-muted font-semibold uppercase tracking-wider">
            Showing Page {currentPage} of {totalPages} ({sortedData.length} records)
          </div>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className={`rounded-theme ${FOCUS_RING}`}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className={`rounded-theme ${FOCUS_RING}`}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
