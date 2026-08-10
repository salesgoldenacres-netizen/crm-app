/**
 * pBook-v1 — stage prior booking probability (rules, not ML).
 */

import {
  LEAD_BOOKING_PROB_VERSION_V1,
  LEAD_INTELLIGENCE_THRESHOLDS,
  getIstDateString,
  normalizeLeadStatus,
} from "@/shared/contracts";
import {
  getStaleDays,
  resolveFollowUpYmd,
  type LeadActivitySnapshot,
} from "@/shared/contracts/leadActivity";

const STAGE_PRIORS: Record<string, number> = {
  raw: 0.05,
  new: 0.05,
  "not-attempted": 0.05,
  contacted: 0.08,
  rnr: 0.08,
  "re-engaged": 0.1,
  interested: 0.18,
  "site-visit-confirmed": 0.35,
  "site-visit-completed": 0.35,
  reserved: 0.65,
  booked: 1.0,
  "not-interested": 0.0,
};

export interface BookingProbabilityResult {
  bookingProbability: number;
  version: typeof LEAD_BOOKING_PROB_VERSION_V1;
}

export function bookingProbabilityV1(
  lead: LeadActivitySnapshot,
  todayYmd: string = getIstDateString(),
): BookingProbabilityResult {
  const status = normalizeLeadStatus(lead.status) || String(lead.status || "");
  let p = STAGE_PRIORS[status] ?? 0.08;

  if (resolveFollowUpYmd(lead) === todayYmd) p += 0.05;
  if (getStaleDays(lead, todayYmd) >= LEAD_INTELLIGENCE_THRESHOLDS.IDLE_CRITICAL_DAYS) {
    p -= 0.05;
  }
  if (lead.siteVisit) p += 0.08;

  return {
    bookingProbability: Math.max(0, Math.min(1, Math.round(p * 100) / 100)),
    version: LEAD_BOOKING_PROB_VERSION_V1,
  };
}
