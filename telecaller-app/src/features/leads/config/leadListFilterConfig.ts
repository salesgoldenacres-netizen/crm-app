import { User } from "@/shared/types";
import { LEAD_STATUS_FILTER_OPTIONS } from "@/shared/contracts/leadStatus";

/** Applied/draft filter values — single source of truth for the list engine. */
export interface LeadListFilters {
  leadNumber: string;
  name: string;
  phone: string;
  email: string;
  /** Multi-select statuses (empty = any). */
  statuses: string[];
  source: string;
  leadMedium: string;
  priority: string;
  projectId: string;
  assignedTo: string;
  createdDateStart: string;
  createdDateEnd: string;
  followUpStart: string;
  followUpEnd: string;
  /**
   * Special queue shortcut that cannot be expressed as a simple field equality.
   * Only used by presets / chips; column UI does not expose it directly.
   */
  queueMode: "" | "overdue";
}

export type LeadFilterControlType =
  | "text"
  | "select"
  | "multi-select"
  | "date"
  | "date-range";

export interface LeadFilterFieldOption {
  value: string;
  label: string;
}

export interface LeadFilterFieldConfig {
  key: keyof LeadListFilters;
  /** For date-range, end key is paired */
  endKey?: keyof LeadListFilters;
  label: string;
  type: LeadFilterControlType;
  /** Column id for desktop table alignment */
  column: string;
  placeholder?: string;
  options?: LeadFilterFieldOption[];
  /** Hide for telecallers when true */
  managerOnly?: boolean;
  /** Hide when role restriction hideLeadSource */
  hideIfNoSource?: boolean;
  /** Hide when role restriction hideEmail */
  hideIfNoEmail?: boolean;
  /** Show only in normal (non-compact) view */
  normalViewOnly?: boolean;
  /** Compact view uses a combined "Lead Info" column — skip separate name/phone */
  skipInCompact?: boolean;
}

export const EMPTY_LEAD_LIST_FILTERS: LeadListFilters = {
  leadNumber: "",
  name: "",
  phone: "",
  email: "",
  statuses: [],
  source: "",
  leadMedium: "",
  priority: "",
  projectId: "",
  assignedTo: "",
  createdDateStart: "",
  createdDateEnd: "",
  followUpStart: "",
  followUpEnd: "",
  queueMode: "",
};

/** Canonical filter options — sourced from Wave 6 Agent 0 `LEAD_STATUS_FILTER_OPTIONS`. */
export const LEAD_STATUS_OPTIONS: LeadFilterFieldOption[] =
  LEAD_STATUS_FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

export const LEAD_SOURCE_OPTIONS: LeadFilterFieldOption[] = [
  { value: "Direct Call", label: "Direct Call" },
  { value: "Website", label: "Website" },
  { value: "Facebook", label: "Facebook" },
  { value: "Google", label: "Google" },
  { value: "Referral", label: "Referral" },
  { value: "Walk-in", label: "Walk-in" },
  { value: "Other", label: "Other" },
];

export const LEAD_MEDIUM_OPTIONS: LeadFilterFieldOption[] = [
  { value: "Phone", label: "Phone" },
  { value: "WhatsApp", label: "WhatsApp" },
  { value: "Email", label: "Email" },
  { value: "SMS", label: "SMS" },
  { value: "In-Person", label: "In-Person" },
];

export const LEAD_PRIORITY_OPTIONS: LeadFilterFieldOption[] = [
  { value: "hot", label: "Hot" },
  { value: "warm", label: "Warm" },
  { value: "cold", label: "Cold" },
];

/** Shared field definitions — desktop row and mobile sheet both render from this. */
export const LEAD_FILTER_FIELDS: LeadFilterFieldConfig[] = [
  {
    key: "leadNumber",
    label: "Lead #",
    type: "text",
    column: "leadNumber",
    placeholder: "#",
  },
  {
    key: "createdDateStart",
    endKey: "createdDateEnd",
    label: "Created",
    type: "date-range",
    column: "created",
    normalViewOnly: true,
  },
  {
    key: "name",
    label: "Name",
    type: "text",
    column: "name",
    placeholder: "Name / phone",
  },
  {
    key: "phone",
    label: "Phone",
    type: "text",
    column: "phone",
    placeholder: "Phone",
    skipInCompact: true,
  },
  {
    key: "email",
    label: "Email",
    type: "text",
    column: "email",
    placeholder: "Email",
    hideIfNoEmail: true,
    skipInCompact: true,
  },
  {
    key: "source",
    label: "Source",
    type: "select",
    column: "source",
    options: LEAD_SOURCE_OPTIONS,
    hideIfNoSource: true,
  },
  {
    key: "leadMedium",
    label: "Medium",
    type: "select",
    column: "medium",
    options: LEAD_MEDIUM_OPTIONS,
    skipInCompact: true,
  },
  {
    key: "statuses",
    label: "Status",
    type: "multi-select",
    column: "status",
    options: LEAD_STATUS_OPTIONS,
  },
  {
    key: "priority",
    label: "Priority",
    type: "select",
    column: "priority",
    options: LEAD_PRIORITY_OPTIONS,
  },
  {
    key: "followUpStart",
    endKey: "followUpEnd",
    label: "Follow-up",
    type: "date-range",
    column: "followUp",
  },
  {
    key: "assignedTo",
    label: "Assigned",
    type: "select",
    column: "assignedTo",
    managerOnly: true,
  },
  {
    key: "projectId",
    label: "Project",
    type: "select",
    column: "project",
  },
];

export type LeadListPresetId =
  | "all"
  | "mine"
  | "today"
  | "overdue"
  | "hot"
  | "booked";

export interface LeadListPreset {
  id: LeadListPresetId;
  label: string;
  build: (ctx: { userId: string; todayStr: string }) => LeadListFilters;
}

export const LEAD_LIST_PRESETS: LeadListPreset[] = [
  {
    id: "all",
    label: "All Leads",
    build: () => ({ ...EMPTY_LEAD_LIST_FILTERS }),
  },
  {
    id: "mine",
    label: "My Leads",
    build: ({ userId }) => ({
      ...EMPTY_LEAD_LIST_FILTERS,
      assignedTo: userId,
    }),
  },
  {
    id: "today",
    label: "Today's Follow-ups",
    build: ({ todayStr }) => ({
      ...EMPTY_LEAD_LIST_FILTERS,
      followUpStart: todayStr,
      followUpEnd: todayStr,
    }),
  },
  {
    id: "overdue",
    label: "Overdue Follow-ups",
    build: () => ({
      ...EMPTY_LEAD_LIST_FILTERS,
      queueMode: "overdue",
    }),
  },
  {
    id: "hot",
    label: "Hot Leads",
    build: () => ({
      ...EMPTY_LEAD_LIST_FILTERS,
      priority: "hot",
    }),
  },
  {
    id: "booked",
    label: "Booked",
    build: () => ({
      ...EMPTY_LEAD_LIST_FILTERS,
      statuses: ["booked", "reserved"],
    }),
  },
];

export function cloneLeadListFilters(f: LeadListFilters): LeadListFilters {
  return {
    ...f,
    statuses: [...f.statuses],
  };
}

export function leadListFiltersEqual(a: LeadListFilters, b: LeadListFilters): boolean {
  return (
    a.leadNumber === b.leadNumber &&
    a.name === b.name &&
    a.phone === b.phone &&
    a.email === b.email &&
    a.source === b.source &&
    a.leadMedium === b.leadMedium &&
    a.priority === b.priority &&
    a.projectId === b.projectId &&
    a.assignedTo === b.assignedTo &&
    a.createdDateStart === b.createdDateStart &&
    a.createdDateEnd === b.createdDateEnd &&
    a.followUpStart === b.followUpStart &&
    a.followUpEnd === b.followUpEnd &&
    a.queueMode === b.queueMode &&
    a.statuses.length === b.statuses.length &&
    a.statuses.every((s, i) => s === b.statuses[i])
  );
}

export function isLeadListFiltersEmpty(f: LeadListFilters): boolean {
  return leadListFiltersEqual(f, EMPTY_LEAD_LIST_FILTERS);
}

export function matchLeadListPreset(
  filters: LeadListFilters,
  ctx: { userId: string; todayStr: string }
): LeadListPresetId | "custom" {
  for (const preset of LEAD_LIST_PRESETS) {
    if (leadListFiltersEqual(filters, preset.build(ctx))) {
      return preset.id;
    }
  }
  if (isLeadListFiltersEmpty(filters)) return "all";
  return "custom";
}

export interface LeadFilterChip {
  id: string;
  label: string;
  /** Clear this chip from filters */
  clear: (prev: LeadListFilters) => LeadListFilters;
}

export function buildLeadFilterChips(
  filters: LeadListFilters,
  ctx: {
    users: User[];
    projectNames: Record<string, string>;
  }
): LeadFilterChip[] {
  const chips: LeadFilterChip[] = [];

  if (filters.queueMode === "overdue") {
    chips.push({
      id: "queueMode",
      label: "Queue: Overdue Follow-ups",
      clear: (prev) => ({ ...prev, queueMode: "" }),
    });
  }
  if (filters.leadNumber) {
    chips.push({
      id: "leadNumber",
      label: `Lead #: ${filters.leadNumber}`,
      clear: (prev) => ({ ...prev, leadNumber: "" }),
    });
  }
  if (filters.name) {
    chips.push({
      id: "name",
      label: `Name: ${filters.name}`,
      clear: (prev) => ({ ...prev, name: "" }),
    });
  }
  if (filters.phone) {
    chips.push({
      id: "phone",
      label: `Phone: ${filters.phone}`,
      clear: (prev) => ({ ...prev, phone: "" }),
    });
  }
  if (filters.email) {
    chips.push({
      id: "email",
      label: `Email: ${filters.email}`,
      clear: (prev) => ({ ...prev, email: "" }),
    });
  }
  if (filters.statuses.length) {
    const labels = filters.statuses
      .map((s) => LEAD_STATUS_OPTIONS.find((o) => o.value === s)?.label || s)
      .join(", ");
    chips.push({
      id: "statuses",
      label: `Status: ${labels}`,
      clear: (prev) => ({ ...prev, statuses: [] }),
    });
  }
  if (filters.source) {
    chips.push({
      id: "source",
      label: `Source: ${filters.source}`,
      clear: (prev) => ({ ...prev, source: "" }),
    });
  }
  if (filters.leadMedium) {
    chips.push({
      id: "leadMedium",
      label: `Medium: ${filters.leadMedium}`,
      clear: (prev) => ({ ...prev, leadMedium: "" }),
    });
  }
  if (filters.priority) {
    chips.push({
      id: "priority",
      label: `Priority: ${filters.priority}`,
      clear: (prev) => ({ ...prev, priority: "" }),
    });
  }
  if (filters.projectId) {
    chips.push({
      id: "projectId",
      label: `Project: ${ctx.projectNames[filters.projectId] || filters.projectId}`,
      clear: (prev) => ({ ...prev, projectId: "" }),
    });
  }
  if (filters.assignedTo) {
    const u = ctx.users.find((x) => x.id === filters.assignedTo);
    chips.push({
      id: "assignedTo",
      label: `Assigned: ${u?.username || filters.assignedTo}`,
      clear: (prev) => ({ ...prev, assignedTo: "" }),
    });
  }
  if (filters.createdDateStart || filters.createdDateEnd) {
    chips.push({
      id: "created",
      label: `Created: ${filters.createdDateStart || "…"} → ${filters.createdDateEnd || "…"}`,
      clear: (prev) => ({
        ...prev,
        createdDateStart: "",
        createdDateEnd: "",
      }),
    });
  }
  if (filters.followUpStart || filters.followUpEnd) {
    chips.push({
      id: "followUp",
      label: `Follow-up: ${filters.followUpStart || "…"} → ${filters.followUpEnd || "…"}`,
      clear: (prev) => ({
        ...prev,
        followUpStart: "",
        followUpEnd: "",
      }),
    });
  }

  return chips;
}

export function countActiveLeadFilters(filters: LeadListFilters): number {
  return buildLeadFilterChips(filters, { users: [], projectNames: {} }).length;
}
