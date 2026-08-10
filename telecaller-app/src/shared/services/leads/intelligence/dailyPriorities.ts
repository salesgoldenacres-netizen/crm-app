/**
 * Daily priorities ranking — stable sort for work queue / Power Dialer.
 */

import {
  LEAD_INTELLIGENCE_THRESHOLDS,
  getIstDateString,
  healthRankWeight,
  isTerminalLeadStatus,
  normalizeLeadStatus,
  type LeadIntelligence,
} from "@/shared/contracts";
import {
  resolveFollowUpYmd,
  type LeadActivitySnapshot,
} from "@/shared/contracts/leadActivity";
import { computeLeadIntelligence } from "./computeLeadIntelligence";

export interface RankableLead extends LeadActivitySnapshot {
  id: string;
}

export interface DailyPriorityItem {
  leadId: string;
  intelligence: LeadIntelligence;
}

export interface DailyPrioritiesOptions {
  todayYmd?: string;
  nowMs?: number;
  limit?: number;
  includeTerminal?: boolean;
  isManagerial?: boolean;
  allLeadsForDupScan?: Array<{ id: string; phone?: string | null }>;
}

function comparePriorityItems(a: DailyPriorityItem, b: DailyPriorityItem): number {
  const hw =
    healthRankWeight(b.intelligence.health) -
    healthRankWeight(a.intelligence.health);
  if (hw !== 0) return hw;

  if (b.intelligence.score !== a.intelligence.score) {
    return b.intelligence.score - a.intelligence.score;
  }

  if (b.intelligence.staleDays !== a.intelligence.staleDays) {
    // tie-break handled in outer sort
  }

  return a.leadId.localeCompare(b.leadId);
}

export function rankDailyPriorities(
  leads: RankableLead[],
  options: DailyPrioritiesOptions = {},
): DailyPriorityItem[] {
  const todayYmd = options.todayYmd ?? getIstDateString();
  const limit =
    options.limit ?? LEAD_INTELLIGENCE_THRESHOLDS.DAILY_PRIORITIES_DEFAULT_LIMIT;
  const peers = options.allLeadsForDupScan ?? leads;

  const eligible = leads.filter((lead) => {
    if (options.includeTerminal) return true;
    const status = normalizeLeadStatus(lead.status) || lead.status;
    if (status === "booked" || status === "not-interested") return false;
    if (isTerminalLeadStatus(status) && status !== "reserved") return false;
    return true;
  });

  const enriched = eligible.map((lead) => {
    const intelligence = computeLeadIntelligence(lead, {
      todayYmd,
      nowMs: options.nowMs,
      isManagerial: options.isManagerial,
      peers,
    });
    return { lead, item: { leadId: lead.id, intelligence } };
  });

  enriched.sort((a, b) => {
    const base = comparePriorityItems(a.item, b.item);
    if (base !== 0) return base;

    const aFu = resolveFollowUpYmd(a.lead);
    const bFu = resolveFollowUpYmd(b.lead);
    const aOverdue = Boolean(aFu && aFu < todayYmd);
    const bOverdue = Boolean(bFu && bFu < todayYmd);

    if (aOverdue && bOverdue && aFu !== bFu) {
      return aFu.localeCompare(bFu);
    }
    if (aOverdue && !bOverdue) return -1;
    if (bOverdue && !aOverdue) return 1;

    if (aFu && bFu && aFu !== bFu) return aFu.localeCompare(bFu);
    if (aFu && !bFu) return -1;
    if (!aFu && bFu) return 1;

    const aUp = String(a.lead.updatedAt || "");
    const bUp = String(b.lead.updatedAt || "");
    if (aUp !== bUp) return bUp.localeCompare(aUp);

    return a.lead.id.localeCompare(b.lead.id);
  });

  return enriched.slice(0, limit).map((e) => e.item);
}

export function rankPowerDialerQueue(
  leads: RankableLead[],
  options: Omit<DailyPrioritiesOptions, "limit"> = {},
): string[] {
  return rankDailyPriorities(leads, {
    ...options,
    limit: leads.length,
  }).map((item) => item.leadId);
}
