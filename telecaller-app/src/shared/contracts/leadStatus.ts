/**
 * Canonical lead status vocabulary (Wave 6 Agent 0).
 * Matches LEAD_STATUS_OPTIONS filter labels; dual-read aliases for legacy values.
 */

export const LEAD_STATUSES = [
  "raw",
  "new",
  "not-attempted",
  "contacted",
  "interested",
  "rnr",
  "re-engaged",
  "site-visit-confirmed",
  "site-visit-completed",
  "booked",
  "reserved",
  "not-interested",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  raw: "Raw",
  new: "New",
  "not-attempted": "Not Attempted",
  contacted: "Contacted",
  interested: "Interested",
  rnr: "RNR",
  "re-engaged": "Re-engaged",
  "site-visit-confirmed": "Site Visit Confirmed",
  "site-visit-completed": "Site Visit Completed",
  booked: "Booked",
  reserved: "Reserved",
  "not-interested": "Not Interested",
};

/** Statuses shown in list/admin filter chips (includes re-engaged). */
export const LEAD_STATUS_FILTER_OPTIONS: ReadonlyArray<{
  value: LeadStatus;
  label: string;
}> = LEAD_STATUSES.map((value) => ({
  value,
  label: LEAD_STATUS_LABELS[value],
}));

/** Won / inventory-adjacent terminal statuses. */
export const TERMINAL_WON_STATUSES: readonly LeadStatus[] = [
  "booked",
  "reserved",
] as const;

/** Lost terminal status. */
export const TERMINAL_LOST_STATUSES: readonly LeadStatus[] = [
  "not-interested",
] as const;

export const TERMINAL_STATUSES: readonly LeadStatus[] = [
  ...TERMINAL_WON_STATUSES,
  ...TERMINAL_LOST_STATUSES,
] as const;

/** Legacy / informal strings normalized into canonical statuses. */
const STATUS_ALIASES: Record<string, LeadStatus> = {
  convert: "booked",
  converted: "booked",
  won: "booked",
  sale: "booked",
  "site visit confirmed": "site-visit-confirmed",
  "site visit completed": "site-visit-completed",
  "site_visit_confirmed": "site-visit-confirmed",
  "site_visit_completed": "site-visit-completed",
  "not interested": "not-interested",
  "not_attempted": "not-attempted",
  "reengaged": "re-engaged",
  "re_engaged": "re-engaged",
};

export function isCanonicalLeadStatus(value: unknown): value is LeadStatus {
  return (
    typeof value === "string" &&
    (LEAD_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Normalize raw status strings to canonical LeadStatus when possible.
 * Returns null when the value cannot be mapped.
 */
export function normalizeLeadStatus(value: unknown): LeadStatus | null {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (isCanonicalLeadStatus(raw)) return raw;
  const lower = raw.toLowerCase();
  if (isCanonicalLeadStatus(lower)) return lower;
  const aliased = STATUS_ALIASES[lower];
  return aliased ?? null;
}

export function isTerminalLeadStatus(status: string | null | undefined): boolean {
  const normalized = normalizeLeadStatus(status);
  return normalized != null && (TERMINAL_STATUSES as readonly string[]).includes(normalized);
}

export function isBookedLikeStatus(status: string | null | undefined): boolean {
  const normalized = normalizeLeadStatus(status);
  if (normalized && (TERMINAL_WON_STATUSES as readonly string[]).includes(normalized)) {
    return true;
  }
  return /book|convert|won|sale/i.test(String(status || ""));
}

export function getLeadStatusLabel(status: string | null | undefined): string {
  const normalized = normalizeLeadStatus(status);
  if (normalized) return LEAD_STATUS_LABELS[normalized];
  return String(status || "—");
}
