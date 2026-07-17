/**
 * Sales Copilot (Wave 7 Phase 2C / SC-1) — feature barrel.
 * Import from `@/features/leads/copilot` in Lead Detail / future surfaces.
 * AI brief via `createAiRuntime()`; rules fallback when AI off / unavailable.
 * Read-only — no confirm-write CTAs in this phase.
 */

export { default as SalesCopilotDrawer } from "./SalesCopilotDrawer";
export type { SalesCopilotDrawerProps } from "./SalesCopilotDrawer";

export { default as LeadBriefCard } from "./LeadBriefCard";
export type {
  LeadBriefCardProps,
  LeadBriefCardStatus,
  LeadBriefFallbackKind,
} from "./LeadBriefCard";

export { default as ProposalRenderer } from "./ProposalRenderer";
export type {
  ProposalRendererProps,
  ProposalRenderModel,
} from "./ProposalRenderer";
export { buildProposalRenderModel } from "./ProposalRenderer";

export { default as ConfirmActionDialog } from "./ConfirmActionDialog";
export type { ConfirmActionDialogProps } from "./ConfirmActionDialog";

export { default as CopilotAlert } from "./CopilotAlert";
export type { CopilotAlertProps, CopilotAlertTone } from "./CopilotAlert";

export { useOnlineStatus } from "./useOnlineStatus";

export { default as NextActionCard } from "./NextActionCard";
export type { NextActionCardProps } from "./NextActionCard";

export { default as ReadinessCard } from "./ReadinessCard";
export type { ReadinessCardProps } from "./ReadinessCard";

export { default as TimelineHighlights } from "./TimelineHighlights";
export type {
  TimelineHighlightItem,
  TimelineHighlightsProps,
} from "./TimelineHighlights";

export { buildCopilotContext } from "./buildCopilotContext";
export type {
  BuildCopilotContextInput,
  CopilotContextPack,
} from "./buildCopilotContext";

export {
  AI_SUMMARY_UNAVAILABLE,
  secureLeadBriefOutput,
} from "./secureCopilotOutput";
export type {
  SecureLeadBriefResult,
  SecureLeadBriefOk,
  SecureLeadBriefFail,
} from "./secureCopilotOutput";
