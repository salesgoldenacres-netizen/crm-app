/**
 * Compose Wave 6 lead / timeline / automation / intelligence packs into
 * `lead-brief-v1` template slots for `AiOrchestrator.run`.
 *
 * Read-only. No CRM writes. No provider calls.
 */

import { buildAutomationContext } from "./buildAutomationContext";
import { buildIntelligenceContext } from "./buildIntelligenceContext";
import { buildLeadContext } from "./buildLeadContext";
import { buildTimelineContext } from "./buildTimelineContext";
import type {
  BuildLeadBriefContextInput,
  LeadBriefContextPack,
  LeadBriefV1ContextSlots,
} from "./types";

function composeFacts(pack: LeadBriefContextPack): string {
  const lines: string[] = [];
  const { lead, automation, intelligence } = pack;

  if (lead.leadId) lines.push(`Lead id: ${lead.leadId}`);
  if (lead.leadNumber) lines.push(`Lead #: ${lead.leadNumber}`);
  if (lead.priority) lines.push(`Manual priority: ${lead.priority}`);
  if (lead.source) lines.push(`Source: ${lead.source}`);
  if (lead.followUpDate) lines.push(`Follow-up date: ${lead.followUpDate}`);
  if (lead.hasSiteVisit) {
    const bits = [
      lead.siteVisitDate ? `date ${lead.siteVisitDate}` : null,
      lead.siteVisitStatus ? `status ${lead.siteVisitStatus}` : null,
    ].filter(Boolean);
    lines.push(
      bits.length ? `Site visit: ${bits.join(", ")}` : "Site visit: yes",
    );
  } else {
    lines.push("Site visit: none");
  }
  if (lead.budget) lines.push(`Budget: ${lead.budget}`);
  if (lead.tags?.length) lines.push(`Tags: ${lead.tags.join(", ")}`);
  if (lead.notesSnippet) lines.push(`Notes: ${lead.notesSnippet}`);
  if (lead.phoneLast4) lines.push(`Phone last4: ${lead.phoneLast4}`);

  lines.push(
    `Score ${intelligence.score} (${intelligence.scoreBand}); health ${intelligence.health}`,
  );
  if (intelligence.healthReasons.length) {
    lines.push(`Health reasons: ${intelligence.healthReasons.join("; ")}`);
  }
  lines.push(`Duplicate risk: ${intelligence.duplicateRisk}`);
  lines.push(`Booking probability: ${intelligence.bookingProbability}`);
  if (intelligence.nextActionChannel) {
    lines.push(`Next-action channel: ${intelligence.nextActionChannel}`);
  }

  for (const signal of automation.signals) {
    lines.push(signal);
  }

  return lines.join("\n");
}

/**
 * Build the full context pack + `lead-brief-v1` slots.
 * Prefer this when wiring Lead Detail / Copilot to the orchestrator.
 */
export function buildLeadBriefContext(
  input: BuildLeadBriefContextInput,
): LeadBriefContextPack {
  const lead = buildLeadContext(input.lead, input.leadOptions);
  const timeline = buildTimelineContext(
    input.timelineEvents,
    input.timelineOptions,
  );
  const automation = buildAutomationContext(
    input.lead,
    input.automationOptions,
  );
  const intelligence = buildIntelligenceContext(
    input.lead,
    input.intelligenceOptions,
  );

  const pack: LeadBriefContextPack = {
    slots: {
      statusLabel: lead.statusLabel,
      scoreBand: intelligence.scoreBand,
      health: intelligence.health,
      nextActionType: intelligence.nextActionType,
      nextActionReason: intelligence.nextActionReason,
      timelineSummary: timeline.timelineSummary,
      facts: "",
    },
    lead,
    timeline,
    automation,
    intelligence,
  };

  pack.slots.facts = composeFacts(pack);
  return pack;
}

/** Convenience: slots only for `AiRunInput.context`. */
export function buildLeadBriefContextSlots(
  input: BuildLeadBriefContextInput,
): LeadBriefV1ContextSlots {
  return buildLeadBriefContext(input).slots;
}
