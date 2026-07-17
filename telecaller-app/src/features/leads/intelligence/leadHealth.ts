/**
 * Lead health bands — wraps shared decideLeadHealthBand with lead snapshot inputs.
 */

import {
  decideLeadHealthBand,
  getIstDateString,
  isTerminalLeadStatus,
  type LeadHealthBand,
} from "@/shared/contracts";
import {
  getOverdueDays,
  getStaleDays,
  isFollowUpMissing,
  type LeadActivitySnapshot,
} from "./leadActivity";

export interface LeadHealthResult {
  health: LeadHealthBand;
  healthReasons: string[];
  staleDays: number;
  overdueDays: number;
}

export function leadHealthV1(
  lead: LeadActivitySnapshot,
  todayYmd: string = getIstDateString(),
): LeadHealthResult {
  const staleDays = getStaleDays(lead, todayYmd);
  const overdueDays = getOverdueDays(lead, todayYmd);
  const isTerminal = isTerminalLeadStatus(lead.status);
  const missingFollowUp = !isTerminal && isFollowUpMissing(lead);
  const manualHot = String(lead.priority || "").toLowerCase() === "hot";

  const { health, reasons } = decideLeadHealthBand({
    overdueDays,
    staleDays,
    missingFollowUp,
    manualHot,
    isTerminal,
  });

  return {
    health,
    healthReasons: reasons,
    staleDays,
    overdueDays,
  };
}
