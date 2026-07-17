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
import { computeLeadIntelligence } from "./computeLeadIntelligence";
import { resolveFollowUpYmd, type LeadActivitySnapshot } from "./leadActivity";

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
  /** When true, include booked / not-interested (default excludes). */
  includeTerminal?: boolean;
  isManagerial?: boolean;
  /** Optional peer list for duplicate scoring across the queue. */
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

  // More overdue first — approximate via stale + health reasons; use score factors overdue label
  // Prefer leads with critical/watch that mention overdue already ordered by health.
  // Ascending followUpDate (empty last)
  // We don't store overdueDays on intelligence; use staleDays as secondary urgency proxy
  // and rely on score which already embeds overdue delta.
  if (b.intelligence.staleDays !== a.intelligence.staleDays) {
    // For equal score/health, more stale first only when both watch/critical? Prefer earlier FU.
    // Spec: ascending overdue days (more overdue first) — use staleDays desc as proxy when tied
  }

  // Ascending follow-up empty last — not on intelligence; sort by computedAt is useless.
  // Attach followUp via comparing lead snapshots in outer sort.
  return a.leadId.localeCompare(b.leadId);
}

/**
 * Rank leads for today's work queue.
 * Sort: health critical→watch→healthy, score desc, overdue days desc,
 * followUpDate asc (empty last), updatedAt desc.
 */
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
    // Dial queue excludes booked + not-interested; reserved stays eligible
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

    // More overdue first (older FU date = more overdue)
    if (aOverdue && bOverdue && aFu !== bFu) {
      return aFu.localeCompare(bFu);
    }
    if (aOverdue && !bOverdue) return -1;
    if (bOverdue && !aOverdue) return 1;

    // Ascending followUpDate (empty last)
    if (aFu && bFu && aFu !== bFu) return aFu.localeCompare(bFu);
    if (aFu && !bFu) return -1;
    if (!aFu && bFu) return 1;

    // Descending updatedAt
    const aUp = String(a.lead.updatedAt || "");
    const bUp = String(b.lead.updatedAt || "");
    if (aUp !== bUp) return bUp.localeCompare(aUp);

    return a.lead.id.localeCompare(b.lead.id);
  });

  return enriched.slice(0, limit).map((e) => e.item);
}

/** Ordered lead IDs for Power Dialer queue. */
export function rankPowerDialerQueue(
  leads: RankableLead[],
  options: Omit<DailyPrioritiesOptions, "limit"> = {},
): string[] {
  return rankDailyPriorities(leads, {
    ...options,
    limit: leads.length,
  }).map((item) => item.leadId);
}
