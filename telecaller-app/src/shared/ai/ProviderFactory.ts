/**
 * Selects Stub vs live Gemini provider.
 *
 * Rules (see wave7-phase2c-agent0-notes.md):
 * 1. Explicit `kind` / injected provider wins (tests).
 * 2. If AI master is off → stub (fail closed).
 * 3. If `VITE_AI_PROVIDER` is `gemini` | `live` (non-prod or any build) → Gemini.
 * 4. Otherwise → stub (safe default even when AI is on).
 *
 * Live path never embeds API keys; GeminiProvider calls Cloud Function `aiComplete`.
 */

import type { AiProvider } from "./AiProvider";
import {
  GeminiProvider,
  type GeminiProviderOptions,
} from "./GeminiProvider";
import { StubAiProvider } from "./StubAiProvider";
import { isAiEnabled, parseAiEnabledEnvValue } from "./featureFlags";

export type AiProviderKind = "stub" | "gemini";

export interface CreateAiProviderOptions {
  /** Force a specific kind (tests / runtime override). */
  kind?: AiProviderKind;
  /** Always return stub regardless of env. */
  forceStub?: boolean;
  /**
   * Whether AI is considered enabled for selection.
   * Defaults to `isAiEnabled()`. Pass orchestrator `enabled` when wiring.
   */
  aiEnabled?: boolean;
  gemini?: GeminiProviderOptions;
}

/**
 * Parse `VITE_AI_PROVIDER` (`stub` | `gemini` | `live`).
 * Unset / unknown → stub.
 */
export function parseAiProviderEnvValue(
  raw: string | undefined | null,
): AiProviderKind {
  if (raw == null) return "stub";
  const normalized = raw.trim().toLowerCase();
  if (normalized === "gemini" || normalized === "live") return "gemini";
  return "stub";
}

function readProviderEnv(): AiProviderKind {
  return parseAiProviderEnvValue(import.meta.env.VITE_AI_PROVIDER);
}

/**
 * Resolve which provider kind the factory should construct.
 */
export function resolveAiProviderKind(
  options: Pick<CreateAiProviderOptions, "kind" | "forceStub" | "aiEnabled"> = {},
): AiProviderKind {
  if (options.forceStub) return "stub";
  if (options.kind) return options.kind;

  const enabled =
    options.aiEnabled !== undefined ? options.aiEnabled : isAiEnabled();
  if (!enabled) return "stub";

  return readProviderEnv();
}

/**
 * Construct an AiProvider per selection rules.
 * Stub remains the default; live Gemini only when enabled + env asks for it.
 */
export function createAiProvider(
  options: CreateAiProviderOptions = {},
): AiProvider {
  const kind = resolveAiProviderKind(options);
  if (kind === "gemini") {
    return new GeminiProvider(options.gemini);
  }
  return new StubAiProvider();
}

/**
 * True when env requests live Gemini (ignores AI master flag).
 * Useful for diagnostics; factory still requires AI enabled.
 */
export function isLiveAiProviderConfigured(): boolean {
  return readProviderEnv() === "gemini";
}

/** Re-export for notes / tests that document env parsing helpers together. */
export { parseAiEnabledEnvValue };
