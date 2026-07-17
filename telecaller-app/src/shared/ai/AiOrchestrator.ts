/**
 * AI Orchestrator — capability routing for Wave 7.
 *
 * Flow: prompt lookup → safety pre-check → provider → parse → safety post-check → result.
 * No CRM reads/writes. Context builders (Agent 1) supply `input.context`.
 */

import type { AiProvider } from "./AiProvider";
import { getPromptContract, renderUserTemplate } from "./PromptRegistry";
import { createAiProvider } from "./ProviderFactory";
import {
  assertContextWithinLimit,
  assertJsonSchemaShape,
  assertOutputTokenUsage,
  assertPromptSize,
  assertWritePolicySafe,
  authorizeCapability,
  DEFAULT_MAX_OUTPUT_TOKENS,
  DEFAULT_PROVIDER_TIMEOUT_MS,
  hashContext,
  makeAiError,
  safetyPostCheck,
} from "./SafetyGuard";
import {
  getDefaultProviderSafetyPolicy,
  isAbortError,
  invokeProviderSafely,
  mapProviderEdgeError,
  validateAllowedCapability,
  validatePromptSize,
} from "./safetyUtils";
import {
  AI_ENABLED,
  type AiAuditRecord,
  type AiCapabilityResult,
  type AiCompletionResult,
  type AiError,
  type AiResultSource,
  type AiRunInput,
} from "./types";

export interface AiOrchestratorOptions {
  provider?: AiProvider;
  /**
   * Defaults to `AI_ENABLED` (false).
   * Tests / Agent 2 wrappers may pass true once gated on.
   * Product sites: prefer `createAiRuntime()` or pass `enabled: isAiEnabled()`.
   */
  enabled?: boolean;
}

export class AiOrchestrator {
  private readonly provider: AiProvider;
  private readonly enabled: boolean;

  constructor(options: AiOrchestratorOptions = {}) {
    const enabled = options.enabled ?? AI_ENABLED;
    this.enabled = enabled;
    // Factory selects stub vs live; injected provider always wins (tests).
    this.provider =
      options.provider ?? createAiProvider({ aiEnabled: enabled });
  }

  getProviderId(): string {
    return this.provider.id;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async run(
    capabilityId: string,
    input: AiRunInput = {},
  ): Promise<AiCapabilityResult> {
    const started = Date.now();

    if (!this.enabled) {
      return fail(
        capabilityId,
        makeAiError(
          "AI_DISABLED",
          "AI is disabled (AI_ENABLED=false). Rules intelligence remains available.",
        ),
        this.auditPartial(started, capabilityId, input, {
          ok: false,
          errorCode: "AI_DISABLED",
        }),
      );
    }

    const contract = getPromptContract(capabilityId);
    if (!contract) {
      return fail(
        capabilityId,
        makeAiError(
          "UNKNOWN_CAPABILITY",
          `No prompt contract registered for "${capabilityId}"`,
        ),
        this.auditPartial(started, capabilityId, input, {
          ok: false,
          errorCode: "UNKNOWN_CAPABILITY",
        }),
      );
    }

    const allowedCap = validateAllowedCapability(capabilityId);
    if (!allowedCap.ok) {
      return fail(
        capabilityId,
        allowedCap.error,
        this.auditPartial(started, capabilityId, input, {
          ok: false,
          errorCode: allowedCap.error.code,
          promptVersion: contract.id,
        }),
      );
    }

    const authError = authorizeCapability(contract, input.role);
    if (authError) {
      return fail(
        capabilityId,
        authError,
        this.auditPartial(started, capabilityId, input, {
          ok: false,
          errorCode: authError.code,
          promptVersion: contract.id,
        }),
      );
    }

    const writeError = assertWritePolicySafe(contract);
    if (writeError) {
      return fail(
        capabilityId,
        writeError,
        this.auditPartial(started, capabilityId, input, {
          ok: false,
          errorCode: writeError.code,
          promptVersion: contract.id,
        }),
      );
    }

    const context = input.context ?? {};
    const userContent = renderUserTemplate(contract.userTemplate, context);
    const sizeError = assertContextWithinLimit(
      userContent,
      contract.maxContextChars,
    );
    if (sizeError) {
      return fail(
        capabilityId,
        sizeError,
        this.auditPartial(started, capabilityId, input, {
          ok: false,
          errorCode: sizeError.code,
          promptVersion: contract.id,
          contextHash: hashContext(context),
        }),
      );
    }

    const policy = getDefaultProviderSafetyPolicy();
    const promptBudget = validatePromptSize(contract.system, userContent, {
      maxPromptChars: policy.maxPromptChars,
    });
    if (!promptBudget.ok) {
      return fail(
        capabilityId,
        promptBudget.error,
        this.auditPartial(started, capabilityId, input, {
          ok: false,
          errorCode: promptBudget.error.code,
          promptVersion: contract.id,
          contextHash: hashContext(context),
        }),
      );
    }

    const absolutePrompt = assertPromptSize(
      contract.system,
      userContent,
      policy.maxPromptChars,
    );
    if (absolutePrompt) {
      return fail(
        capabilityId,
        absolutePrompt,
        this.auditPartial(started, capabilityId, input, {
          ok: false,
          errorCode: absolutePrompt.code,
          promptVersion: contract.id,
          contextHash: hashContext(context),
        }),
      );
    }

    let completion: AiCompletionResult;
    try {
      completion = await invokeProviderSafely(
        (signal) =>
          this.provider.complete(
            {
              capabilityId,
              context,
              system: contract.system,
              messages: [{ role: "user", content: userContent }],
              responseFormat: contract.responseFormat,
              jsonSchema: contract.jsonSchema,
              maxTokens: policy.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
              timeoutMs: policy.timeoutMs ?? DEFAULT_PROVIDER_TIMEOUT_MS,
              metadata: {
                ...(input.metadata ?? {}),
                ...(input.leadId ? { leadId: input.leadId } : {}),
                ...(input.userId ? { userId: input.userId } : {}),
              },
            },
            { signal },
          ),
        policy,
        { signal: input.signal },
      );
    } catch (err) {
      if (isAbortError(err)) {
        throw err;
      }
      const mapped = mapProviderEdgeError(err);
      return fail(
        capabilityId,
        mapped,
        this.auditPartial(started, capabilityId, input, {
          ok: false,
          errorCode: mapped.code,
          promptVersion: contract.id,
          contextHash: hashContext(context),
          providerId: this.provider.id,
        }),
      );
    }

    const tokenErr = assertOutputTokenUsage(
      completion.usage,
      policy.maxOutputTokens,
    );
    if (tokenErr) {
      return fail(
        capabilityId,
        tokenErr,
        this.auditFromCompletion(started, capabilityId, input, completion, {
          ok: false,
          errorCode: tokenErr.code,
          promptVersion: contract.id,
          contextHash: hashContext(context),
        }),
      );
    }

    const rawStructured =
      completion.json !== undefined
        ? completion.json
        : completion.text !== undefined
          ? { text: completion.text }
          : null;

    if (rawStructured == null) {
      const invalid = makeAiError(
        "INVALID_OUTPUT",
        `Provider returned empty output for ${capabilityId}`,
      );
      return fail(
        capabilityId,
        invalid,
        this.auditFromCompletion(started, capabilityId, input, completion, {
          ok: false,
          errorCode: "INVALID_OUTPUT",
          promptVersion: contract.id,
          contextHash: hashContext(context),
        }),
      );
    }

    const post = safetyPostCheck(rawStructured);
    if (!post.ok) {
      return fail(
        capabilityId,
        post.error,
        this.auditFromCompletion(started, capabilityId, input, completion, {
          ok: false,
          errorCode: post.error.code,
          promptVersion: contract.id,
          contextHash: hashContext(context),
        }),
      );
    }

    const schemaShape =
      completion.json !== undefined && contract.jsonSchema != null
        ? assertJsonSchemaShape(post.value, contract.jsonSchema)
        : null;
    if (schemaShape) {
      return fail(
        capabilityId,
        schemaShape,
        this.auditFromCompletion(started, capabilityId, input, completion, {
          ok: false,
          errorCode: schemaShape.code,
          promptVersion: contract.id,
          contextHash: hashContext(context),
        }),
      );
    }

    const parsed = contract.parseOutput(post.value, completion.text);
    if (!parsed) {
      const invalid = makeAiError(
        "INVALID_OUTPUT",
        `Provider output failed schema for ${capabilityId}`,
      );
      return fail(
        capabilityId,
        invalid,
        this.auditFromCompletion(started, capabilityId, input, completion, {
          ok: false,
          errorCode: "INVALID_OUTPUT",
          promptVersion: contract.id,
          contextHash: hashContext(context),
        }),
      );
    }

    const parsedPost = safetyPostCheck(parsed.data);
    if (!parsedPost.ok) {
      return fail(
        capabilityId,
        parsedPost.error,
        this.auditFromCompletion(started, capabilityId, input, completion, {
          ok: false,
          errorCode: parsedPost.error.code,
          promptVersion: contract.id,
          contextHash: hashContext(context),
        }),
      );
    }

    const source: AiResultSource =
      this.provider.id === "stub" ? "stub" : "llm";
    const audit = this.auditFromCompletion(
      started,
      capabilityId,
      input,
      completion,
      {
        ok: true,
        promptVersion: contract.id,
        contextHash: hashContext(context),
      },
    );

    return {
      ok: true,
      capabilityId,
      data: parsedPost.value,
      text: parsed.text,
      source,
      audit,
    };
  }

  private auditPartial(
    started: number,
    capabilityId: string,
    input: AiRunInput,
    extra: Partial<AiAuditRecord> & { ok: boolean },
  ): AiAuditRecord {
    return {
      id: createAuditId(),
      capabilityId,
      promptVersion: extra.promptVersion ?? capabilityId,
      providerId: extra.providerId ?? this.provider.id,
      model: extra.model ?? this.provider.models[0] ?? "unknown",
      userId: input.userId,
      leadId: input.leadId,
      role: input.role,
      contextHash: extra.contextHash,
      latencyMs: Math.max(0, Date.now() - started),
      usage: extra.usage,
      ok: extra.ok,
      errorCode: extra.errorCode,
      timestamp: new Date().toISOString(),
    };
  }

  private auditFromCompletion(
    started: number,
    capabilityId: string,
    input: AiRunInput,
    completion: AiCompletionResult,
    extra: Partial<AiAuditRecord> & { ok: boolean },
  ): AiAuditRecord {
    return this.auditPartial(started, capabilityId, input, {
      ...extra,
      providerId: completion.providerId,
      model: completion.model,
      usage: completion.usage,
      latencyMs: Math.max(
        completion.latencyMs,
        Math.max(0, Date.now() - started),
      ),
    });
  }
}

export function createAiOrchestrator(
  options?: AiOrchestratorOptions,
): AiOrchestrator {
  return new AiOrchestrator(options);
}

function fail(
  capabilityId: string,
  error: AiError,
  audit?: AiAuditRecord,
): AiCapabilityResult {
  return audit
    ? { ok: false, capabilityId, error, audit }
    : { ok: false, capabilityId, error };
}

function createAuditId(): string {
  return `ai_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
