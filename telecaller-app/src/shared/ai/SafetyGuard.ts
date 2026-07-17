/**
 * Foundational AI safety gates.
 * Agents 1–3 may add capability-specific utilities; keep CRM write prevention here.
 *
 * Phase 2C (Agent 3): prompt/token budgets, executable-command rejection,
 * provider timeout/retry policy defaults. Proposals stay inert (no CRM execution).
 */

import type { PromptContract } from "./PromptRegistry";
import type { AiError, AiErrorCode, AiTokenUsage } from "./types";

/** Keys that imply a silent CRM / Firestore mutate payload. */
export const CRM_PATCH_KEYS = [
  "leadPatch",
  "firestorePatch",
  "crmWrite",
  "crmPatch",
  "updateDoc",
  "setDoc",
  "deleteDoc",
  "__set",
  "__patch",
  "commitWrite",
  "silentWrite",
] as const;

/**
 * Keys that imply an executable CRM command / auto-apply — always reject.
 * Distinct from declarative propose payloads (Agent 1 contracts).
 */
export const EXECUTABLE_CRM_COMMAND_KEYS = [
  "execute",
  "executeAction",
  "executeCommand",
  "crmCommand",
  "runCommand",
  "applyNow",
  "autoApply",
  "autoCommit",
  "silentCommit",
  "invokeWriter",
  "commitAction",
  "performWrite",
  "writeToCrm",
  "firestoreWrite",
  ...CRM_PATCH_KEYS,
] as const;

/**
 * Model must not redefine Wave 6 intelligence or priority.
 * Strip/ignore these if present on structured output.
 */
export const FORBIDDEN_INTELLIGENCE_KEYS = [
  "score",
  "scoreBand",
  "scoreFactors",
  "health",
  "healthReasons",
  "nextAction",
  "bookingProbability",
  "priority",
  "duplicateRisk",
  "staleDays",
] as const;

/** Phase 3A provider / budget defaults (orchestrator + safetyUtils). */
export const DEFAULT_PROVIDER_TIMEOUT_MS = 8_000;
export const DEFAULT_PROVIDER_MAX_ATTEMPTS = 2;
export const DEFAULT_PROVIDER_RETRY_DELAY_MS = 400;
export const DEFAULT_MAX_OUTPUT_TOKENS = 2048;
/** Soft combined prompt ceiling beyond per-contract maxContextChars. */
export const DEFAULT_MAX_PROMPT_CHARS = 16_000;
export const CHARS_PER_TOKEN_ESTIMATE = 4;

export function makeAiError(
  code: AiErrorCode,
  message: string,
  details?: unknown,
): AiError {
  return details === undefined ? { code, message } : { code, message, details };
}

/** Role gate — empty/undefined allowedRoles means any role may call. */
export function authorizeCapability(
  contract: PromptContract,
  role?: string,
): AiError | null {
  const allowed = contract.allowedRoles;
  if (!allowed || allowed.length === 0) return null;
  const normalized = (role ?? "").trim().toLowerCase();
  if (!normalized) {
    return makeAiError(
      "UNAUTHORIZED",
      `Capability ${contract.id} requires a role`,
    );
  }
  const ok = allowed.some((r) => r.toLowerCase() === normalized);
  if (!ok) {
    return makeAiError(
      "UNAUTHORIZED",
      `Role "${role}" cannot use capability ${contract.id}`,
    );
  }
  return null;
}

/** v1 capabilities must not auto-write. */
export function assertWritePolicySafe(contract: PromptContract): AiError | null {
  if (contract.writePolicy === "policy_auto") {
    return makeAiError(
      "SAFETY_VIOLATION",
      `Capability ${contract.id} uses forbidden writePolicy policy_auto in v1`,
    );
  }
  if (
    contract.writePolicy === "none" &&
    contract.allowedTools.length > 0
  ) {
    return makeAiError(
      "SAFETY_VIOLATION",
      `Capability ${contract.id} declares tools while writePolicy is none`,
    );
  }
  return null;
}

export function assertContextWithinLimit(
  renderedUser: string,
  maxContextChars: number,
): AiError | null {
  if (renderedUser.length > maxContextChars) {
    return makeAiError(
      "CONTEXT_TOO_LARGE",
      `Context exceeds maxContextChars (${maxContextChars})`,
      { length: renderedUser.length, maxContextChars },
    );
  }
  return null;
}

/** Rough token estimate (chars / 4) — not a tokenizer; safety budget only. */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.max(0, Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE));
}

/**
 * Combined system + user prompt size gate (chars).
 * Use after contract maxContextChars check for an absolute ceiling.
 */
export function assertPromptSize(
  system: string,
  userContent: string,
  maxPromptChars: number = DEFAULT_MAX_PROMPT_CHARS,
): AiError | null {
  const length = system.length + userContent.length;
  if (length > maxPromptChars) {
    return makeAiError(
      "CONTEXT_TOO_LARGE",
      `Prompt exceeds max prompt chars (${maxPromptChars})`,
      { length, maxPromptChars, systemChars: system.length, userChars: userContent.length },
    );
  }
  return null;
}

/**
 * Token budget gate for input text or reported usage counts.
 */
export function assertTokenLimit(
  tokensOrText: number | string,
  maxTokens: number,
  kind: "input" | "output" = "input",
): AiError | null {
  const tokens =
    typeof tokensOrText === "number"
      ? tokensOrText
      : estimateTokenCount(tokensOrText);
  if (tokens > maxTokens) {
    return makeAiError(
      "TOKEN_LIMIT_EXCEEDED",
      `${kind} token estimate ${tokens} exceeds limit ${maxTokens}`,
      { tokens, maxTokens, kind },
    );
  }
  return null;
}

/** Reject when provider reports output tokens above the configured cap. */
export function assertOutputTokenUsage(
  usage: AiTokenUsage | undefined,
  maxOutputTokens: number = DEFAULT_MAX_OUTPUT_TOKENS,
): AiError | null {
  if (usage?.outputTokens == null) return null;
  return assertTokenLimit(usage.outputTokens, maxOutputTokens, "output");
}

/**
 * Capability allowlist — unknown ids are rejected.
 * Pass registered contract ids (e.g. from PromptRegistry).
 */
export function assertAllowedCapability(
  capabilityId: string,
  allowedCapabilityIds: readonly string[],
): AiError | null {
  const id = (capabilityId ?? "").trim();
  if (!id) {
    return makeAiError("UNKNOWN_CAPABILITY", "Capability id is empty");
  }
  if (!allowedCapabilityIds.includes(id)) {
    return makeAiError(
      "UNKNOWN_CAPABILITY",
      `Capability "${id}" is not in the allowed set`,
      { capabilityId: id, allowedCapabilityIds: [...allowedCapabilityIds] },
    );
  }
  return null;
}

/**
 * Lightweight JSON Schema object check (type + required keys).
 * Full AJV validation is out of scope — contracts still use parseOutput.
 */
export function assertJsonSchemaShape(
  value: unknown,
  jsonSchema: unknown,
): AiError | null {
  if (jsonSchema == null) return null;
  if (!isPlainObject(jsonSchema)) {
    return makeAiError(
      "INVALID_OUTPUT",
      "jsonSchema hint is not a plain object",
    );
  }

  const schemaType = jsonSchema.type;
  if (schemaType === "object") {
    if (!isPlainObject(value)) {
      return makeAiError(
        "INVALID_OUTPUT",
        "Output does not match jsonSchema type object",
        { expected: "object" },
      );
    }
    const required = jsonSchema.required;
    if (Array.isArray(required)) {
      for (const key of required) {
        if (typeof key !== "string") continue;
        if (!(key in value) || value[key] === undefined) {
          return makeAiError(
            "INVALID_OUTPUT",
            `Output missing required jsonSchema field "${key}"`,
            { key },
          );
        }
      }
    }
  } else if (schemaType === "array" && !Array.isArray(value)) {
    return makeAiError(
      "INVALID_OUTPUT",
      "Output does not match jsonSchema type array",
      { expected: "array" },
    );
  } else if (
    schemaType === "string" &&
    typeof value !== "string"
  ) {
    return makeAiError(
      "INVALID_OUTPUT",
      "Output does not match jsonSchema type string",
      { expected: "string" },
    );
  }

  return null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Reject structured outputs that look like CRM / Firestore patches.
 * Does not mutate the value.
 */
export function assertNoCrmPatch(value: unknown): AiError | null {
  const found = findForbiddenKeys(value, CRM_PATCH_KEYS);
  if (found) {
    return makeAiError(
      "SAFETY_VIOLATION",
      `Output contains forbidden CRM patch key "${found}"`,
      { key: found },
    );
  }
  return null;
}

/**
 * Reject executable CRM command shapes (auto-apply / invoke writer / etc.).
 * Declarative Agent 1 proposals are not command envelopes.
 */
export function assertNoExecutableCrmCommands(value: unknown): AiError | null {
  const found = findForbiddenKeys(value, EXECUTABLE_CRM_COMMAND_KEYS);
  if (found) {
    return makeAiError(
      "SAFETY_VIOLATION",
      `Output contains forbidden executable CRM command key "${found}"`,
      { key: found },
    );
  }
  return null;
}

/**
 * Remove forbidden intelligence / priority fields from a shallow/deep clone.
 * Returns a new value; input is not mutated.
 */
export function stripForbiddenIntelligenceFields(value: unknown): unknown {
  return stripKeys(value, new Set(FORBIDDEN_INTELLIGENCE_KEYS));
}

/** Post-check: no CRM patch / executable commands + strip intelligence overrides. */
export function safetyPostCheck(value: unknown): {
  ok: true;
  value: unknown;
} | { ok: false; error: AiError } {
  const patchError = assertNoCrmPatch(value);
  if (patchError) return { ok: false, error: patchError };
  const execError = assertNoExecutableCrmCommands(value);
  if (execError) return { ok: false, error: execError };
  return { ok: true, value: stripForbiddenIntelligenceFields(value) };
}

/** Stable-ish hash for audit metadata (not cryptographic). */
export function hashContext(context: unknown): string {
  const raw =
    typeof context === "string"
      ? context
      : (() => {
          try {
            return JSON.stringify(context ?? null) ?? "null";
          } catch {
            return "unserializable";
          }
        })();
  let h = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function findForbiddenKeys(
  value: unknown,
  forbidden: readonly string[],
  depth = 0,
): string | null {
  if (depth > 8 || value == null) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = findForbiddenKeys(item, forbidden, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (!isPlainObject(value)) return null;
  for (const key of Object.keys(value)) {
    if (forbidden.includes(key)) return key;
    const hit = findForbiddenKeys(value[key], forbidden, depth + 1);
    if (hit) return hit;
  }
  return null;
}

function stripKeys(value: unknown, keys: Set<string>, depth = 0): unknown {
  if (depth > 8 || value == null) return value;
  if (Array.isArray(value)) {
    return value.map((item) => stripKeys(item, keys, depth + 1));
  }
  if (!isPlainObject(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (keys.has(key)) continue;
    out[key] = stripKeys(child, keys, depth + 1);
  }
  return out;
}
