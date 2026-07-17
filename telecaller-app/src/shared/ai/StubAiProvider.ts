/**
 * Local stub provider — no HTTP, no SDK, no API keys.
 * Returns fixtures suitable for CI and feature development before W7-AI-2.
 */

import type { AiProvider } from "./AiProvider";
import { LEAD_BRIEF_V1_ID } from "./PromptRegistry";
import type {
  AiCompletionRequest,
  AiCompletionResult,
  LeadBriefV1Output,
} from "./types";

export const STUB_PROVIDER_ID = "stub";
export const STUB_MODEL_ID = "stub-fixture-v1";

export class StubAiProvider implements AiProvider {
  readonly id = STUB_PROVIDER_ID;
  readonly models = [STUB_MODEL_ID] as const;

  async complete(req: AiCompletionRequest): Promise<AiCompletionResult> {
    const started = Date.now();
    const payload = buildStubPayload(req);
    const latencyMs = Math.max(0, Date.now() - started);

    if (req.responseFormat === "json" || payload.json !== undefined) {
      return {
        json: payload.json,
        text: payload.text,
        model: STUB_MODEL_ID,
        providerId: STUB_PROVIDER_ID,
        latencyMs,
        finishReason: "stop",
        usage: {
          inputTokens: estimateTokens(req),
          outputTokens: estimateOutputTokens(payload.text),
        },
      };
    }

    return {
      text: payload.text,
      model: STUB_MODEL_ID,
      providerId: STUB_PROVIDER_ID,
      latencyMs,
      finishReason: "stop",
      usage: {
        inputTokens: estimateTokens(req),
        outputTokens: estimateOutputTokens(payload.text),
      },
    };
  }
}

function buildStubPayload(req: AiCompletionRequest): {
  json?: unknown;
  text: string;
} {
  if (req.capabilityId === LEAD_BRIEF_V1_ID) {
    const leadHint =
      req.metadata?.leadId != null && req.metadata.leadId !== ""
        ? ` for lead ${req.metadata.leadId}`
        : "";
    const brief: LeadBriefV1Output = {
      brief: `Stub coaching brief${leadHint}: review the CRM next-action and confirm facts before calling. (AI stub — not a live model.)`,
      bullets: [
        "Follow the provided next-action; do not invent a new priority.",
        "Use only status / score band / health from context.",
        "Log outcomes in CRM after the conversation.",
      ],
    };
    return { json: brief, text: brief.brief };
  }

  const text = `Stub response for capability "${req.capabilityId}" (no live model).`;
  return { text };
}

function estimateTokens(req: AiCompletionRequest): number {
  const chars =
    req.system.length +
    req.messages.reduce((sum, m) => sum + m.content.length, 0);
  return Math.max(1, Math.ceil(chars / 4));
}

function estimateOutputTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
