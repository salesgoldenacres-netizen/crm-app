/**
 * Canonical nested `siteVisit.status` vocabulary (Wave 6 Phase 2C).
 * Pipeline SoR remains lead.status (`site-visit-confirmed` / `site-visit-completed`).
 * Nested status is optional enrichment for visit-field lifecycle.
 */

export const SITE_VISIT_STATUSES = [
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
] as const;

export type SiteVisitStatus = (typeof SITE_VISIT_STATUSES)[number];

export const SITE_VISIT_STATUS_LABELS: Record<SiteVisitStatus, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

const SITE_VISIT_STATUS_ALIASES: Record<string, SiteVisitStatus> = {
  scheduled: "scheduled",
  confirmed: "confirmed",
  completed: "completed",
  cancelled: "cancelled",
  canceled: "cancelled",
  no_show: "no_show",
  noshow: "no_show",
  "no-show": "no_show",
};

export function isCanonicalSiteVisitStatus(
  value: unknown,
): value is SiteVisitStatus {
  return (
    typeof value === "string" &&
    (SITE_VISIT_STATUSES as readonly string[]).includes(value)
  );
}

export function normalizeSiteVisitStatus(
  value: unknown,
): SiteVisitStatus | null {
  if (value == null) return null;
  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;
  if (isCanonicalSiteVisitStatus(raw)) return raw;
  return SITE_VISIT_STATUS_ALIASES[raw] ?? null;
}

/** Lead pipeline statuses that indicate an active/completed visit. */
export const LEAD_SITE_VISIT_PIPELINE_STATUSES = [
  "site-visit-confirmed",
  "site-visit-completed",
] as const;

/**
 * Whether a lead still has a remindable site visit for automation jobs.
 * Consumes canonical lead.status + optional nested siteVisit.status.
 */
export function isRemindableSiteVisit(lead: {
  status?: string | null;
  siteVisit?: { date?: string; status?: string } | null;
}): boolean {
  if (!lead?.siteVisit?.date) return false;
  const nested = normalizeSiteVisitStatus(lead.siteVisit.status);
  if (
    nested === "cancelled" ||
    nested === "completed" ||
    nested === "no_show"
  ) {
    return false;
  }
  const leadStatus = String(lead.status || "").trim().toLowerCase();
  if (leadStatus === "site-visit-completed") return false;
  if (
    leadStatus === "booked" ||
    leadStatus === "reserved" ||
    leadStatus === "not-interested"
  ) {
    return false;
  }
  return true;
}

export function getSiteVisitDate(lead: {
  siteVisit?: { date?: string } | null;
}): string | null {
  const ymd = String(lead?.siteVisit?.date || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null;
}
