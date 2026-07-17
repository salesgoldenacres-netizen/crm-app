/**
 * Live Gemini adapter — implements AiProvider via Cloud Function proxy.
 *
 * No Gemini/OpenAI SDK. No client API keys.
 * Keys live server-side (`GEMINI_API_KEY` on `aiComplete`).
 * Fail-closed when the proxy rejects (missing key / auth / network).
 */

import type { AiProvider, AiProviderCallOptions } from "./AiProvider";
import type { AiCompletionRequest, AiCompletionResult } from "./types";

export const GEMINI_PROVIDER_ID = "gemini";
export const GEMINI_DEFAULT_MODEL = "gemini-2.0-flash";
export const AI_COMPLETE_CALLABLE = "aiComplete";

/** Payload sent to the `aiComplete` Cloud Function. */
export interface GeminiProxyRequest {
  capabilityId: string;
  context?: Record<string, unknown>;
  leadId?: string;
}

export type GeminiInvokeFn = (
  payload: GeminiProxyRequest,
  options?: AiProviderCallOptions,
) => Promise<AiCompletionResult>;

export interface GeminiProviderOptions {
  /**
   * Injectable transport for unit tests.
   * Default: Firebase `httpsCallable(functions, "aiComplete")`.
   */
  invoke?: GeminiInvokeFn;
  model?: string;
}

export class GeminiProvider implements AiProvider {
  readonly id = GEMINI_PROVIDER_ID;
  readonly models: readonly string[];
  private readonly invoke: GeminiInvokeFn;
  private readonly model: string;

  constructor(options: GeminiProviderOptions = {}) {
    this.model = options.model ?? GEMINI_DEFAULT_MODEL;
    this.models = [this.model];
    this.invoke = options.invoke ?? defaultGeminiInvoke;
  }

  async complete(
    req: AiCompletionRequest,
    options?: AiProviderCallOptions,
  ): Promise<AiCompletionResult> {
    const started = Date.now();
    throwIfAborted(options?.signal);
    try {
      const result = await this.invoke(
        {
          capabilityId: req.capabilityId,
          context: req.context,
          leadId: req.metadata?.leadId,
        },
        options,
      );
      throwIfAborted(options?.signal);

      return {
        text: result.text,
        json: result.json,
        usage: result.usage,
        model: result.model || this.model,
        providerId: GEMINI_PROVIDER_ID,
        latencyMs:
          typeof result.latencyMs === "number"
            ? result.latencyMs
            : Math.max(0, Date.now() - started),
        finishReason: result.finishReason ?? "stop",
      };
    } catch (err) {
      throw new Error(extractProviderErrorMessage(err), { cause: err });
    }
  }
}

async function defaultGeminiInvoke(
  payload: GeminiProxyRequest,
  options?: AiProviderCallOptions,
): Promise<AiCompletionResult> {
  throwIfAborted(options?.signal);
  const { httpsCallable } = await import("firebase/functions");
  const { functions } = await import("@/shared/services/firebase");
  const fn = httpsCallable(functions, AI_COMPLETE_CALLABLE);
  const res = await fn(payload);
  throwIfAborted(options?.signal);
  return res.data as AiCompletionResult;
}

function extractProviderErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const code = "code" in err ? String((err as { code: unknown }).code) : "";
    const message =
      "message" in err ? String((err as { message: unknown }).message) : "";

    // Firebase callable errors: functions/failed-precondition, etc.
    if (code.includes("failed-precondition")) {
      return "AI provider is not configured or unavailable";
    }
    if (code.includes("unauthenticated")) {
      return "AI provider requires authentication";
    }
    if (code.includes("resource-exhausted")) {
      return "AI provider rate limited";
    }
    if (message) {
      // Strip any accidental key-looking substrings.
      return message.replace(/key=[^\s&]+/gi, "key=REDACTED").slice(0, 240);
    }
  }
  if (err instanceof Error && err.message) {
    return err.message.replace(/key=[^\s&]+/gi, "key=REDACTED").slice(0, 240);
  }
  return "AI provider request failed";
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  const err =
    signal.reason instanceof Error
      ? signal.reason
      : new Error("AI request aborted");
  err.name = err.name === "Error" ? "AbortError" : err.name;
  throw err;
}
