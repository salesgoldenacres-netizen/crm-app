import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import Drawer from "@/shared/components/ui/Drawer";
import {
  LEAD_BRIEF_V1_ID,
  createProposalExecutor,
  createAiRuntime,
  isAiEnabled,
  validateProposalForExecution,
  type AiActionProposal,
  type AiResultSource,
  type LeadBriefV1ContextSlots,
  type LeadBriefV1Output,
  type AssignmentValidationResult,
} from "@/shared/ai";
import type { Lead } from "@/shared/types";
import CopilotAlert from "./CopilotAlert";
import ConfirmActionDialog from "./ConfirmActionDialog";
import LeadBriefCard, {
  type LeadBriefCardStatus,
  type LeadBriefFallbackKind,
} from "./LeadBriefCard";
import NextActionCard, { type NextActionCardProps } from "./NextActionCard";
import ProposalRenderer from "./ProposalRenderer";
import ReadinessCard, { type ReadinessCardProps } from "./ReadinessCard";
import TimelineHighlights, {
  type TimelineHighlightsProps,
} from "./TimelineHighlights";
import {
  AI_SUMMARY_UNAVAILABLE,
  secureLeadBriefOutput,
} from "./secureCopilotOutput";
import { useOnlineStatus } from "./useOnlineStatus";
import { useAuthorization } from "@/shared/services/AuthorizationContext";

export interface SalesCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  /** Optional display name in the drawer subtitle. */
  leadName?: string;
  /** Full lead snapshot for current values + execution routing. */
  lead: Lead;
  /**
   * Prebuilt `lead-brief-v1` template slots from `buildLeadBriefContext` /
   * `buildCopilotContext`. Drawer does not fetch CRM — pass from host.
   */
  contextSlots?: LeadBriefV1ContextSlots | Record<string, unknown>;
  /** Authenticated user id (audit). */
  userId?: string;
  /** Authenticated username for note execution + dialog audit copy. */
  actorName?: string;
  /** Role for capability gate / Agent 4 safety. */
  role?: string;
  /** Assignable users reused by assignment proposals. */
  assignableUsers?: Array<{ id: string; username: string; status?: string }>;
  /** Shared Wave 6 lead update path; AI never writes directly. */
  updateLead: (leadId: string, patch: Partial<Lead>) => Promise<void>;
  /** Shared Wave 6 note path; used for `ADD_NOTE` proposals only. */
  logCall: (
    leadId: string,
    payload: {
      note: string;
      status: string;
      followUpDate?: string;
      agent?: string;
      duration?: number;
      callType?: "incoming" | "outgoing";
      picked?: boolean;
      timelineActivity?: "call" | "note" | "none";
    },
  ) => Promise<void>;
  /**
   * NBA display props from Wave 6 `next-action-v1` (via `computeLeadIntelligence`).
   * Do not recompute inside the drawer.
   */
  nextAction?: NextActionCardProps;
  /** Booking readiness from `pBook-v1` + explainable gaps. */
  readiness?: ReadinessCardProps;
  /** Timeline highlights / summary from context builders. */
  timeline?: TimelineHighlightsProps;
  /**
   * Wave 6 rules summary shaped as `LeadBriefV1Output`.
   * Used when AI is disabled or orchestrator fails — same Lead Brief card.
   */
  rulesBrief?: LeadBriefV1Output | null;
  /**
   * Optional host banner. Agent 4 also sets this internally to
   * {@link AI_SUMMARY_UNAVAILABLE} when AI output fails safety validation.
   * Never pass raw provider / prompt / stack text here.
   */
  safetyNotice?: string;
}

type BriefState = {
  status: LeadBriefCardStatus;
  data: LeadBriefV1Output | null;
  source?: AiResultSource;
  errorMessage?: string;
  /** True when showing Wave 6 rules because AI is off / unavailable. */
  usedRulesFallback?: boolean;
  fallbackKind?: LeadBriefFallbackKind;
};

const INITIAL_BRIEF: BriefState = {
  status: "idle",
  data: null,
};

function rulesFallbackState(
  rulesBrief: LeadBriefV1Output | null | undefined,
  options?: {
    /** Safe, user-facing reason only — never raw provider / stack text. */
    reason?: string;
    fallbackKind?: LeadBriefFallbackKind;
  },
): BriefState {
  const reason = options?.reason;
  const fallbackKind = options?.fallbackKind;

  if (rulesBrief?.brief) {
    return {
      status: "ready",
      data: rulesBrief,
      source: "rules",
      usedRulesFallback: true,
      errorMessage: reason,
      fallbackKind:
        fallbackKind ??
        (reason ? "error" : "ai_off"),
    };
  }
  if (reason) {
    return {
      status: "error",
      data: null,
      errorMessage: reason,
      fallbackKind: fallbackKind ?? "error",
    };
  }
  return {
    status: "disabled",
    data: null,
    fallbackKind: fallbackKind ?? "ai_off",
  };
}

/**
 * Sales Copilot drawer (Wave 7 Phase 2C / SC-1).
 *
 * - Shared DLS `Drawer` only.
 * - Read-only: `createAiRuntime().run(lead-brief-v1)` when AI enabled + online
 *   (factory selects stub vs live Gemini; no vendor SDK in this feature).
 * - Agent 4: every AI payload → `validateResponse` + `redactPII` before display.
 * - Fallback: Wave 6 rules brief → same Lead Brief / NBA / readiness / timeline cards.
 * - W7-AI-3: proposals may execute only after human confirmation via shared APIs.
 * - No Firestore / no direct CRM writes from this panel.
 */
export default function SalesCopilotDrawer({
  isOpen,
  onClose,
  leadId,
  leadName,
  lead,
  contextSlots,
  userId,
  actorName,
  role,
  assignableUsers,
  updateLead,
  logCall,
  nextAction,
  readiness,
  timeline,
  rulesBrief,
  safetyNotice: hostSafetyNotice,
}: SalesCopilotDrawerProps) {
  const descriptionId = useId();
  const { canExecuteProposal } = useAuthorization();
  const isOnline = useOnlineStatus();
  const [brief, setBrief] = useState<BriefState>(INITIAL_BRIEF);
  /** Set when AI output fails display safety — never raw provider text. */
  const [safetyNotice, setSafetyNotice] = useState<string | undefined>();
  const [retryToken, setRetryToken] = useState(0);
  const [selectedProposal, setSelectedProposal] =
    useState<AiActionProposal | null>(null);
  const [isExecutingProposal, setIsExecutingProposal] = useState(false);
  const [proposalFeedback, setProposalFeedback] = useState<{
    tone: "info" | "warning" | "danger";
    title: string;
    description: string;
  } | null>(null);
  const [executedProposalIds, setExecutedProposalIds] = useState<string[]>([]);
  const confirmingProposalIdsRef = useRef<Set<string>>(new Set());
  const executedProposalIdsRef = useRef<Set<string>>(new Set());
  const requestControllerRef = useRef<AbortController | null>(null);
  const requestTokenRef = useRef(0);
  const aiEnabled = isAiEnabled();
  const executedProposalIdSet = useMemo(
    () => new Set(executedProposalIds),
    [executedProposalIds],
  );

  const resolveAssigneeName = useCallback(
    (assignedTo: string) =>
      assignableUsers?.find((u) => u.id === assignedTo)?.username,
    [assignableUsers],
  );

  const resolveAssignee = useCallback(
    (assignedTo: string) => assignableUsers?.find((u) => u.id === assignedTo),
    [assignableUsers],
  );

  const validateAssignment = useCallback(
    (userId: string): AssignmentValidationResult => {
      const matched = assignableUsers?.find((u) => u.id === userId);
      if (!matched) {
        return {
          valid: false,
          code: "USER_NOT_FOUND",
          reason: `Proposed assignee ID "${userId}" was not found in the CRM directory.`,
        };
      }
      if (matched.status === "inactive") {
        return {
          valid: false,
          code: "USER_INACTIVE",
          reason: `Proposed assignee "${matched.username}" is inactive and cannot receive lead assignments.`,
        };
      }
      return { valid: true };
    },
    [assignableUsers],
  );

  const proposalExecutor = useMemo(
    () =>
      createProposalExecutor({
        updateLead,
        logCall,
        resolveAssigneeName,
        resolveAssignee,
        validateAssignment,
      }),
    [logCall, resolveAssignee, resolveAssigneeName, updateLead, validateAssignment],
  );

  const handleRetry = useCallback(() => {
    setRetryToken((n) => n + 1);
  }, []);

  const handleReviewProposal = useCallback((proposal: AiActionProposal) => {
    setProposalFeedback(null);
    setSelectedProposal(proposal);
  }, []);

  const handleCloseProposalDialog = useCallback(() => {
    if (isExecutingProposal) return;
    setSelectedProposal(null);
  }, [isExecutingProposal]);

  const executableProposals = useMemo(() => {
    if (!aiEnabled || brief.status !== "ready" || brief.usedRulesFallback) {
      return [];
    }
    const proposals = brief.data?.proposals;
    if (!proposals || proposals.length === 0) return [];

    const seenIds = new Set<string>();
    const valid: AiActionProposal[] = [];
    for (const proposal of proposals) {
      const validated = validateProposalForExecution(proposal, {
        lead,
        seenProposalIds: seenIds,
        executedProposalIds: executedProposalIdSet,
      });
      if (!validated.ok) continue;
      valid.push(validated.value);
      seenIds.add(validated.value.id);
    }
    return valid;
  }, [
    aiEnabled,
    brief.data,
    brief.status,
    brief.usedRulesFallback,
    executedProposalIdSet,
    lead,
  ]);

  const handleConfirmProposal = useCallback(async () => {
    if (!selectedProposal) return;

    // Hardened re-verification immediately before execution
    if (!canExecuteProposal(selectedProposal.type, lead)) {
      setProposalFeedback({
        tone: "danger",
        title: "Unauthorized action",
        description: "You do not have permission to execute this AI action.",
      });
      return;
    }

    setIsExecutingProposal(true);
    setProposalFeedback(null);
    try {
      const result = await proposalExecutor.execute({
        proposal: selectedProposal,
        lead,
        confirmed: true,
        actor: {
          userId: userId || "unknown-user",
          username: actorName || "Agent",
        },
        confirmingProposalIds: confirmingProposalIdsRef.current,
        executedProposalIds: executedProposalIdsRef.current,
      });

      if (result.ok) {
        setExecutedProposalIds((prev) =>
          prev.includes(result.proposal.id) ? prev : [...prev, result.proposal.id],
        );
        setProposalFeedback({
          tone: "info",
          title: "Action applied",
          description: `${result.proposal.title} was applied using the existing CRM flow.`,
        });
      } else {
        setProposalFeedback({
          tone:
            result.status === "FAILED"
              ? "danger"
              : result.status === "PENDING_CONFIRMATION"
                ? "warning"
                : "warning",
          title:
            result.status === "FAILED"
              ? "Action failed"
              : "Action not applied",
          description: result.error.message,
        });
      }
      setSelectedProposal(null);
    } finally {
      setIsExecutingProposal(false);
    }
  }, [actorName, lead, proposalExecutor, selectedProposal, userId, canExecuteProposal]);

  useEffect(() => {
    if (!isOpen) return;

    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    const requestToken = requestTokenRef.current + 1;
    requestTokenRef.current = requestToken;

    const isCurrentRequest = () =>
      requestControllerRef.current === controller &&
      requestTokenRef.current === requestToken &&
      !controller.signal.aborted;

    const loadBrief = async () => {
      // Defer so setState is not synchronous inside the effect body (render purity).
      await Promise.resolve();
      if (!isCurrentRequest()) return;

      setSafetyNotice(undefined);

      // Offline → rules only (Agent 3); no AI call.
      if (!isOnline) {
        setBrief(
          rulesFallbackState(rulesBrief, { fallbackKind: "offline" }),
        );
        return;
      }

      if (!aiEnabled) {
        setBrief(rulesFallbackState(rulesBrief, { fallbackKind: "ai_off" }));
        return;
      }

      setBrief({ status: "loading", data: null });

      try {
        // Product path: flag + ProviderFactory (stub | gemini) via createAiRuntime.
        const orchestrator = createAiRuntime();

        const result = await orchestrator.run(LEAD_BRIEF_V1_ID, {
          leadId,
          userId,
          role,
          context: contextSlots as Record<string, unknown> | undefined,
          metadata: { leadId },
          signal: controller.signal,
        });

        if (!isCurrentRequest()) return;

        if (result.ok) {
          // Agent 4: never render raw orchestrator data — validate + redact first.
          const secured = secureLeadBriefOutput(result.data);
          if (!secured.ok) {
            setSafetyNotice(secured.notice);
            setBrief(
              rulesFallbackState(rulesBrief, {
                reason: AI_SUMMARY_UNAVAILABLE,
                fallbackKind: "error",
              }),
            );
            return;
          }

          setBrief({
            status: "ready",
            data: secured.data,
            source: result.source,
            usedRulesFallback: false,
          });
          return;
        }

        // AI disabled → quiet rules fallback (no safety banner).
        if (result.error.code === "AI_DISABLED") {
          setBrief(rulesFallbackState(rulesBrief, { fallbackKind: "ai_off" }));
          return;
        }

        // Safety / invalid output: withhold raw messages; banner + safe copy.
        if (
          result.error.code === "SAFETY_VIOLATION" ||
          result.error.code === "INVALID_OUTPUT"
        ) {
          setSafetyNotice(AI_SUMMARY_UNAVAILABLE);
          setBrief(
            rulesFallbackState(rulesBrief, {
              reason: AI_SUMMARY_UNAVAILABLE,
              fallbackKind: "error",
            }),
          );
          return;
        }

        // Other failures (UNAUTHORIZED, CONTEXT_TOO_LARGE, PROVIDER_ERROR, …):
        // rules fallback without leaking provider / prompt / stack text.
        setBrief(
          rulesFallbackState(rulesBrief, {
            reason: AI_SUMMARY_UNAVAILABLE,
            fallbackKind: "error",
          }),
        );
      } catch {
        if (!isCurrentRequest()) return;
        // Never surface err.message / stack to the user.
        setBrief(
          rulesFallbackState(rulesBrief, {
            reason: AI_SUMMARY_UNAVAILABLE,
            fallbackKind: "error",
          }),
        );
      }
    };

    void loadBrief();

    return () => {
      controller.abort();
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }
    };
  }, [
    aiEnabled,
    isOpen,
    isOnline,
    leadId,
    userId,
    role,
    contextSlots,
    rulesBrief,
    retryToken,
  ]);

  // Reset when closed so the next open starts clean.
  useEffect(() => {
    if (isOpen) return;
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) {
        setBrief(INITIAL_BRIEF);
        setSafetyNotice(undefined);
        setSelectedProposal(null);
        setProposalFeedback(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    executedProposalIdsRef.current = new Set(executedProposalIds);
  }, [executedProposalIds]);

  useEffect(() => {
    executedProposalIdsRef.current = new Set();
    confirmingProposalIdsRef.current = new Set();
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setExecutedProposalIds([]);
      setSelectedProposal(null);
      setProposalFeedback(null);
    });
    return () => {
      cancelled = true;
    };
  }, [lead.id]);

  const bannerNotice = safetyNotice || hostSafetyNotice;
  const showRetry =
    brief.fallbackKind === "error" || brief.status === "error";

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Sales Copilot"
      size="md"
      position="right"
      descriptionId={descriptionId}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2">
          <Sparkles
            className="w-4 h-4 text-theme-accent shrink-0 mt-0.5"
            aria-hidden
          />
          <div className="min-w-0">
            <p
              id={descriptionId}
              className="text-xs text-theme-muted leading-relaxed"
            >
              Read-only coaching for{" "}
              <span className="font-semibold text-theme-text">
                {leadName || leadId}
              </span>
              . Recommendations only — no CRM writes from this panel.
            </p>
          </div>
        </div>

        {bannerNotice && (
          <CopilotAlert tone="warning" title="Safety">
            {bannerNotice}
          </CopilotAlert>
        )}

        {proposalFeedback && (
          <CopilotAlert tone={proposalFeedback.tone} title={proposalFeedback.title}>
            {proposalFeedback.description}
          </CopilotAlert>
        )}

        <LeadBriefCard
          status={brief.status}
          data={brief.data}
          source={brief.source}
          errorMessage={
            brief.usedRulesFallback && brief.errorMessage
              ? brief.errorMessage
              : brief.status === "error"
                ? brief.errorMessage
                : undefined
          }
          usedRulesFallback={brief.usedRulesFallback}
          fallbackKind={brief.fallbackKind}
          onRetry={showRetry ? handleRetry : undefined}
        />

        {executableProposals.length > 0 && (
          <div className="space-y-2" aria-label="AI proposals">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-theme-muted">
                Proposed actions
              </h3>
              <span className="text-[10px] text-theme-muted">
                Human confirmation required
              </span>
            </div>
            {executableProposals.map((proposal) => (
              <ProposalRenderer
                key={proposal.id}
                proposal={proposal}
                lead={lead}
                resolveAssigneeName={resolveAssigneeName}
                disabled={executedProposalIdSet.has(proposal.id)}
                onReview={handleReviewProposal}
              />
            ))}
          </div>
        )}

        <NextActionCard
          type={nextAction?.type}
          reason={nextAction?.reason}
          channel={nextAction?.channel}
        />

        <ReadinessCard
          bookingProbability={readiness?.bookingProbability}
          gaps={readiness?.gaps}
          band={readiness?.band}
        />

        <TimelineHighlights
          items={timeline?.items}
          summaryText={timeline?.summaryText}
        />
      </div>

      <ConfirmActionDialog
        isOpen={!!selectedProposal}
        proposal={selectedProposal}
        lead={lead}
        isLoading={isExecutingProposal}
        onClose={handleCloseProposalDialog}
        onConfirm={handleConfirmProposal}
        resolveAssigneeName={resolveAssigneeName}
      />
    </Drawer>
  );
}
