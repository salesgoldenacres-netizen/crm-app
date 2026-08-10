/**
 * Orchestrator — assemble LeadIntelligence from pure v1 helpers (compute-on-read).
 */

import {
  LEAD_SCORE_VERSION_V1,
  getIstDateString,
  type LeadIntelligence,
  type DuplicateRisk,
} from "@/shared/contracts";
import type { LeadActivitySnapshot } from "@/shared/contracts/leadActivity";
import { bookingProbabilityV1 } from "./bookingProbability";
import { assessDuplicateRisk } from "./duplicateRisk";
import { leadHealthV1 } from "./leadHealth";
import { leadScoreV1 } from "./leadScore";
import { nextActionV1 } from "./nextAction";

export interface ComputeLeadIntelligenceOptions {
  todayYmd?: string;
  nowMs?: number;
  isManagerial?: boolean;
  peers?: Array<{ id: string; phone?: string | null }>;
  duplicateRisk?: DuplicateRisk;
  duplicateCandidateIds?: string[];
  includeSummary?: boolean;
}

function buildRulesBrief(
  lead: LeadActivitySnapshot & { id?: string },
  intel: Omit<LeadIntelligence, "summary" | "computedAt" | "version">,
  computedAt: string,
): LeadIntelligence["summary"] {
  const notes = (lead.callLogs || [])
    .slice(-3)
    .map((l) => String(l.note || "").trim())
    .filter(Boolean);
  const parts = [
    `Status: ${lead.status || "—"}`,
    lead.followUpDate || lead.followUpOn
      ? `FU: ${lead.followUpDate || lead.followUpOn}`
      : "FU: none",
    `Score ${intel.score} (${intel.scoreBand})`,
    `Health: ${intel.health}`,
    intel.healthReasons.length
      ? `Risk: ${intel.healthReasons.slice(0, 2).join("; ")}`
      : "",
    notes.length ? `Notes: ${notes.join(" | ")}` : "",
  ].filter(Boolean);

  const text = parts.join(" · ").slice(0, 400);
  return { text, source: "rules", updatedAt: computedAt };
}

export function computeLeadIntelligence(
  lead: LeadActivitySnapshot & { id?: string },
  options: ComputeLeadIntelligenceOptions = {},
): LeadIntelligence {
  const todayYmd = options.todayYmd ?? getIstDateString();
  const nowMs = options.nowMs ?? Date.now();
  const computedAt = new Date(nowMs).toISOString();

  let duplicateRisk: DuplicateRisk = options.duplicateRisk ?? "none";
  let duplicateCandidateIds = options.duplicateCandidateIds;

  if (options.duplicateRisk == null && options.peers && lead.id) {
    const assessed = assessDuplicateRisk(
      { id: lead.id, phone: lead.phone },
      options.peers,
    );
    duplicateRisk = assessed.duplicateRisk;
    duplicateCandidateIds = assessed.duplicateCandidateIds;
  }

  const health = leadHealthV1(lead, todayYmd);
  const scored = leadScoreV1(lead, {
    todayYmd,
    nowMs,
    duplicateRisk,
  });
  const booking = bookingProbabilityV1(lead, todayYmd);
  const next = nextActionV1(lead, {
    todayYmd,
    duplicateRisk,
    isManagerial: options.isManagerial,
    health: health.health,
  });

  const core: Omit<LeadIntelligence, "summary" | "computedAt" | "version"> = {
    score: scored.score,
    scoreBand: scored.scoreBand,
    scoreFactors: scored.scoreFactors,
    bookingProbability: booking.bookingProbability,
    health: health.health,
    healthReasons: health.healthReasons,
    staleDays: health.staleDays,
    duplicateRisk,
    duplicateCandidateIds:
      duplicateCandidateIds && duplicateCandidateIds.length > 0
        ? duplicateCandidateIds
        : undefined,
    nextAction: next.nextAction,
  };

  const includeSummary = options.includeSummary !== false;

  return {
    ...core,
    summary: includeSummary
      ? buildRulesBrief(lead, core, computedAt)
      : undefined,
    computedAt,
    version: LEAD_SCORE_VERSION_V1,
  };
}
