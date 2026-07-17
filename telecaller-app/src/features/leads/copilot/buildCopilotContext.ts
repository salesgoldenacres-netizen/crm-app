/**
 * Sales Copilot context pack (Wave 7 Phase 2B / Agent 2).
 *
 * Composes Wave 6 `computeLeadIntelligence` + Wave 7 context builders into
 * drawer props. Read-only. No Firestore. No CRM writes. No new NBA / score engine.
 */

import {
  buildLeadBriefContext,
  type LeadBriefV1ContextSlots,
  type LeadBriefV1Output,
  type TimelineContextEvent,
} from "@/shared/ai";
import type { LeadIntelligence } from "@/shared/contracts";
import { getIstDateString } from "@/shared/contracts";
import {
  computeLeadIntelligence,
  type ComputeLeadIntelligenceOptions,
} from "@/features/leads/intelligence";
import type { Lead } from "@/shared/types";
import type { NextActionCardProps } from "./NextActionCard";
import type { ReadinessCardProps } from "./ReadinessCard";
import type { TimelineHighlightsProps } from "./TimelineHighlights";

export interface BuildCopilotContextInput {
  lead: Lead;
  timelineEvents?: TimelineContextEvent[] | null;
  /** Precomputed Wave 6 snapshot — preferred when host already ran intelligence. */
  intelligence?: LeadIntelligence;
  intelligenceOptions?: ComputeLeadIntelligenceOptions;
  todayYmd?: string;
}

export interface CopilotContextPack {
  /** Slots for `AiOrchestrator.run(lead-brief-v1, { context })`. */
  contextSlots: LeadBriefV1ContextSlots;
  nextAction: NextActionCardProps;
  readiness: ReadinessCardProps;
  timeline: TimelineHighlightsProps;
  /**
   * Rules brief from Wave 6 intelligence summary — used when AI is off
   * or orchestrator fails. Same card shape as AI output.
   */
  rulesBrief: LeadBriefV1Output;
  /** Snapshot reused for display / fallback (never fork formulas). */
  intelligence: LeadIntelligence;
}

/** Display band from existing `pBook-v1` prior — labeling only, not a new model. */
function bookingBand(p: number): string {
  if (p >= 0.5) return "high";
  if (p >= 0.2) return "medium";
  return "low";
}

/**
 * Explainable readiness gaps from existing lead + Wave 6 intelligence signals.
 * Does not invent a parallel probability / score formula.
 */
function buildReadinessGaps(
  lead: Lead,
  intel: LeadIntelligence,
): string[] {
  const gaps: string[] = [];
  const status = String(lead.status || "").toLowerCase();

  if (!lead.siteVisit && status === "interested") {
    gaps.push("No site visit scheduled");
  } else if (!lead.siteVisit && intel.bookingProbability < 0.35) {
    gaps.push("Site visit not on file");
  }

  if (!lead.followUpDate && !lead.followUpOn) {
    gaps.push("Missing follow-up date");
  }

  for (const reason of intel.healthReasons.slice(0, 3)) {
    if (reason && !gaps.includes(reason)) gaps.push(reason);
  }

  if (intel.duplicateRisk === "possible" || intel.duplicateRisk === "confirmed") {
    const label = `Duplicate risk: ${intel.duplicateRisk}`;
    if (!gaps.includes(label)) gaps.push(label);
  }

  if (status === "reserved") {
    gaps.push("Close documentation / payment to book");
  }

  return gaps.slice(0, 6);
}

function buildRulesBrief(
  intel: LeadIntelligence,
  timelineSummary: string,
): LeadBriefV1Output {
  const brief =
    intel.summary?.text?.trim() ||
    [
      `Score ${intel.score} (${intel.scoreBand})`,
      `Health: ${intel.health}`,
      `Next: ${intel.nextAction.type.replace(/_/g, " ")} — ${intel.nextAction.reason}`,
    ].join(" · ");

  const bullets: string[] = [
    `Next action: ${intel.nextAction.type.replace(/_/g, " ")}${
      intel.nextAction.channel ? ` · ${intel.nextAction.channel}` : ""
    } — ${intel.nextAction.reason}`,
    `Booking prior ${Math.round(intel.bookingProbability * 100)}% (${bookingBand(
      intel.bookingProbability,
    )})`,
  ];

  if (intel.healthReasons.length > 0) {
    bullets.push(`Health: ${intel.healthReasons.slice(0, 2).join("; ")}`);
  }

  if (timelineSummary.trim()) {
    const firstLine = timelineSummary.split("\n").find((l) => l.trim());
    if (firstLine) {
      bullets.push(`Recent: ${firstLine.replace(/^- /, "").slice(0, 120)}`);
    }
  }

  return { brief, bullets };
}

/**
 * Build Copilot drawer props from lead + preloaded timeline events.
 * Host must supply events (e.g. `useTimelineEvents`) — this helper never queries.
 */
export function buildCopilotContext(
  input: BuildCopilotContextInput,
): CopilotContextPack {
  const todayYmd = input.todayYmd ?? getIstDateString();
  const computeOpts: ComputeLeadIntelligenceOptions = {
    todayYmd,
    ...input.intelligenceOptions,
  };

  const intelligence =
    input.intelligence ??
    computeLeadIntelligence(input.lead, computeOpts);

  const pack = buildLeadBriefContext({
    lead: input.lead,
    timelineEvents: input.timelineEvents ?? undefined,
    intelligenceOptions: {
      ...computeOpts,
      intelligence,
    },
  });

  const nextAction: NextActionCardProps = {
    type: intelligence.nextAction.type,
    reason: intelligence.nextAction.reason,
    channel: intelligence.nextAction.channel,
  };

  const readiness: ReadinessCardProps = {
    bookingProbability: intelligence.bookingProbability,
    band: bookingBand(intelligence.bookingProbability),
    gaps: buildReadinessGaps(input.lead, intelligence),
  };

  const timeline: TimelineHighlightsProps = {
    summaryText: pack.timeline.timelineSummary || undefined,
    items: pack.timeline.recent.map((ev) => ({
      type: ev.type,
      summary: ev.summary,
      timestamp: ev.timestamp || undefined,
    })),
  };

  return {
    contextSlots: pack.slots,
    nextAction,
    readiness,
    timeline,
    rulesBrief: buildRulesBrief(intelligence, pack.timeline.timelineSummary),
    intelligence,
  };
}
