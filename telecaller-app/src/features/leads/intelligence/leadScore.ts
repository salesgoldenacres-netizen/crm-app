/**
 * lead-score-v1 — deterministic pure scorer.
 */

import {
  LEAD_INTELLIGENCE_THRESHOLDS,
  LEAD_SCORE_FACTOR_IDS,
  LEAD_SCORE_VERSION_V1,
  clampLeadScore,
  getIstDateString,
  isTerminalLeadStatus,
  normalizeLeadStatus,
  scoreToBand,
  type LeadScoreBand,
  type LeadScoreFactor,
  type DuplicateRisk,
} from "@/shared/contracts";
import {
  getOverdueDays,
  getStaleDays,
  hasRecentConnect,
  isFollowUpMissing,
  isPaidSource,
  resolveFollowUpYmd,
  type LeadActivitySnapshot,
} from "./leadActivity";

export interface LeadScoreResult {
  score: number;
  scoreBand: LeadScoreBand;
  scoreFactors: LeadScoreFactor[];
  version: typeof LEAD_SCORE_VERSION_V1;
}

export interface LeadScoreOptions {
  todayYmd?: string;
  nowMs?: number;
  duplicateRisk?: DuplicateRisk;
}

function pushFactor(
  factors: LeadScoreFactor[],
  id: string,
  label: string,
  delta: number,
): void {
  if (delta === 0) return;
  factors.push({ id, label, delta });
}

export function leadScoreV1(
  lead: LeadActivitySnapshot,
  options: LeadScoreOptions = {},
): LeadScoreResult {
  const todayYmd = options.todayYmd ?? getIstDateString();
  const nowMs = options.nowMs ?? Date.now();
  const status = normalizeLeadStatus(lead.status) || String(lead.status || "");
  const factors: LeadScoreFactor[] = [];

  // Terminal fixed scores
  if (status === "booked") {
    pushFactor(
      factors,
      LEAD_SCORE_FACTOR_IDS.STAGE_BOOKED,
      "Booked (terminal)",
      100,
    );
    return {
      score: 100,
      scoreBand: "hot",
      scoreFactors: factors,
      version: LEAD_SCORE_VERSION_V1,
    };
  }
  if (status === "not-interested") {
    pushFactor(
      factors,
      LEAD_SCORE_FACTOR_IDS.STAGE_NOT_INTERESTED,
      "Not interested (terminal)",
      0,
    );
    return {
      score: 0,
      scoreBand: "cold",
      scoreFactors: factors,
      version: LEAD_SCORE_VERSION_V1,
    };
  }

  let score = LEAD_INTELLIGENCE_THRESHOLDS.SCORE_BASE;
  const priority = String(lead.priority || "warm").toLowerCase();

  if (priority === "hot") {
    pushFactor(factors, LEAD_SCORE_FACTOR_IDS.MANUAL_HOT, "Agent priority hot", 20);
    score += 20;
  } else if (priority === "cold") {
    pushFactor(factors, LEAD_SCORE_FACTOR_IDS.MANUAL_COLD, "Agent priority cold", -15);
    score -= 15;
  }

  if (status === "interested") {
    pushFactor(factors, LEAD_SCORE_FACTOR_IDS.STAGE_INTERESTED, "Status interested", 12);
    score += 12;
  } else if (
    status === "site-visit-confirmed" ||
    status === "site-visit-completed"
  ) {
    pushFactor(factors, LEAD_SCORE_FACTOR_IDS.STAGE_SITE_VISIT, "Site visit stage", 18);
    score += 18;
  } else if (status === "reserved") {
    pushFactor(factors, LEAD_SCORE_FACTOR_IDS.STAGE_RESERVED, "Status reserved", 22);
    score += 22;
  } else if (
    status === "new" ||
    status === "raw" ||
    status === "not-attempted"
  ) {
    pushFactor(factors, LEAD_SCORE_FACTOR_IDS.STAGE_NEW_RAW, "Fresh inventory", 5);
    score += 5;
  } else if (status === "rnr") {
    pushFactor(factors, LEAD_SCORE_FACTOR_IDS.STAGE_RNR, "RNR status", -5);
    score -= 5;
  }

  const fu = resolveFollowUpYmd(lead);
  const overdueDays = getOverdueDays(lead, todayYmd);
  if (fu === todayYmd) {
    pushFactor(factors, LEAD_SCORE_FACTOR_IDS.FOLLOWUP_TODAY, "Follow-up today", 15);
    score += 15;
  } else if (overdueDays > 0 && !isTerminalLeadStatus(status)) {
    const overdueDelta = 10 + Math.min(10, overdueDays);
    pushFactor(
      factors,
      LEAD_SCORE_FACTOR_IDS.FOLLOWUP_OVERDUE,
      `Overdue follow-up +${overdueDays}d`,
      overdueDelta,
    );
    score += overdueDelta;
  } else if (isFollowUpMissing(lead) && !isTerminalLeadStatus(status)) {
    pushFactor(
      factors,
      LEAD_SCORE_FACTOR_IDS.FOLLOWUP_MISSING,
      "Missing follow-up date",
      -8,
    );
    score -= 8;
  }

  const staleDays = getStaleDays(lead, todayYmd);
  if (staleDays >= LEAD_INTELLIGENCE_THRESHOLDS.IDLE_CRITICAL_DAYS) {
    pushFactor(factors, LEAD_SCORE_FACTOR_IDS.IDLE_7D, "Idle ≥7 days", -20);
    score -= 20;
  } else if (staleDays >= LEAD_INTELLIGENCE_THRESHOLDS.IDLE_WATCH_DAYS) {
    pushFactor(factors, LEAD_SCORE_FACTOR_IDS.IDLE_3D, "Idle ≥3 days", -12);
    score -= 12;
  }

  if (
    hasRecentConnect(
      lead,
      nowMs,
      LEAD_INTELLIGENCE_THRESHOLDS.RECENT_CONNECT_HOURS,
    )
  ) {
    pushFactor(
      factors,
      LEAD_SCORE_FACTOR_IDS.RECENT_CONNECT,
      "Connected in last 48h",
      8,
    );
    score += 8;
  }

  if (lead.siteVisit) {
    pushFactor(
      factors,
      LEAD_SCORE_FACTOR_IDS.HAS_SITE_VISIT_OBJ,
      "Site visit scheduled",
      6,
    );
    score += 6;
  }

  if (isPaidSource(lead)) {
    pushFactor(factors, LEAD_SCORE_FACTOR_IDS.SOURCE_PAID, "Paid acquisition source", 4);
    score += 4;
  }

  const dup = options.duplicateRisk ?? "none";
  if (dup === "confirmed" || dup === "possible") {
    pushFactor(
      factors,
      LEAD_SCORE_FACTOR_IDS.DUPLICATE_SUSPECTED,
      "Duplicate phone suspected",
      -5,
    );
    score -= 5;
  }

  const clamped = clampLeadScore(score);
  return {
    score: clamped,
    scoreBand: scoreToBand(clamped),
    scoreFactors: factors,
    version: LEAD_SCORE_VERSION_V1,
  };
}
