import { ChevronDown } from "lucide-react";
import {
  LeadFilterFieldConfig,
  LeadListFilters,
} from "@/features/leads/config/leadListFilterConfig";
import { User, Project } from "@/shared/types";

interface LeadFilterFieldControlProps {
  field: LeadFilterFieldConfig;
  value: LeadListFilters;
  onChange: (patch: Partial<LeadListFilters>) => void;
  users: User[];
  projects: Record<string, Project>;
  /** Compact styling for Excel row */
  dense?: boolean;
  onEnterSearch?: () => void;
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring";

function hasValue(v: unknown): boolean {
  if (Array.isArray(v)) return v.length > 0;
  return v != null && String(v).trim() !== "";
}

/** Shared field chrome — command-surface tokens; no filter state. */
function fieldShell(dense: boolean | undefined, filled: boolean, extra = "") {
  const base = dense
    ? `w-full min-w-0 h-6 text-[10px] leading-none border rounded-theme px-1.5 outline-none transition-colors ${FOCUS_RING}`
    : `w-full text-xs border rounded-theme px-2.5 py-2 outline-none transition-colors ${FOCUS_RING}`;
  const tone = filled
    ? "border-theme-accent/50 bg-theme-accent/10 text-theme-text"
    : "border-theme-border bg-theme-card text-theme-text placeholder:text-theme-muted/70";
  return `${base} ${tone} ${extra}`;
}

function rangeShell(dense: boolean, filled: boolean) {
  if (dense) {
    return `flex items-center gap-0.5 min-w-[9.5rem] rounded-theme border px-0.5 h-6 transition-colors ${
      filled
        ? "border-theme-accent/50 bg-theme-accent/10"
        : "border-theme-border bg-theme-card"
    }`;
  }
  return "";
}

export default function LeadFilterFieldControl({
  field,
  value,
  onChange,
  users,
  projects,
  dense,
  onEnterSearch,
}: LeadFilterFieldControlProps) {
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onEnterSearch?.();
    }
  };

  if (field.type === "text") {
    const v = String(value[field.key] ?? "");
    return (
      <input
        type="text"
        value={v}
        placeholder={field.placeholder || field.label}
        onChange={(e) => onChange({ [field.key]: e.target.value } as Partial<LeadListFilters>)}
        onKeyDown={onKeyDown}
        className={fieldShell(dense, hasValue(v))}
        aria-label={field.label}
      />
    );
  }

  if (field.type === "select") {
    let options = field.options || [];
    if (field.key === "assignedTo") {
      options = users.map((u) => ({ value: u.id, label: u.username }));
    }
    if (field.key === "projectId") {
      options = Object.values(projects).map((p) => ({
        value: p.id,
        label: p.name,
      }));
    }
    const v = String(value[field.key] ?? "");
    if (dense) {
      return (
        <div className="relative min-w-0">
          <select
            value={v}
            onChange={(e) =>
              onChange({ [field.key]: e.target.value } as Partial<LeadListFilters>)
            }
            className={`${fieldShell(dense, hasValue(v), "appearance-none pr-5 cursor-pointer")}`}
            aria-label={field.label}
          >
            <option value="">All</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-theme-muted" aria-hidden />
        </div>
      );
    }
    return (
      <select
        value={v}
        onChange={(e) => onChange({ [field.key]: e.target.value } as Partial<LeadListFilters>)}
        className={fieldShell(dense, hasValue(v), "cursor-pointer")}
        aria-label={field.label}
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "multi-select") {
    const selected = (value.statuses || []) as string[];
    if (dense) {
      const current = selected[0] || "";
      return (
        <div className="relative min-w-0">
          <select
            value={current}
            onChange={(e) =>
              onChange({ statuses: e.target.value ? [e.target.value] : [] })
            }
            className={`${fieldShell(dense, hasValue(selected), "appearance-none pr-5 cursor-pointer")}`}
            aria-label={field.label}
          >
            <option value="">All</option>
            {(field.options || []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-theme-muted" aria-hidden />
        </div>
      );
    }
    return (
      <select
        multiple
        value={selected}
        onChange={(e) => {
          const vals = Array.from(e.target.selectedOptions).map((o) => o.value);
          onChange({ statuses: vals });
        }}
        className={`${fieldShell(dense, hasValue(selected))} h-24 cursor-pointer`}
        aria-label={field.label}
        title="Hold Ctrl/Cmd to select multiple"
      >
        {(field.options || []).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "date") {
    const v = String(value[field.key] ?? "");
    return (
      <input
        type="date"
        value={v}
        onChange={(e) => onChange({ [field.key]: e.target.value } as Partial<LeadListFilters>)}
        onKeyDown={onKeyDown}
        className={fieldShell(dense, hasValue(v), dense ? "px-1" : "")}
        aria-label={field.label}
      />
    );
  }

  if (field.type === "date-range" && field.endKey) {
    const start = String(value[field.key] ?? "");
    const end = String(value[field.endKey] ?? "");
    const filled = hasValue(start) || hasValue(end);

    if (dense) {
      return (
        <div className={rangeShell(true, filled)}>
          <input
            type="date"
            value={start}
            title="From"
            onChange={(e) =>
              onChange({ [field.key]: e.target.value } as Partial<LeadListFilters>)
            }
            onKeyDown={onKeyDown}
            className={`min-w-0 flex-1 h-full bg-transparent border-0 text-[9px] text-theme-text px-0.5 outline-none cursor-pointer rounded-theme ${FOCUS_RING}`}
            aria-label={`${field.label} from`}
          />
          <span className="text-[9px] text-theme-muted shrink-0 select-none" aria-hidden>
            –
          </span>
          <input
            type="date"
            value={end}
            title="To"
            onChange={(e) =>
              onChange({ [field.endKey!]: e.target.value } as Partial<LeadListFilters>)
            }
            onKeyDown={onKeyDown}
            className={`min-w-0 flex-1 h-full bg-transparent border-0 text-[9px] text-theme-text px-0.5 outline-none cursor-pointer rounded-theme ${FOCUS_RING}`}
            aria-label={`${field.label} to`}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="date"
          value={start}
          onChange={(e) =>
            onChange({ [field.key]: e.target.value } as Partial<LeadListFilters>)
          }
          onKeyDown={onKeyDown}
          className={fieldShell(dense, hasValue(start))}
          aria-label={`${field.label} from`}
        />
        <input
          type="date"
          value={end}
          onChange={(e) =>
            onChange({ [field.endKey!]: e.target.value } as Partial<LeadListFilters>)
          }
          onKeyDown={onKeyDown}
          className={fieldShell(dense, hasValue(end))}
          aria-label={`${field.label} to`}
        />
      </div>
    );
  }

  return null;
}
