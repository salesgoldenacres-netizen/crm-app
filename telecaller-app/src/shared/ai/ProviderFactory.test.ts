/**
 * Phase 2C — ProviderFactory + GeminiProvider unit tests.
 * No network; Gemini uses injected invoke. Factory selection is pure.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AI_COMPLETE_CALLABLE,
  GeminiProvider,
  GEMINI_DEFAULT_MODEL,
  GEMINI_PROVIDER_ID,
  createAiProvider,
  createAiRuntime,
  createAiOrchestrator,
  parseAiProviderEnvValue,
  resolveAiProviderKind,
  STUB_PROVIDER_ID,
  LEAD_BRIEF_V1_ID,
  type AiCompletionResult,
} from "./index";

describe("parseAiProviderEnvValue", () => {
  it("defaults unset/unknown to stub", () => {
    expect(parseAiProviderEnvValue(undefined)).toBe("stub");
    expect(parseAiProviderEnvValue("")).toBe("stub");
    expect(parseAiProviderEnvValue("openai")).toBe("stub");
    expect(parseAiProviderEnvValue("stub")).toBe("stub");
  });

  it("accepts gemini and live aliases", () => {
    expect(parseAiProviderEnvValue("gemini")).toBe("gemini");
    expect(parseAiProviderEnvValue("LIVE")).toBe("gemini");
    expect(parseAiProviderEnvValue(" Gemini ")).toBe("gemini");
  });
});

describe("resolveAiProviderKind / createAiProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns stub when AI disabled even if env asks for gemini", () => {
    vi.stubEnv("VITE_AI_PROVIDER", "gemini");
    expect(resolveAiProviderKind({ aiEnabled: false })).toBe("stub");
    expect(createAiProvider({ aiEnabled: false }).id).toBe(STUB_PROVIDER_ID);
  });

  it("returns stub when AI enabled but provider env unset", () => {
    expect(resolveAiProviderKind({ aiEnabled: true })).toBe("stub");
    expect(createAiProvider({ aiEnabled: true }).id).toBe(STUB_PROVIDER_ID);
  });

  it("returns gemini when AI enabled and VITE_AI_PROVIDER=gemini", () => {
    vi.stubEnv("VITE_AI_PROVIDER", "gemini");
    expect(resolveAiProviderKind({ aiEnabled: true })).toBe("gemini");
    expect(createAiProvider({ aiEnabled: true }).id).toBe(GEMINI_PROVIDER_ID);
  });

  it("honors explicit kind and forceStub", () => {
    expect(resolveAiProviderKind({ kind: "gemini", aiEnabled: false })).toBe(
      "gemini",
    );
    expect(
      createAiProvider({ kind: "gemini", forceStub: true, aiEnabled: true }).id,
    ).toBe(STUB_PROVIDER_ID);
  });
});

describe("GeminiProvider", () => {
  it("satisfies AiProvider shape and uses proxy result", async () => {
    const invoke = vi.fn(async (): Promise<AiCompletionResult> => ({
      json: { brief: "Live brief", bullets: ["a"] },
      text: "Live brief",
      model: GEMINI_DEFAULT_MODEL,
      providerId: GEMINI_PROVIDER_ID,
      latencyMs: 12,
      finishReason: "stop",
      usage: { inputTokens: 10, outputTokens: 5 },
    }));

    const provider = new GeminiProvider({ invoke });
    expect(provider.id).toBe(GEMINI_PROVIDER_ID);
    expect(provider.models).toContain(GEMINI_DEFAULT_MODEL);

    const result = await provider.complete({
      capabilityId: LEAD_BRIEF_V1_ID,
      context: { statusLabel: "New", facts: "Email me at lead@example.com" },
      system: "sys",
      messages: [{ role: "user", content: "brief me" }],
      responseFormat: "json",
      metadata: { leadId: "lead-1" },
    });

    expect(invoke).toHaveBeenCalledWith(
      {
        capabilityId: LEAD_BRIEF_V1_ID,
        context: {
          statusLabel: "New",
          facts: "Email me at lead@example.com",
        },
        leadId: "lead-1",
      },
      undefined,
    );
    expect(result.providerId).toBe(GEMINI_PROVIDER_ID);
    expect(result.json).toMatchObject({ brief: "Live brief" });
    expect(AI_COMPLETE_CALLABLE).toBe("aiComplete");
  });

  it("forwards abort signals to the live invoke transport", async () => {
    const controller = new AbortController();
    const invoke = vi.fn(async (): Promise<AiCompletionResult> => ({
      json: { brief: "Live brief" },
      text: "Live brief",
      model: GEMINI_DEFAULT_MODEL,
      providerId: GEMINI_PROVIDER_ID,
      latencyMs: 12,
    }));

    const provider = new GeminiProvider({ invoke });
    await provider.complete(
      {
        capabilityId: LEAD_BRIEF_V1_ID,
        system: "sys",
        messages: [{ role: "user", content: "brief me" }],
      },
      { signal: controller.signal },
    );

    expect(invoke).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it("fails closed with a safe Error when invoke rejects", async () => {
    const provider = new GeminiProvider({
      invoke: async () => {
        const err = Object.assign(new Error("missing GEMINI_API_KEY"), {
          code: "functions/failed-precondition",
        });
        throw err;
      },
    });

    await expect(
      provider.complete({
        capabilityId: LEAD_BRIEF_V1_ID,
        system: "sys",
        messages: [{ role: "user", content: "x" }],
      }),
    ).rejects.toThrow(/not configured|unavailable/i);
  });
});

describe("createAiRuntime / orchestrator factory wiring", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("createAiOrchestrator still defaults to stub when AI off", () => {
    const orch = createAiOrchestrator();
    expect(orch.getProviderId()).toBe(STUB_PROVIDER_ID);
    expect(orch.isEnabled()).toBe(false);
  });

  it("createAiRuntime wires live provider through orchestrator when enabled", async () => {
    const invoke = vi.fn(async (): Promise<AiCompletionResult> => ({
      json: {
        brief: "Runtime live brief",
        bullets: ["Follow CRM next-action."],
      },
      text: "Runtime live brief",
      model: GEMINI_DEFAULT_MODEL,
      providerId: GEMINI_PROVIDER_ID,
      latencyMs: 8,
      finishReason: "stop",
    }));

    const orch = createAiRuntime({
      enabled: true,
      providerKind: "gemini",
      gemini: { invoke },
    });

    expect(orch.getProviderId()).toBe(GEMINI_PROVIDER_ID);

    const result = await orch.run(LEAD_BRIEF_V1_ID, {
      leadId: "lead_live",
      role: "telecaller",
      context: {
        statusLabel: "New",
        scoreBand: "warm",
        health: "healthy",
        nextActionSummary: "Call today",
        timelineDigest: "none",
        automationFlags: "none",
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe("llm");
      expect(result.audit.providerId).toBe(GEMINI_PROVIDER_ID);
      expect((result.data as { brief: string }).brief).toContain("Runtime");
    }
    expect(invoke).toHaveBeenCalled();
  });

  it("maps provider throw to PROVIDER_ERROR", async () => {
    const orch = createAiRuntime({
      enabled: true,
      providerKind: "gemini",
      gemini: {
        invoke: async () => {
          throw Object.assign(new Error("no key"), {
            code: "functions/failed-precondition",
          });
        },
      },
    });

    const result = await orch.run(LEAD_BRIEF_V1_ID, {
      context: {
        statusLabel: "New",
        scoreBand: "warm",
        health: "healthy",
        nextActionSummary: "Call",
        timelineDigest: "none",
        automationFlags: "none",
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PROVIDER_ERROR");
    }
  });
});
