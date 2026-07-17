/**
 * Wave 7 Phase 2B / Agent 4 — Copilot display safety.
 *
 * Defense-in-depth on top of AiOrchestrator: every user-visible AI payload
 * must pass validateResponse (SafetyGuard post-check) + redactPII before UI.
 * Does not modify `@/shared/ai`.
 */

import {
  parseAiActionProposal,
  redactPII,
  validateResponse,
  type LeadBriefV1Output,
} from "@/shared/ai";

/** Canonical user-facing copy when AI output fails safety / is withheld. */
export const AI_SUMMARY_UNAVAILABLE = "AI summary unavailable.";

export type SecureLeadBriefOk = {
  ok: true;
  data: LeadBriefV1Output;
};

export type SecureLeadBriefFail = {
  ok: false;
  /** Always the safe banner string — never raw provider / prompt / stack. */
  notice: typeof AI_SUMMARY_UNAVAILABLE;
};

export type SecureLeadBriefResult = SecureLeadBriefOk | SecureLeadBriefFail;

function isLeadBriefShape(value: unknown): value is LeadBriefV1Output {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const brief = (value as LeadBriefV1Output).brief;
  return typeof brief === "string" && brief.trim().length > 0;
}

/**
 * Validate + redact orchestrator `lead-brief-v1` data for display.
 * On any failure, callers must show {@link AI_SUMMARY_UNAVAILABLE} and
 * must not render the raw payload.
 */
export function secureLeadBriefOutput(raw: unknown): SecureLeadBriefResult {
  const validated = validateResponse(raw);
  if (!validated.ok) {
    return { ok: false, notice: AI_SUMMARY_UNAVAILABLE };
  }

  const redacted = redactPII(validated.value);
  if (!isLeadBriefShape(redacted)) {
    return { ok: false, notice: AI_SUMMARY_UNAVAILABLE };
  }

  const bullets = Array.isArray(redacted.bullets)
    ? redacted.bullets.filter((b): b is string => typeof b === "string")
    : undefined;
  const rawProposals = Array.isArray(redacted.proposals)
    ? redacted.proposals
    : undefined;
  const proposals = rawProposals?.map((item) => parseAiActionProposal(item));
  if (proposals?.some((item) => item == null)) {
    return { ok: false, notice: AI_SUMMARY_UNAVAILABLE };
  }

  return {
    ok: true,
    data: {
      brief: redacted.brief,
      ...(bullets && bullets.length > 0 ? { bullets } : {}),
      ...(proposals && proposals.length > 0
        ? {
            proposals: proposals.filter(
              (item): item is NonNullable<typeof item> => item != null,
            ),
          }
        : {}),
    },
  };
}
