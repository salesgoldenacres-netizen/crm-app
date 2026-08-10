/**
 * Context builder DTOs for Wave 7 AI.
 * Slot bags for `AiRunInput.context` — no CRM writes, no provider I/O.
 */

import type { LeadIntelligence } from "@/shared/contracts";
import type { ComputeLeadIntelligenceOptions } from "@/shared/services/leads/intelligence";
import type { LeadActivitySnapshot } from "@/shared/contracts/leadActivity";

/** Minimal lead shape for allowlisted context (store Lead is compatible). */
export interface LeadContextSource extends LeadActivitySnapshot {
  id?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  status?: string | null;
  priority?: string | null;
  source?: string | null;
  leadSource?: string | null;
  leadMedium?: string | null;
  budget?: string | null;
  tags?: string[] | null;
  projectId?: string | null;
  assignedToName?: string | null;
  leadNumber?: string | null;
  notes?: string | null;
  siteVisit?: {
    date?: string;
    time?: string;
    status?: string;
  } | null;
}

/** Timeline event subset — matches `TimelineEvent` summaries without requiring Firestore. */
export interface TimelineContextEvent {
  type?: string;
  summary?: string;
  timestamp?: string;
  createdAt?: string;
  source?: string;
}

export interface BuildLeadContextOptions {
  /** Include masked last-4 phone (default omit entirely). */
  includePhoneLast4?: boolean;
  /** Max chars for scrubbed notes snippet (0 = omit notes). Default 120. */
  notesMaxChars?: number;
}

export interface LeadContextPack {
  leadId: string;
  status: string;
  statusLabel: string;
  priority?: string;
  source?: string;
  followUpDate?: string;
  hasSiteVisit: boolean;
  siteVisitDate?: string;
  siteVisitStatus?: string;
  budget?: string;
  tags?: string[];
  projectId?: string;
  leadNumber?: string;
  /** Scrubbed notes snippet — never raw PII dumps. */
  notesSnippet?: string;
  /** Present only when `includePhoneLast4` is true. */
  phoneLast4?: string;
}

export interface BuildTimelineContextOptions {
  /** Max events to include (most recent first). Default 8. */
  maxEvents?: number;
  /** Cap per-event summary chars. Default 200 (timeline discipline). */
  summaryMaxChars?: number;
}

export interface TimelineContextPack {
  eventCount: number;
  includedCount: number;
  recent: Array<{
    type: string;
    summary: string;
    timestamp: string;
  }>;
  /** Newline-joined lines for `lead-brief-v1` `timelineSummary` slot. */
  timelineSummary: string;
}

export interface BuildAutomationContextOptions {
  todayYmd?: string;
  nowMs?: number;
}

export interface AutomationContextPack {
  overdueDays: number;
  followUpOverdue: boolean;
  followUpMissing: boolean;
  followUpYmd?: string;
  idleDays: number;
  idleWatch: boolean;
  stuckRisk: boolean;
  isTerminal: boolean;
  /** Shared threshold mirrors (for prompt grounding, not recomputed policy). */
  thresholds: {
    leadIdleDays: number;
    stuckLeadDays: number;
    slaFirstTouchHours: number;
  };
  /** Human-readable signal lines for `facts` composition. */
  signals: string[];
}

export interface BuildIntelligenceContextOptions
  extends ComputeLeadIntelligenceOptions {
  /**
   * Prefer precomputed snapshot when the feature already ran
   * `computeLeadIntelligence` — never fork formulas here.
   */
  intelligence?: LeadIntelligence;
}

export interface IntelligenceContextPack {
  score: number;
  scoreBand: LeadIntelligence["scoreBand"];
  health: LeadIntelligence["health"];
  healthReasons: string[];
  staleDays: number;
  duplicateRisk: LeadIntelligence["duplicateRisk"];
  bookingProbability: number;
  nextActionType: LeadIntelligence["nextAction"]["type"];
  nextActionReason: string;
  nextActionChannel?: LeadIntelligence["nextAction"]["channel"];
  /** Rules summary text when present (`source: rules`). */
  rulesSummary?: string;
  version: string;
  computedAt: string;
}

/** Exact `lead-brief-v1` template slots (`AiRunInput.context`). */
export interface LeadBriefV1ContextSlots {
  statusLabel: string;
  scoreBand: string;
  health: string;
  nextActionType: string;
  nextActionReason: string;
  timelineSummary: string;
  facts: string;
}

export interface BuildLeadBriefContextInput {
  lead: LeadContextSource;
  timelineEvents?: TimelineContextEvent[];
  leadOptions?: BuildLeadContextOptions;
  timelineOptions?: BuildTimelineContextOptions;
  automationOptions?: BuildAutomationContextOptions;
  intelligenceOptions?: BuildIntelligenceContextOptions;
}

export interface LeadBriefContextPack {
  /** Ready for `orchestrator.run(..., { context: slots })`. */
  slots: LeadBriefV1ContextSlots;
  lead: LeadContextPack;
  timeline: TimelineContextPack;
  automation: AutomationContextPack;
  intelligence: IntelligenceContextPack;
}
