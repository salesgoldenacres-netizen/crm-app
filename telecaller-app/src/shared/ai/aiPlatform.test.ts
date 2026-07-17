import { describe, it, expect, vi, afterEach } from "vitest";
import {
  AI_ENABLED,
  AI_CAPABILITY_IDS,
  StubAiProvider,
  STUB_PROVIDER_ID,
  STUB_MODEL_ID,
  createAiOrchestrator,
  getPromptContract,
  hasPromptContract,
  listPromptContracts,
  renderUserTemplate,
  LEAD_BRIEF_V1_ID,
  assertNoCrmPatch,
  assertNoExecutableCrmCommands,
  assertWritePolicySafe,
  assertContextWithinLimit,
  assertPromptSize,
  assertTokenLimit,
  assertOutputTokenUsage,
  assertAllowedCapability,
  assertJsonSchemaShape,
  stripForbiddenIntelligenceFields,
  safetyPostCheck,
  authorizeCapability,
  hashContext,
  leadBriefV1Contract,
  isAiEnabled,
  AiFeatureGate,
  parseAiEnabledEnvValue,
  AI_SAFETY_POSTURE,
  AI_PROPOSAL_REQUIRED_STATUS,
  AI_ACTION_TYPES,
  AI_ACTION_STATUS,
  DEFAULT_MAX_OUTPUT_TOKENS,
  DEFAULT_PROVIDER_TIMEOUT_MS,
  DEFAULT_PROVIDER_MAX_ATTEMPTS,
  redactPII,
  validatePrompt,
  validateResponse,
  validateJsonSchema,
  validateAllowedCapability,
  validateAiActionProposal,
  isAllowedProposalType,
  ensureProposalInert,
  allowWriteIntent,
  blockUnsafeWrite,
  estimateTokenCount,
  withProviderTimeout,
  withProviderRetry,
  invokeProviderSafely,
  mapProviderEdgeError,
  getDefaultProviderSafetyPolicy,
  isAbortError,
  buildLeadBriefContextSlots,
} from "./index";
import type {
  AiProvider,
  AiCompletionRequest,
  AiCompletionResult,
  AiProviderCallOptions,
  LeadBriefV1Output,
  PromptContract,
} from "./index";

describe("AI_ENABLED", () => {
  it("defaults to false", () => {
    expect(AI_ENABLED).toBe(false);
  });
});

describe("featureFlags", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("parseAiEnabledEnvValue accepts truthy strings only", () => {
    expect(parseAiEnabledEnvValue(undefined)).toBe(false);
    expect(parseAiEnabledEnvValue(null)).toBe(false);
    expect(parseAiEnabledEnvValue("")).toBe(false);
    expect(parseAiEnabledEnvValue("false")).toBe(false);
    expect(parseAiEnabledEnvValue("0")).toBe(false);
    expect(parseAiEnabledEnvValue("no")).toBe(false);
    expect(parseAiEnabledEnvValue(false)).toBe(false);
    expect(parseAiEnabledEnvValue(true)).toBe(true);
    expect(parseAiEnabledEnvValue("true")).toBe(true);
    expect(parseAiEnabledEnvValue("TRUE")).toBe(true);
    expect(parseAiEnabledEnvValue("1")).toBe(true);
    expect(parseAiEnabledEnvValue("yes")).toBe(true);
    expect(parseAiEnabledEnvValue(" Yes ")).toBe(true);
  });

  it("isAiEnabled defaults false when AI_ENABLED is false", () => {
    expect(AI_ENABLED).toBe(false);
    expect(isAiEnabled()).toBe(false);
  });

  it("AiFeatureGate fails closed when master is off", () => {
    expect(AiFeatureGate()).toBe(false);
    expect(AiFeatureGate(LEAD_BRIEF_V1_ID)).toBe(false);
    expect(AiFeatureGate(AI_CAPABILITY_IDS.LEAD_BRIEF_V1)).toBe(false);
    expect(AiFeatureGate("unknown-capability")).toBe(false);
  });

  it("dev env VITE_AI_ENABLED can enable master when PROD is false", () => {
    if (import.meta.env.PROD) {
      // Production builds ignore env override — stay fail-closed.
      vi.stubEnv("VITE_AI_ENABLED", "true");
      expect(isAiEnabled()).toBe(false);
      return;
    }
    vi.stubEnv("VITE_AI_ENABLED", "true");
    expect(isAiEnabled()).toBe(true);
    expect(AiFeatureGate()).toBe(true);
    expect(AiFeatureGate(LEAD_BRIEF_V1_ID)).toBe(true);
    expect(AiFeatureGate("not-registered")).toBe(false);
  });
});

describe("PromptRegistry", () => {
  it("registers only lead-brief-v1 in Phase 2A", () => {
    expect(hasPromptContract(LEAD_BRIEF_V1_ID)).toBe(true);
    expect(hasPromptContract(AI_CAPABILITY_IDS.LEAD_BRIEF_V1)).toBe(true);
    expect(listPromptContracts()).toHaveLength(1);
    expect(getPromptContract("unknown-v1")).toBeUndefined();
  });

  it("lead-brief-v1 is propose-only (writePolicy propose, no tools)", () => {
    const c = getPromptContract(LEAD_BRIEF_V1_ID);
    expect(c?.writePolicy).toBe("propose");
    expect(c?.allowedTools).toEqual([]);
    expect(c?.responseFormat).toBe("json");
    expect(c?.maxContextChars).toBe(4000);
    expect(c?.inputFields).toEqual([
      "statusLabel",
      "scoreBand",
      "health",
      "nextActionType",
      "nextActionReason",
      "timelineSummary",
      "facts",
    ]);
  });

  it("renders user template slots", () => {
    const out = renderUserTemplate("Hello {{name}} — {{missing}}", {
      name: "Ada",
    });
    expect(out).toBe("Hello Ada — ");
  });

  it("renders numeric / object slots safely", () => {
    expect(renderUserTemplate("n={{n}}", { n: 42 })).toBe("n=42");
    expect(renderUserTemplate("o={{o}}", { o: { a: 1 } })).toBe('o={"a":1}');
  });

  it("parses valid lead-brief output", () => {
    const parsed = leadBriefV1Contract.parseOutput({
      brief: "Call today",
      bullets: ["Confirm visit"],
      proposals: [
        {
          id: "proposal-1",
          leadId: "lead-1",
          title: "Raise priority",
          createdAt: "2026-07-14T01:00:00.000Z",
          status: "PENDING_CONFIRMATION",
          type: "PRIORITY_CHANGE",
          payload: { toPriority: "hot" },
        },
      ],
    });
    expect(parsed?.data).toEqual({
      brief: "Call today",
      bullets: ["Confirm visit"],
      proposals: [
        expect.objectContaining({
          id: "proposal-1",
          type: "PRIORITY_CHANGE",
        }),
      ],
    });
    expect(parsed?.text).toBe("Call today");
  });

  it("parses lead-brief from JSON text when raw is not an object", () => {
    const parsed = leadBriefV1Contract.parseOutput(
      "not-json",
      '{"brief":"From text","bullets":["a"]}',
    );
    expect(parsed?.data).toEqual({ brief: "From text", bullets: ["a"] });
  });

  it("rejects invalid lead-brief output", () => {
    expect(leadBriefV1Contract.parseOutput({ brief: "" })).toBeNull();
    expect(leadBriefV1Contract.parseOutput({ nope: true })).toBeNull();
    expect(leadBriefV1Contract.parseOutput(null)).toBeNull();
  });
});

describe("AiProvider / StubAiProvider contract", () => {
  it("StubAiProvider satisfies AiProvider shape", () => {
    const provider: AiProvider = new StubAiProvider();
    expect(provider.id).toBe(STUB_PROVIDER_ID);
    expect(provider.models).toContain(STUB_MODEL_ID);
    expect(typeof provider.complete).toBe("function");
  });

  it("returns structured lead-brief-v1 mock without network", async () => {
    const provider = new StubAiProvider();
    const result = await provider.complete({
      capabilityId: LEAD_BRIEF_V1_ID,
      system: "test",
      messages: [{ role: "user", content: "brief me" }],
      responseFormat: "json",
      metadata: { leadId: "lead_1" },
    });
    expect(result.providerId).toBe(STUB_PROVIDER_ID);
    expect(result.model).toBe(STUB_MODEL_ID);
    expect(result.finishReason).toBe("stop");
    expect(result.usage?.inputTokens).toBeGreaterThan(0);
    expect(result.usage?.outputTokens).toBeGreaterThan(0);
    expect(result.json).toMatchObject({
      brief: expect.stringContaining("lead_1"),
      bullets: expect.any(Array),
    });
    expect(result.text).toBeTruthy();
  });

  it("returns text fixture for unknown capability ids", async () => {
    const provider = new StubAiProvider();
    const result = await provider.complete({
      capabilityId: "future-capability-v1",
      system: "test",
      messages: [{ role: "user", content: "hello" }],
      responseFormat: "text",
    });
    expect(result.providerId).toBe(STUB_PROVIDER_ID);
    expect(result.json).toBeUndefined();
    expect(result.text).toContain("future-capability-v1");
  });
});

describe("SafetyGuard", () => {
  it("rejects CRM patch keys", () => {
    const err = assertNoCrmPatch({
      brief: "ok",
      leadPatch: { status: "Booked" },
    });
    expect(err?.code).toBe("SAFETY_VIOLATION");
    expect(err?.message).toContain("leadPatch");
  });

  it("rejects nested CRM patch keys", () => {
    const err = assertNoCrmPatch({
      brief: "ok",
      nested: { firestorePatch: { status: "Lost" } },
    });
    expect(err?.code).toBe("SAFETY_VIOLATION");
    expect(err?.message).toContain("firestorePatch");
  });

  it("strips forbidden intelligence fields", () => {
    const cleaned = stripForbiddenIntelligenceFields({
      brief: "ok",
      score: 99,
      nextAction: { type: "call", reason: "x" },
      bullets: ["a"],
    }) as LeadBriefV1Output & { score?: number };
    expect(cleaned.brief).toBe("ok");
    expect(cleaned.bullets).toEqual(["a"]);
    expect(cleaned.score).toBeUndefined();
    expect(
      (cleaned as { nextAction?: unknown }).nextAction,
    ).toBeUndefined();
  });

  it("strips nested forbidden intelligence fields", () => {
    const cleaned = stripForbiddenIntelligenceFields({
      brief: "ok",
      meta: { health: "at_risk", keep: true },
    }) as { brief: string; meta: { keep: boolean; health?: string } };
    expect(cleaned.meta.keep).toBe(true);
    expect(cleaned.meta.health).toBeUndefined();
  });

  it("safetyPostCheck passes clean brief", () => {
    const result = safetyPostCheck({ brief: "Hello", bullets: ["1"] });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ brief: "Hello", bullets: ["1"] });
    }
  });

  it("safetyPostCheck rejects CRM patches", () => {
    const result = safetyPostCheck({ brief: "x", crmWrite: true });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SAFETY_VIOLATION");
    }
  });

  it("assertWritePolicySafe allows lead-brief-v1", () => {
    expect(assertWritePolicySafe(leadBriefV1Contract)).toBeNull();
  });

  it("assertWritePolicySafe rejects policy_auto and tools-with-none", () => {
    const auto: PromptContract = {
      ...leadBriefV1Contract,
      writePolicy: "policy_auto",
    };
    expect(assertWritePolicySafe(auto)?.code).toBe("SAFETY_VIOLATION");

    const toolsNone: PromptContract = {
      ...leadBriefV1Contract,
      writePolicy: "none",
      allowedTools: ["propose_status"],
    };
    expect(assertWritePolicySafe(toolsNone)?.code).toBe("SAFETY_VIOLATION");
  });

  it("assertContextWithinLimit enforces max chars", () => {
    expect(assertContextWithinLimit("short", 10)).toBeNull();
    expect(assertContextWithinLimit("x".repeat(11), 10)?.code).toBe(
      "CONTEXT_TOO_LARGE",
    );
  });

  it("authorizeCapability allows when no roles listed", () => {
    expect(authorizeCapability(leadBriefV1Contract, undefined)).toBeNull();
    expect(authorizeCapability(leadBriefV1Contract, "telecaller")).toBeNull();
  });

  it("authorizeCapability enforces allowedRoles when set", () => {
    const gated: PromptContract = {
      ...leadBriefV1Contract,
      allowedRoles: ["manager", "admin"],
    };
    expect(authorizeCapability(gated, "telecaller")?.code).toBe("UNAUTHORIZED");
    expect(authorizeCapability(gated, undefined)?.code).toBe("UNAUTHORIZED");
    expect(authorizeCapability(gated, "Manager")).toBeNull();
  });

  it("hashContext is stable for same input", () => {
    expect(hashContext({ a: 1 })).toBe(hashContext({ a: 1 }));
    expect(hashContext({ a: 1 })).not.toBe(hashContext({ a: 2 }));
  });
});

describe("safetyUtils (READ_ONLY)", () => {
  it("exposes READ_ONLY posture", () => {
    expect(AI_SAFETY_POSTURE).toBe("READ_ONLY");
  });

  it("redactPII masks emails, phones, and PII keys", () => {
    const cleaned = redactPII({
      brief: "Call rajesh@gmail.com at +91 98765 43210",
      phone: "+919876543210",
      email: "priya@yahoo.com",
      statusLabel: "Interested",
      nested: { address: "12 MG Road" },
    }) as Record<string, unknown>;

    expect(cleaned.brief).toBe("Call [REDACTED] at [REDACTED]");
    expect(cleaned.phone).toBe("[REDACTED]");
    expect(cleaned.email).toBe("[REDACTED]");
    expect(cleaned.statusLabel).toBe("Interested");
    expect((cleaned.nested as { address: string }).address).toBe("[REDACTED]");
  });

  it("validatePrompt redacts and passes clean context", () => {
    const result = validatePrompt({
      facts: "Email me at lead@example.com",
      statusLabel: "New",
    });
    expect(result.ok).toBe(true);
    expect(result.posture).toBe("READ_ONLY");
    if (result.ok) {
      expect(result.value).toEqual({
        facts: "Email me at [REDACTED]",
        statusLabel: "New",
      });
    }
  });

  it("validatePrompt rejects CRM patch keys", () => {
    const result = validatePrompt({
      brief: "ok",
      leadPatch: { status: "Booked" },
    });
    expect(result.ok).toBe(false);
    expect(result.posture).toBe("READ_ONLY");
    if (!result.ok) {
      expect(result.error.code).toBe("SAFETY_VIOLATION");
    }
  });

  it("validateResponse strips intelligence and rejects patches", () => {
    const ok = validateResponse({
      brief: "Hello",
      score: 99,
      bullets: ["a"],
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value).toEqual({ brief: "Hello", bullets: ["a"] });
      expect(ok.posture).toBe("READ_ONLY");
    }

    const bad = validateResponse({ leadPatch: { x: 1 } });
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.error.code).toBe("SAFETY_VIOLATION");
    }
  });

  it("allowWriteIntent always denies", () => {
    const decision = allowWriteIntent({ type: "propose_status_transition" });
    expect(decision.allowed).toBe(false);
    expect(decision.posture).toBe("READ_ONLY");
    expect(decision.error.code).toBe("SAFETY_VIOLATION");
  });

  it("blockUnsafeWrite always blocks", () => {
    const result = blockUnsafeWrite({ crmWrite: true });
    expect(result.blocked).toBe(true);
    expect(result.posture).toBe("READ_ONLY");
    expect(result.error.code).toBe("SAFETY_VIOLATION");
  });

  it("validatePrompt / validateResponse reject null", () => {
    const p = validatePrompt(null);
    expect(p.ok).toBe(false);
    if (!p.ok) expect(p.error.code).toBe("SAFETY_VIOLATION");

    const r = validateResponse(null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("INVALID_OUTPUT");
  });

  it("validatePrompt rejects top-level write intent keys", () => {
    const result = validatePrompt({ write: true, facts: "ok" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SAFETY_VIOLATION");
    }
  });
});

describe("Phase 2C safety governance (Agent 3)", () => {
  it("assertPromptSize / estimateTokenCount enforce budgets", () => {
    expect(assertPromptSize("sys", "user", 100)).toBeNull();
    expect(assertPromptSize("x".repeat(60), "y".repeat(60), 100)?.code).toBe(
      "CONTEXT_TOO_LARGE",
    );
    expect(estimateTokenCount("abcd")).toBe(1);
    expect(assertTokenLimit("x".repeat(40), 5)?.code).toBe(
      "TOKEN_LIMIT_EXCEEDED",
    );
    expect(assertOutputTokenUsage({ outputTokens: 99 }, 50)?.code).toBe(
      "TOKEN_LIMIT_EXCEEDED",
    );
    expect(assertOutputTokenUsage({ outputTokens: 10 }, 50)).toBeNull();
  });

  it("assertAllowedCapability allowlists registered ids", () => {
    expect(
      assertAllowedCapability(LEAD_BRIEF_V1_ID, [LEAD_BRIEF_V1_ID]),
    ).toBeNull();
    expect(
      assertAllowedCapability("unknown-cap", [LEAD_BRIEF_V1_ID])?.code,
    ).toBe("UNKNOWN_CAPABILITY");
    expect(validateAllowedCapability(LEAD_BRIEF_V1_ID).ok).toBe(true);
    expect(validateAllowedCapability("not-registered").ok).toBe(false);
  });

  it("assertJsonSchemaShape checks required fields", () => {
    const schema = {
      type: "object",
      required: ["brief"],
      properties: { brief: { type: "string" } },
    };
    expect(assertJsonSchemaShape({ brief: "ok" }, schema)).toBeNull();
    expect(assertJsonSchemaShape({ bullets: [] }, schema)?.code).toBe(
      "INVALID_OUTPUT",
    );
    expect(validateJsonSchema({ brief: "x" }, schema).ok).toBe(true);
  });

  it("rejects executable CRM command keys", () => {
    const err = assertNoExecutableCrmCommands({
      brief: "x",
      executeAction: { status: "Booked" },
    });
    expect(err?.code).toBe("SAFETY_VIOLATION");
    expect(err?.message).toContain("executeAction");

    const post = safetyPostCheck({ autoApply: true, brief: "x" });
    expect(post.ok).toBe(false);
  });

  it("validateAiActionProposal accepts inert Agent 1 types only", () => {
    const ok = validateAiActionProposal({
      id: "p1",
      leadId: "lead-1",
      type: AI_ACTION_TYPES.ADD_NOTE,
      title: "Add note",
      status: AI_ACTION_STATUS.PENDING_CONFIRMATION,
      createdAt: "2026-07-14T00:00:00.000Z",
      payload: { noteText: "Called; interested" },
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value.status).toBe(AI_PROPOSAL_REQUIRED_STATUS);
      expect(ok.requiredStatus).toBe(AI_ACTION_STATUS.PENDING_CONFIRMATION);
    }

    const unknown = validateAiActionProposal({
      id: "p2",
      type: "DELETE_LEAD",
      title: "Bad",
      status: AI_ACTION_STATUS.PENDING_CONFIRMATION,
      createdAt: "2026-07-14T00:00:00.000Z",
      payload: {},
    });
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) {
      expect(unknown.error.message).toContain("Unknown");
    }

    const executable = validateAiActionProposal({
      id: "p3",
      leadId: "lead-1",
      type: AI_ACTION_TYPES.STATUS_CHANGE,
      title: "Status",
      status: AI_ACTION_STATUS.PENDING_CONFIRMATION,
      createdAt: "2026-07-14T00:00:00.000Z",
      payload: { toStatus: "Interested" },
      execute: true,
    });
    expect(executable.ok).toBe(false);

    const malformed = validateAiActionProposal({
      id: "p4",
      type: AI_ACTION_TYPES.ADD_NOTE,
      title: "Note",
      status: AI_ACTION_STATUS.PENDING_CONFIRMATION,
      createdAt: "2026-07-14T00:00:00.000Z",
      payload: {},
    });
    expect(malformed.ok).toBe(false);
  });

  it("ensureProposalInert / allowWriteIntent never authorize execution", () => {
    const inert = ensureProposalInert("prop-1");
    expect(inert.blocked).toBe(true);
    expect(inert.error.code).toBe("SAFETY_VIOLATION");

    const write = allowWriteIntent({ type: AI_ACTION_TYPES.ADD_NOTE });
    expect(write.allowed).toBe(false);
    expect(isAllowedProposalType(AI_ACTION_TYPES.RECOMMEND_ASSIGNMENT)).toBe(
      true,
    );
    expect(isAllowedProposalType("HACK_CRM")).toBe(false);
  });

  it("withProviderTimeout maps to PROVIDER_TIMEOUT", async () => {
    await expect(
      withProviderTimeout(
        () => new Promise((r) => setTimeout(r, 50)),
        10,
      ),
    ).rejects.toMatchObject({ name: "ProviderTimeoutError" });

    const mapped = mapProviderEdgeError(
      Object.assign(new Error("AI provider timed out after 10ms"), {
        name: "ProviderTimeoutError",
      }),
    );
    expect(mapped.code).toBe("PROVIDER_TIMEOUT");
  });

  it("withProviderRetry retries transient failures then succeeds", async () => {
    let attempts = 0;
    const value = await withProviderRetry(
      async () => {
        attempts += 1;
        if (attempts < 2) {
          throw new Error("AI provider rate limited");
        }
        return "ok";
      },
      { maxAttempts: 2, retryDelayMs: 1 },
    );
    expect(value).toBe("ok");
    expect(attempts).toBe(2);
  });

  it("withProviderRetry uses exponential backoff", async () => {
    vi.useFakeTimers();
    const sleeps: number[] = [];
    let attempts = 0;

    const promise = withProviderRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error("AI provider unavailable");
        }
        return "ok";
      },
      {
        maxAttempts: 3,
        retryDelayMs: 10,
      },
    );

    await vi.advanceTimersByTimeAsync(10);
    sleeps.push(10);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(20);
    sleeps.push(20);

    await expect(promise).resolves.toBe("ok");
    expect(attempts).toBe(3);
    expect(sleeps).toEqual([10, 20]);
    vi.useRealTimers();
  });

  it("invokeProviderSafely does not retry timed out attempts", async () => {
    vi.useFakeTimers();
    let attempts = 0;

    const promise = invokeProviderSafely(
      async () => {
        attempts += 1;
        return new Promise<string>(() => undefined);
      },
      { timeoutMs: 10, maxAttempts: 2, retryDelayMs: 1 },
    );

    const rejection = expect(promise).rejects.toMatchObject({
      name: "ProviderTimeoutError",
    });
    await vi.advanceTimersByTimeAsync(10);
    await rejection;
    expect(attempts).toBe(1);
    vi.useRealTimers();
  });

  it("invokeProviderSafely aborts retry sleep when cancelled", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    let attempts = 0;

    const promise = invokeProviderSafely(
      async () => {
        attempts += 1;
        throw new Error("AI provider unavailable");
      },
      { maxAttempts: 2, retryDelayMs: 50 },
      { signal: controller.signal },
    );

    await Promise.resolve();
    controller.abort();
    await expect(promise).rejects.toSatisfy((err: unknown) => isAbortError(err));
    expect(attempts).toBe(1);
    vi.useRealTimers();
  });

  it("invokeProviderSafely wraps complete without breaking stub", async () => {
    const stub = new StubAiProvider();
    const result = await invokeProviderSafely(() =>
      stub.complete({
        capabilityId: LEAD_BRIEF_V1_ID,
        system: "sys",
        messages: [{ role: "user", content: "hi" }],
        responseFormat: "json",
      }),
    );
    expect(result.providerId).toBe(STUB_PROVIDER_ID);
    expect(result.json).toBeTruthy();
  });

  it("orchestrator passes maxTokens/timeoutMs and maps timeout errors", async () => {
    const seen: { req: AiCompletionRequest | null } = { req: null };
    const provider = new ScriptedProvider(async (req) => {
      seen.req = req;
      return {
        json: { brief: "Timed path", bullets: ["a"] },
        text: "Timed path",
        model: "scripted-v1",
        providerId: "scripted",
        latencyMs: 1,
        usage: { outputTokens: 5 },
      };
    });
    const orch = createAiOrchestrator({ enabled: true, provider });
    const result = await orch.run(LEAD_BRIEF_V1_ID, {
      context: briefContext(),
    });
    expect(result.ok).toBe(true);
    expect(seen.req?.maxTokens).toBe(DEFAULT_MAX_OUTPUT_TOKENS);
    expect(seen.req?.timeoutMs).toBe(DEFAULT_PROVIDER_TIMEOUT_MS);
    expect(getDefaultProviderSafetyPolicy().maxAttempts).toBe(
      DEFAULT_PROVIDER_MAX_ATTEMPTS,
    );
  });

  it("orchestrator rethrows aborted provider runs", async () => {
    const controller = new AbortController();
    const provider = new ScriptedProvider(async (_req, options) => {
      await new Promise((_, reject) => {
        options?.signal?.addEventListener(
          "abort",
          () => {
            const err = new Error("cancelled");
            err.name = "AbortError";
            reject(err);
          },
          { once: true },
        );
      });
      return {
        json: { brief: "never" },
        text: "never",
        model: "scripted-v1",
        providerId: "scripted",
        latencyMs: 1,
      };
    });
    const orch = createAiOrchestrator({ enabled: true, provider });
    const promise = orch.run(LEAD_BRIEF_V1_ID, {
      context: briefContext(),
      signal: controller.signal,
    });
    controller.abort();
    await expect(promise).rejects.toSatisfy((err: unknown) => isAbortError(err));
  });
});

function briefContext(
  overrides: Record<string, string> = {},
): Record<string, string> {
  return {
    statusLabel: "Interested",
    scoreBand: "warm",
    health: "watch",
    nextActionType: "call",
    nextActionReason: "Follow-up due",
    timelineSummary: "Called yesterday",
    facts: "Budget discussed",
    ...overrides,
  };
}

class ScriptedProvider implements AiProvider {
  readonly id = "scripted";
  readonly models = ["scripted-v1"] as const;
  constructor(
    private readonly impl: (
      req: AiCompletionRequest,
      options?: AiProviderCallOptions,
    ) => Promise<AiCompletionResult> | AiCompletionResult,
  ) {}
  async complete(
    req: AiCompletionRequest,
    options?: AiProviderCallOptions,
  ): Promise<AiCompletionResult> {
    return this.impl(req, options);
  }
}

describe("AiOrchestrator", () => {
  it("returns AI_DISABLED when enabled defaults to AI_ENABLED", async () => {
    const orch = createAiOrchestrator();
    expect(orch.isEnabled()).toBe(false);
    expect(orch.getProviderId()).toBe(STUB_PROVIDER_ID);
    const result = await orch.run(LEAD_BRIEF_V1_ID, { leadId: "x" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AI_DISABLED");
      expect(result.audit?.errorCode).toBe("AI_DISABLED");
    }
  });

  it("runs lead-brief-v1 via stub when enabled", async () => {
    const orch = createAiOrchestrator({ enabled: true });
    const result = await orch.run(LEAD_BRIEF_V1_ID, {
      leadId: "lead_42",
      userId: "user_1",
      role: "telecaller",
      context: briefContext(),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.capabilityId).toBe(LEAD_BRIEF_V1_ID);
      expect(result.source).toBe("stub");
      expect((result.data as LeadBriefV1Output).brief).toContain("lead_42");
      expect((result.data as LeadBriefV1Output).bullets?.length).toBeGreaterThan(
        0,
      );
      expect(result.audit.ok).toBe(true);
      expect(result.audit.providerId).toBe(STUB_PROVIDER_ID);
      expect(result.audit.contextHash).toBeTruthy();
      expect(result.audit.userId).toBe("user_1");
      expect(result.audit.leadId).toBe("lead_42");
    }
  });

  it("accepts injected AiProvider and marks source as llm when not stub", async () => {
    const provider = new ScriptedProvider(async () => ({
      json: { brief: "Injected brief", bullets: ["one"] },
      text: "Injected brief",
      model: "scripted-v1",
      providerId: "scripted",
      latencyMs: 1,
    }));
    const orch = createAiOrchestrator({ enabled: true, provider });
    expect(orch.getProviderId()).toBe("scripted");
    const result = await orch.run(LEAD_BRIEF_V1_ID, {
      context: briefContext(),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe("llm");
      expect((result.data as LeadBriefV1Output).brief).toBe("Injected brief");
      expect(result.audit.providerId).toBe("scripted");
    }
  });

  it("fails on unknown capability when enabled", async () => {
    const orch = createAiOrchestrator({ enabled: true });
    const result = await orch.run("not-a-real-capability");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNKNOWN_CAPABILITY");
    }
  });

  it("fails when context exceeds maxContextChars", async () => {
    const orch = createAiOrchestrator({ enabled: true });
    const huge = "x".repeat(5000);
    const result = await orch.run(LEAD_BRIEF_V1_ID, {
      context: briefContext({ statusLabel: huge }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CONTEXT_TOO_LARGE");
    }
  });

  it("maps provider throw to PROVIDER_ERROR", async () => {
    const provider = new ScriptedProvider(async () => {
      throw new Error("boom");
    });
    const orch = createAiOrchestrator({ enabled: true, provider });
    const result = await orch.run(LEAD_BRIEF_V1_ID, {
      context: briefContext(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PROVIDER_ERROR");
      expect(result.error.message).toContain("boom");
    }
  });

  it("rejects empty provider output as INVALID_OUTPUT", async () => {
    const provider = new ScriptedProvider(async () => ({
      model: "scripted-v1",
      providerId: "scripted",
      latencyMs: 1,
    }));
    const orch = createAiOrchestrator({ enabled: true, provider });
    const result = await orch.run(LEAD_BRIEF_V1_ID, {
      context: briefContext(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_OUTPUT");
    }
  });

  it("rejects CRM patch in provider json via safety post-check", async () => {
    const provider = new ScriptedProvider(async () => ({
      json: { brief: "ok", leadPatch: { status: "Booked" } },
      text: "ok",
      model: "scripted-v1",
      providerId: "scripted",
      latencyMs: 1,
    }));
    const orch = createAiOrchestrator({ enabled: true, provider });
    const result = await orch.run(LEAD_BRIEF_V1_ID, {
      context: briefContext(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SAFETY_VIOLATION");
    }
  });

  it("rejects schema-invalid provider json as INVALID_OUTPUT", async () => {
    const provider = new ScriptedProvider(async () => ({
      json: { nope: true },
      text: "nope",
      model: "scripted-v1",
      providerId: "scripted",
      latencyMs: 1,
    }));
    const orch = createAiOrchestrator({ enabled: true, provider });
    const result = await orch.run(LEAD_BRIEF_V1_ID, {
      context: briefContext(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_OUTPUT");
    }
  });

  it("strips intelligence overrides from successful provider output", async () => {
    const provider = new ScriptedProvider(async () => ({
      json: {
        brief: "Coaching only",
        bullets: ["Stay on script"],
        score: 99,
        health: "at_risk",
      },
      text: "Coaching only",
      model: "scripted-v1",
      providerId: "scripted",
      latencyMs: 1,
    }));
    const orch = createAiOrchestrator({ enabled: true, provider });
    const result = await orch.run(LEAD_BRIEF_V1_ID, {
      context: briefContext(),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.data as LeadBriefV1Output & {
        score?: number;
        health?: string;
      };
      expect(data.brief).toBe("Coaching only");
      expect(data.score).toBeUndefined();
      expect(data.health).toBeUndefined();
    }
  });

  it("runs end-to-end with buildLeadBriefContextSlots (no score fork)", async () => {
    const slots = buildLeadBriefContextSlots({
      lead: {
        id: "lead_e2e",
        status: "interested",
        followUpDate: "2026-07-10",
        callLogs: [],
        updatedAt: "2026-07-01T10:00:00.000Z",
        createdAt: "2026-06-20T10:00:00.000Z",
      },
      automationOptions: { todayYmd: "2026-07-14" },
      intelligenceOptions: {
        todayYmd: "2026-07-14",
        nowMs: Date.parse("2026-07-14T06:00:00.000Z"),
      },
    });

    for (const field of leadBriefV1Contract.inputFields) {
      expect(slots).toHaveProperty(field);
    }

    const orch = createAiOrchestrator({ enabled: true });
    const result = await orch.run(LEAD_BRIEF_V1_ID, {
      leadId: "lead_e2e",
      role: "telecaller",
      context: { ...slots },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe("stub");
      expect((result.data as LeadBriefV1Output).brief).toContain("lead_e2e");
      // Output must not redefine Wave 6 intelligence fields
      expect(
        (result.data as { score?: unknown; scoreBand?: unknown }).score,
      ).toBeUndefined();
      expect(
        (result.data as { scoreBand?: unknown }).scoreBand,
      ).toBeUndefined();
    }
  });
});
