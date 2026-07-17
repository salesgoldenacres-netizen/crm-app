/**
 * Intelligence snapshot for AI prompts.
 * Never forks score / health / next-action formulas — calls
 * `computeLeadIntelligence` (or accepts a precomputed snapshot).
 */

import { computeLeadIntelligence } from "@/features/leads/intelligence";
import type {
  BuildIntelligenceContextOptions,
  IntelligenceContextPack,
  LeadContextSource,
} from "./types";

export function buildIntelligenceContext(
  lead: LeadContextSource,
  options: BuildIntelligenceContextOptions = {},
): IntelligenceContextPack {
  const { intelligence: precomputed, ...computeOptions } = options;
  const intel =
    precomputed ?? computeLeadIntelligence(lead, computeOptions);

  const pack: IntelligenceContextPack = {
    score: intel.score,
    scoreBand: intel.scoreBand,
    health: intel.health,
    healthReasons: [...intel.healthReasons],
    staleDays: intel.staleDays,
    duplicateRisk: intel.duplicateRisk,
    bookingProbability: intel.bookingProbability,
    nextActionType: intel.nextAction.type,
    nextActionReason: intel.nextAction.reason,
    version: intel.version,
    computedAt: intel.computedAt,
  };

  if (intel.nextAction.channel) {
    pack.nextActionChannel = intel.nextAction.channel;
  }

  if (intel.summary?.text) {
    pack.rulesSummary = intel.summary.text;
  }

  return pack;
}
