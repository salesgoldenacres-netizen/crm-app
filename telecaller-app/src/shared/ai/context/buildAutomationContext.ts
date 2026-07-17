/**
 * Automation / SLA signal pack for AI prompts.
 * Uses shared Wave 6 thresholds + activity helpers — no new magic numbers.
 */

import {
  AUTOMATION_THRESHOLDS,
  getIstDateString,
  isTerminalLeadStatus,
} from "@/shared/contracts";
import {
  getOverdueDays,
  getStaleDays,
  resolveFollowUpYmd,
} from "@/features/leads/intelligence";
import { isFollowUpMissing } from "@/features/leads/intelligence/leadActivity";
import type {
  AutomationContextPack,
  BuildAutomationContextOptions,
  LeadContextSource,
} from "./types";

export function buildAutomationContext(
  lead: LeadContextSource,
  options: BuildAutomationContextOptions = {},
): AutomationContextPack {
  const todayYmd = options.todayYmd ?? getIstDateString(options.nowMs);
  const overdueDays = getOverdueDays(lead, todayYmd);
  const idleDays = getStaleDays(lead, todayYmd);
  const followUpMissing = isFollowUpMissing(lead);
  const followUpYmd = resolveFollowUpYmd(lead) || undefined;
  const isTerminal = isTerminalLeadStatus(lead.status);
  const idleWatch =
    !isTerminal && idleDays >= AUTOMATION_THRESHOLDS.LEAD_IDLE_DAYS;
  const stuckRisk =
    !isTerminal && idleDays >= AUTOMATION_THRESHOLDS.STUCK_LEAD_DAYS;
  const followUpOverdue = !isTerminal && overdueDays > 0;

  const signals: string[] = [];
  if (followUpOverdue) {
    signals.push(`Follow-up overdue ${overdueDays}d`);
  } else if (followUpMissing && !isTerminal) {
    signals.push("Missing follow-up date");
  } else if (followUpYmd) {
    signals.push(`Follow-up scheduled ${followUpYmd}`);
  }

  if (stuckRisk) {
    signals.push(`Stuck-risk idle ${idleDays}d (≥${AUTOMATION_THRESHOLDS.STUCK_LEAD_DAYS}d)`);
  } else if (idleWatch) {
    signals.push(`Idle watch ${idleDays}d (≥${AUTOMATION_THRESHOLDS.LEAD_IDLE_DAYS}d)`);
  }

  if (isTerminal) {
    signals.push("Terminal status — automation signals muted");
  }

  return {
    overdueDays,
    followUpOverdue,
    followUpMissing,
    ...(followUpYmd ? { followUpYmd } : {}),
    idleDays,
    idleWatch,
    stuckRisk,
    isTerminal,
    thresholds: {
      leadIdleDays: AUTOMATION_THRESHOLDS.LEAD_IDLE_DAYS,
      stuckLeadDays: AUTOMATION_THRESHOLDS.STUCK_LEAD_DAYS,
      slaFirstTouchHours: AUTOMATION_THRESHOLDS.SLA_FIRST_TOUCH_HOURS,
    },
    signals,
  };
}
