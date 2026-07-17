/**
 * Canonical site-visit field helpers for automation jobs (server).
 * Prefer lead.status (`site-visit-confirmed` / `site-visit-completed`) as pipeline SoR;
 * nested `siteVisit.status` is optional enrichment when present.
 */

const SITE_VISIT_STATUSES = Object.freeze({
  SCHEDULED: "scheduled",
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
});

const SITE_VISIT_STATUS_ALIASES = Object.freeze({
  scheduled: SITE_VISIT_STATUSES.SCHEDULED,
  confirmed: SITE_VISIT_STATUSES.CONFIRMED,
  completed: SITE_VISIT_STATUSES.COMPLETED,
  cancelled: SITE_VISIT_STATUSES.CANCELLED,
  canceled: SITE_VISIT_STATUSES.CANCELLED,
  no_show: SITE_VISIT_STATUSES.NO_SHOW,
  noshow: SITE_VISIT_STATUSES.NO_SHOW,
  "no-show": SITE_VISIT_STATUSES.NO_SHOW,
});

/** Lead pipeline statuses that mean an active / completed visit. */
const LEAD_SITE_VISIT_STATUSES = Object.freeze([
  "site-visit-confirmed",
  "site-visit-completed",
]);

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function normalizeSiteVisitStatus(value) {
  if (value == null) return null;
  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;
  return SITE_VISIT_STATUS_ALIASES[raw] || null;
}

/**
 * Whether a lead still has a remindable site visit (has date, not cancelled/completed/no-show).
 * @param {{ status?: string, siteVisit?: { date?: string, status?: string } | null }} lead
 * @returns {boolean}
 */
function isRemindableSiteVisit(lead) {
  if (!lead || !lead.siteVisit || !lead.siteVisit.date) return false;
  const nested = normalizeSiteVisitStatus(lead.siteVisit.status);
  if (
    nested === SITE_VISIT_STATUSES.CANCELLED ||
    nested === SITE_VISIT_STATUSES.COMPLETED ||
    nested === SITE_VISIT_STATUSES.NO_SHOW
  ) {
    return false;
  }
  const leadStatus = String(lead.status || "").trim().toLowerCase();
  if (leadStatus === "site-visit-completed") return false;
  if (leadStatus === "booked" || leadStatus === "reserved" || leadStatus === "not-interested") {
    return false;
  }
  // Prefer confirmed pipeline status; also allow interested/legacy with siteVisit.date
  // (Agent 1 may still be migrating writers).
  return true;
}

/**
 * @param {{ siteVisit?: { date?: string } | null }} lead
 * @returns {string | null} YYYY-MM-DD or null
 */
function getSiteVisitDate(lead) {
  const date = lead && lead.siteVisit && lead.siteVisit.date;
  const ymd = String(date || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null;
}

module.exports = {
  SITE_VISIT_STATUSES,
  SITE_VISIT_STATUS_ALIASES,
  LEAD_SITE_VISIT_STATUSES,
  normalizeSiteVisitStatus,
  isRemindableSiteVisit,
  getSiteVisitDate,
};
