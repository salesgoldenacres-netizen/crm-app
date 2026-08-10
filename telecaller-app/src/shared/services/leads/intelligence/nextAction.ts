/**
 * next-action-v1 — single recommended next step.
 */

import {
  LEAD_NEXT_ACTION_VERSION_V1,
  decideNextActionV1,
  getIstDateString,
  isTerminalLeadStatus,
  normalizeLeadStatus,
  type DuplicateRisk,
  type LeadHealthBand,
  type LeadNextAction,
} from "@/shared/contracts";
import {
  countTrailingRnrOrUnanswered,
  getOverdueDays,
  getStaleDays,
  hadConnectedCall,
  resolveFollowUpYmd,
  type LeadActivitySnapshot,
} from "@/shared/contracts/leadActivity";

export interface NextActionOptions {
  todayYmd?: string;
  duplicateRisk?: DuplicateRisk;
  isManagerial?: boolean;
  health?: LeadHealthBand;
}

export interface NextActionResult {
  nextAction: LeadNextAction;
  version: typeof LEAD_NEXT_ACTION_VERSION_V1;
}

export function nextActionV1(
  lead: LeadActivitySnapshot,
  options: NextActionOptions = {},
): NextActionResult {
  const todayYmd = options.todayYmd ?? getIstDateString();
  const status = normalizeLeadStatus(lead.status) || String(lead.status || "");
  const fu = resolveFollowUpYmd(lead);
  const overdueDays = getOverdueDays(lead, todayYmd);

  const nextAction = decideNextActionV1({
    duplicateRisk: options.duplicateRisk ?? "none",
    isManagerial: options.isManagerial ?? false,
    status,
    hasSiteVisit: Boolean(lead.siteVisit),
    followUpToday: fu === todayYmd,
    followUpOverdue: overdueDays > 0,
    consecutiveRnrOrUnanswered: countTrailingRnrOrUnanswered(lead),
    staleDays: getStaleDays(lead, todayYmd),
    hadPriorConnect: hadConnectedCall(lead),
    health: options.health ?? "healthy",
    isTerminal: isTerminalLeadStatus(status),
  });

  return { nextAction, version: LEAD_NEXT_ACTION_VERSION_V1 };
}
