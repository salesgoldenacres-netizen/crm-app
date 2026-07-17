/**
 * Wave 7 AI context builders — read-only CRM digests for prompt slots.
 */

export { buildLeadContext } from "./buildLeadContext";
export { buildTimelineContext } from "./buildTimelineContext";
export { buildAutomationContext } from "./buildAutomationContext";
export { buildIntelligenceContext } from "./buildIntelligenceContext";
export {
  buildLeadBriefContext,
  buildLeadBriefContextSlots,
} from "./buildLeadBriefContext";
export {
  digitsOnly,
  phoneLast4,
  redactPhone,
  redactEmail,
  scrubPiiFromText,
} from "./redact";
export type {
  LeadContextSource,
  TimelineContextEvent,
  BuildLeadContextOptions,
  LeadContextPack,
  BuildTimelineContextOptions,
  TimelineContextPack,
  BuildAutomationContextOptions,
  AutomationContextPack,
  BuildIntelligenceContextOptions,
  IntelligenceContextPack,
  LeadBriefV1ContextSlots,
  BuildLeadBriefContextInput,
  LeadBriefContextPack,
} from "./types";
