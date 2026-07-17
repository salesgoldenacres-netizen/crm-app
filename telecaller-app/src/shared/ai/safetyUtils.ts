/**
 * Wave 7 Phase 2C — Agent 3 safety utilities.
 *
 * Extends SafetyGuard with PII redaction, prompt/response validation,
 * proposal governance (Agent 1 contracts), provider timeout/retry,
 * and a hard no-execution posture. Proposals remain PENDING_CONFIRMATION.
 */

import {
  AI_ACTION_STATUS,
  AI_ACTION_TYPE_VALUES,
  forbidAiActionExecution,
  isPendingConfirmation,
  isSupportedAiActionType,
  parseAiActionProposal,
  type AiActionProposal,
  type AiActionType,
} from "./contracts";
import { listPromptContracts } from "./PromptRegistry";
import {
  assertAllowedCapability,
  assertJsonSchemaShape,
  assertNoCrmPatch,
  assertNoExecutableCrmCommands,
  assertOutputTokenUsage,
  assertPromptSize,
  assertTokenLimit,
  CRM_PATCH_KEYS,
  DEFAULT_MAX_OUTPUT_TOKENS,
  DEFAULT_MAX_PROMPT_CHARS,
  DEFAULT_PROVIDER_MAX_ATTEMPTS,
  DEFAULT_PROVIDER_RETRY_DELAY_MS,
  DEFAULT_PROVIDER_TIMEOUT_MS,
  estimateTokenCount,
  makeAiError,
  safetyPostCheck,
} from "./SafetyGuard";
import type { AiError, AiTokenUsage } from "./types";

/** Canonical AI write posture — never escalate to CRM execution. */
export const AI_SAFETY_POSTURE = "READ_ONLY" as const;
export type AiSafetyPosture = typeof AI_SAFETY_POSTURE;

/** Required status for every AI proposal in Phase 2C. */
export const AI_PROPOSAL_REQUIRED_STATUS =
  AI_ACTION_STATUS.PENDING_CONFIRMATION;

/** Object keys treated as PII (redacted by key, not only by value pattern). */
export const PII_FIELD_KEYS = [
  "phone",
  "mobile",
  "whatsapp",
  "email",
  "address",
  "homeAddress",
  "mailingAddress",
  "aadhaar",
  "aadhar",
  "pan",
  "govId",
  "ssn",
] as const;

const EMAIL_RE =
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

/** Indian / intl phone-like sequences (digits with optional + / spaces / dashes). */
const PHONE_RE =
  /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,5}[\s-]?\d{4,6}\b/g;

const REDACTED = "[REDACTED]";

export type SafetyValidationOk<T = unknown> = {
  ok: true;
  value: T;
  posture: AiSafetyPosture;
};

export type SafetyValidationFail = {
  ok: false;
  error: AiError;
  posture: AiSafetyPosture;
};

export type SafetyValidationResult<T = unknown> =
  | SafetyValidationOk<T>
  | SafetyValidationFail;

export type WriteIntentDecision = {
  /** Phase 2C: always false — proposals stay inert. */
  allowed: false;
  posture: AiSafetyPosture;
  reason: string;
  error: AiError;
};

export type BlockWriteResult = {
  blocked: true;
  posture: AiSafetyPosture;
  error: AiError;
};

export type ProviderSafetyPolicy = {
  timeoutMs: number;
  maxAttempts: number;
  retryDelayMs: number;
  maxOutputTokens: number;
  maxPromptChars: number;
};

export type ProposalValidationOk = SafetyValidationOk<AiActionProposal> & {
  requiredStatus: typeof AI_PROPOSAL_REQUIRED_STATUS;
};

export type ProposalValidationResult =
  | ProposalValidationOk
  | SafetyValidationFail;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function redactString(text: string): string {
  return text
    .replace(EMAIL_RE, REDACTED)
    .replace(PHONE_RE, (match) => {
      // Avoid redacting short pure numbers that are unlikely phone (e.g. scores).
      const digits = match.replace(/\D/g, "");
      return digits.length >= 7 ? REDACTED : match;
    });
}

/**
 * Deep-clone and redact PII from strings and known PII field keys.
 * Input is not mutated. Non-serializable values are returned as-is at leaves.
 */
export function redactPII(value: unknown, depth = 0): unknown {
  if (depth > 10 || value == null) return value;
  if (typeof value === "string") return redactString(value);
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((item) => redactPII(item, depth + 1));
  }
  if (!isPlainObject(value)) return value;

  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    const keyLower = key.toLowerCase();
    const isPiiKey = PII_FIELD_KEYS.some((k) => k.toLowerCase() === keyLower);
    if (isPiiKey) {
      out[key] = typeof child === "string" && child.trim() === "" ? "" : REDACTED;
      continue;
    }
    out[key] = redactPII(child, depth + 1);
  }
  return out;
}

export function getDefaultProviderSafetyPolicy(): ProviderSafetyPolicy {
  return {
    timeoutMs: DEFAULT_PROVIDER_TIMEOUT_MS,
    maxAttempts: DEFAULT_PROVIDER_MAX_ATTEMPTS,
    retryDelayMs: DEFAULT_PROVIDER_RETRY_DELAY_MS,
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
    maxPromptChars: DEFAULT_MAX_PROMPT_CHARS,
  };
}

/** Registered capability ids from PromptRegistry (allowlist). */
export function listAllowedCapabilityIds(): readonly string[] {
  return listPromptContracts().map((c) => c.id);
}

/**
 * Validate capability is registered / allowed.
 */
export function validateAllowedCapability(
  capabilityId: string,
  allowedIds: readonly string[] = listAllowedCapabilityIds(),
): SafetyValidationResult<string> {
  const err = assertAllowedCapability(capabilityId, allowedIds);
  if (err) {
    return { ok: false, posture: AI_SAFETY_POSTURE, error: err };
  }
  return { ok: true, posture: AI_SAFETY_POSTURE, value: capabilityId };
}

/**
 * Prompt size + approximate input token budget.
 */
export function validatePromptSize(
  system: string,
  userContent: string,
  options?: {
    maxPromptChars?: number;
    maxInputTokens?: number;
  },
): SafetyValidationResult<{ chars: number; tokens: number }> {
  const maxPromptChars =
    options?.maxPromptChars ?? DEFAULT_MAX_PROMPT_CHARS;
  const sizeErr = assertPromptSize(system, userContent, maxPromptChars);
  if (sizeErr) {
    return { ok: false, posture: AI_SAFETY_POSTURE, error: sizeErr };
  }

  const combined = `${system}\n${userContent}`;
  const tokens = estimateTokenCount(combined);
  if (options?.maxInputTokens != null) {
    const tokErr = assertTokenLimit(tokens, options.maxInputTokens, "input");
    if (tokErr) {
      return { ok: false, posture: AI_SAFETY_POSTURE, error: tokErr };
    }
  }

  return {
    ok: true,
    posture: AI_SAFETY_POSTURE,
    value: { chars: system.length + userContent.length, tokens },
  };
}

/**
 * Output token usage vs policy cap.
 */
export function validateTokenLimits(
  usage: AiTokenUsage | undefined,
  maxOutputTokens: number = DEFAULT_MAX_OUTPUT_TOKENS,
): SafetyValidationResult<AiTokenUsage | undefined> {
  const err = assertOutputTokenUsage(usage, maxOutputTokens);
  if (err) {
    return { ok: false, posture: AI_SAFETY_POSTURE, error: err };
  }
  return { ok: true, posture: AI_SAFETY_POSTURE, value: usage };
}

/**
 * Lightweight jsonSchema shape check (required fields / type).
 */
export function validateJsonSchema(
  value: unknown,
  jsonSchema: unknown,
): SafetyValidationResult {
  const err = assertJsonSchemaShape(value, jsonSchema);
  if (err) {
    return { ok: false, posture: AI_SAFETY_POSTURE, error: err };
  }
  return { ok: true, posture: AI_SAFETY_POSTURE, value };
}

/**
 * Pre-flight prompt/context validation.
 * Redacts PII, rejects CRM patch / executable command shapes, returns READ_ONLY posture.
 */
export function validatePrompt(
  prompt: unknown,
): SafetyValidationResult {
  if (prompt == null) {
    return {
      ok: false,
      posture: AI_SAFETY_POSTURE,
      error: makeAiError(
        "SAFETY_VIOLATION",
        "Prompt/context is empty",
      ),
    };
  }

  const patchError = assertNoCrmPatch(prompt);
  if (patchError) {
    return { ok: false, posture: AI_SAFETY_POSTURE, error: patchError };
  }

  const execError = assertNoExecutableCrmCommands(prompt);
  if (execError) {
    return { ok: false, posture: AI_SAFETY_POSTURE, error: execError };
  }

  // Reject write-intent markers even if not in CRM_PATCH_KEYS shape.
  if (isPlainObject(prompt)) {
    const writeKeys = [
      "write",
      "commit",
      "mutate",
      "applyPatch",
      "silentWrite",
      ...CRM_PATCH_KEYS,
    ];
    for (const key of Object.keys(prompt)) {
      if (writeKeys.includes(key)) {
        return {
          ok: false,
          posture: AI_SAFETY_POSTURE,
          error: makeAiError(
            "SAFETY_VIOLATION",
            `Prompt contains forbidden write key "${key}"`,
            { key },
          ),
        };
      }
    }
  }

  return {
    ok: true,
    posture: AI_SAFETY_POSTURE,
    value: redactPII(prompt),
  };
}

/**
 * Post-flight model response validation.
 * Reuses SafetyGuard post-check (no CRM patch / executable cmds + strip intelligence).
 */
export function validateResponse(
  response: unknown,
): SafetyValidationResult {
  if (response == null) {
    return {
      ok: false,
      posture: AI_SAFETY_POSTURE,
      error: makeAiError(
        "INVALID_OUTPUT",
        "Response is empty",
      ),
    };
  }

  if (typeof response === "string") {
    try {
      JSON.parse(response);
    } catch {
      // Plain text responses are allowed when not claiming JSON; callers
      // that require JSON should pass parsed objects + validateJsonSchema.
    }
  }

  const post = safetyPostCheck(response);
  if (!post.ok) {
    return { ok: false, posture: AI_SAFETY_POSTURE, error: post.error };
  }

  return {
    ok: true,
    posture: AI_SAFETY_POSTURE,
    value: post.value,
  };
}

/**
 * Reject unknown AI action types (not in Agent 1 AI_ACTION_TYPES).
 */
export function rejectUnknownAction(
  type: unknown,
): SafetyValidationFail {
  return {
    ok: false,
    posture: AI_SAFETY_POSTURE,
    error: makeAiError(
      "SAFETY_VIOLATION",
      `Unknown or unsupported AI action type "${String(type)}"`,
      {
        type,
        allowedTypes: [...AI_ACTION_TYPE_VALUES],
      },
    ),
  };
}

/**
 * Validate a propose-only AI action against Agent 1 contracts.
 * Always requires PENDING_CONFIRMATION; never authorizes execution.
 */
export function validateAiActionProposal(
  raw: unknown,
): ProposalValidationResult {
  if (raw == null) {
    return {
      ok: false,
      posture: AI_SAFETY_POSTURE,
      error: makeAiError("INVALID_OUTPUT", "AI action proposal is empty"),
    };
  }

  const execError = assertNoExecutableCrmCommands(raw);
  if (execError) {
    return { ok: false, posture: AI_SAFETY_POSTURE, error: execError };
  }

  const patchError = assertNoCrmPatch(raw);
  if (patchError) {
    return { ok: false, posture: AI_SAFETY_POSTURE, error: patchError };
  }

  if (!isPlainObject(raw) || !("type" in raw)) {
    return {
      ok: false,
      posture: AI_SAFETY_POSTURE,
      error: makeAiError(
        "INVALID_OUTPUT",
        "AI action proposal is malformed (missing type)",
      ),
    };
  }

  if (!isSupportedAiActionType(raw.type)) {
    return rejectUnknownAction(raw.type);
  }

  const parsed = parseAiActionProposal(raw);
  if (!parsed) {
    return {
      ok: false,
      posture: AI_SAFETY_POSTURE,
      error: makeAiError(
        "INVALID_OUTPUT",
        "AI action proposal failed JSON/schema validation",
        { allowedTypes: [...AI_ACTION_TYPE_VALUES] },
      ),
    };
  }

  if (!isPendingConfirmation(parsed.status)) {
    return {
      ok: false,
      posture: AI_SAFETY_POSTURE,
      error: makeAiError(
        "SAFETY_VIOLATION",
        `AI action proposal status must be ${AI_PROPOSAL_REQUIRED_STATUS}`,
        { status: parsed.status },
      ),
    };
  }

  return {
    ok: true,
    posture: AI_SAFETY_POSTURE,
    requiredStatus: AI_PROPOSAL_REQUIRED_STATUS,
    value: parsed,
  };
}

/** True when type is one of Agent 1 AI_ACTION_TYPES. */
export function isAllowedProposalType(type: unknown): type is AiActionType {
  return isSupportedAiActionType(type);
}

/**
 * Hard gate: AI proposals must remain inert — maps to Agent 1 forbidAiActionExecution.
 */
export function ensureProposalInert(
  proposalId?: string,
): BlockWriteResult {
  const forbidden = forbidAiActionExecution(proposalId);
  return {
    blocked: true,
    posture: AI_SAFETY_POSTURE,
    error: makeAiError(
      "SAFETY_VIOLATION",
      forbidden.ok
        ? "AI action execution forbidden"
        : forbidden.error.message,
      {
        proposalId,
        requiredStatus: AI_PROPOSAL_REQUIRED_STATUS,
        actionError: forbidden.ok ? undefined : forbidden.error,
      },
    ),
  };
}

/**
 * Write-intent gate for tools / propose flows.
 * Phase 2C: always deny execution — proposals may exist only as PENDING_CONFIRMATION.
 */
export function allowWriteIntent(_intent?: unknown): WriteIntentDecision {
  return {
    allowed: false,
    posture: AI_SAFETY_POSTURE,
    reason:
      "AI write intents are denied in Phase 2C (READ_ONLY; proposals stay PENDING_CONFIRMATION)",
    error: makeAiError(
      "SAFETY_VIOLATION",
      "allowWriteIntent denied: AI path is READ_ONLY (no CRM execution)",
      {
        posture: AI_SAFETY_POSTURE,
        requiredStatus: AI_PROPOSAL_REQUIRED_STATUS,
      },
    ),
  };
}

/**
 * Hard block for any unsafe / attempted CRM write payload from AI.
 * Always blocks in Phase 2C.
 */
export function blockUnsafeWrite(_payload?: unknown): BlockWriteResult {
  return {
    blocked: true,
    posture: AI_SAFETY_POSTURE,
    error: makeAiError(
      "SAFETY_VIOLATION",
      "blockUnsafeWrite: CRM write blocked (READ_ONLY; no executable commands)",
      { posture: AI_SAFETY_POSTURE },
    ),
  };
}

function isTimeoutError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof Error) {
    const name = err.name.toLowerCase();
    const msg = err.message.toLowerCase();
    return (
      name.includes("timeout") ||
      msg.includes("timeout") ||
      msg.includes("timed out") ||
      msg.includes("deadline")
    );
  }
  return false;
}

export function isAbortError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof Error) {
    return err.name === "AbortError" || err.message.toLowerCase().includes("aborted");
  }
  return false;
}

function isRetryableProviderError(err: unknown): boolean {
  if (isAbortError(err) || isTimeoutError(err)) return false;
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("rate limited") ||
    msg.includes("unavailable") ||
    msg.includes("temporarily") ||
    msg.includes("econnreset") ||
    msg.includes("network") ||
    msg.includes("429") ||
    msg.includes("503") ||
    msg.includes("504")
  );
}

function makeAbortError(message: string): Error {
  const err = new Error(message);
  err.name = "AbortError";
  return err;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  throw signal.reason instanceof Error
    ? signal.reason
    : makeAbortError("AI request aborted");
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) {
    throwIfAborted(signal);
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    throwIfAborted(signal);
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const onAbort = () => {
      cleanup();
      reject(signal?.reason instanceof Error
        ? signal.reason
        : makeAbortError("AI request aborted"));
    };

    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function createAbortController(signal?: AbortSignal): AbortController {
  const controller = new AbortController();
  if (!signal) return controller;

  if (signal.aborted) {
    controller.abort(signal.reason);
    return controller;
  }

  const onAbort = () => {
    controller.abort(signal.reason);
    signal.removeEventListener("abort", onAbort);
  };
  signal.addEventListener("abort", onAbort, { once: true });
  return controller;
}

/**
 * Race a provider call against a timeout. Throws Error with name ProviderTimeoutError.
 */
export async function withProviderTimeout<T>(
  work: (signal?: AbortSignal) => Promise<T>,
  timeoutMs: number = DEFAULT_PROVIDER_TIMEOUT_MS,
  options?: { signal?: AbortSignal },
): Promise<T> {
  if (timeoutMs <= 0) return work(options?.signal);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const controller = createAbortController(options?.signal);
  let settled = false;
  try {
    const timeoutError = new Error(`AI provider timed out after ${timeoutMs}ms`);
    timeoutError.name = "ProviderTimeoutError";

    return await Promise.race([
      work(controller.signal).finally(() => {
        settled = true;
      }),
      new Promise<T>((_, reject) => {
        const onAbort = () => {
          controller.signal.removeEventListener("abort", onAbort);
          if (settled) return;
          settled = true;
          reject(
            controller.signal.reason instanceof Error
              ? controller.signal.reason
              : makeAbortError("AI request aborted"),
          );
        };

        controller.signal.addEventListener("abort", onAbort, { once: true });
      }),
      new Promise<T>(() => {
        timer = setTimeout(() => {
          if (settled) return;
          controller.abort(timeoutError);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * Retry wrapper for transient provider failures (timeouts / rate limits).
 */
export async function withProviderRetry<T>(
  work: (signal?: AbortSignal) => Promise<T>,
  options?: {
    maxAttempts?: number;
    retryDelayMs?: number;
    shouldRetry?: (err: unknown, attempt: number) => boolean;
    signal?: AbortSignal;
  },
): Promise<T> {
  const maxAttempts = Math.max(
    1,
    options?.maxAttempts ?? DEFAULT_PROVIDER_MAX_ATTEMPTS,
  );
  const retryDelayMs =
    options?.retryDelayMs ?? DEFAULT_PROVIDER_RETRY_DELAY_MS;
  const shouldRetry = options?.shouldRetry ?? isRetryableProviderError;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    throwIfAborted(options?.signal);
    try {
      return await work(options?.signal);
    } catch (err) {
      lastError = err;
      if (isAbortError(err)) throw err;
      const canRetry =
        attempt < maxAttempts && shouldRetry(err, attempt);
      if (!canRetry) throw err;
      const delayMs = retryDelayMs * 2 ** (attempt - 1);
      if (delayMs > 0) await sleep(delayMs, options?.signal);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("AI provider retry exhausted");
}

/**
 * Combined timeout + retry for provider/orchestrator edge.
 * Does not alter Stub / Gemini / Factory implementations.
 */
export async function invokeProviderSafely<T>(
  work: (signal?: AbortSignal) => Promise<T>,
  policy?: Partial<ProviderSafetyPolicy>,
  options?: { signal?: AbortSignal },
): Promise<T> {
  const resolved = {
    ...getDefaultProviderSafetyPolicy(),
    ...policy,
  };

  return withProviderRetry(
    (signal) => withProviderTimeout(work, resolved.timeoutMs, { signal }),
    {
      maxAttempts: resolved.maxAttempts,
      retryDelayMs: resolved.retryDelayMs,
      signal: options?.signal,
    },
  );
}

/** Map thrown provider edge errors to AiError (timeout vs generic). */
export function mapProviderEdgeError(err: unknown): AiError {
  if (isTimeoutError(err)) {
    return makeAiError(
      "PROVIDER_TIMEOUT",
      err instanceof Error ? err.message : "AI provider timed out",
    );
  }
  const message =
    err instanceof Error ? err.message : "Provider failed unexpectedly";
  return makeAiError("PROVIDER_ERROR", message);
}
