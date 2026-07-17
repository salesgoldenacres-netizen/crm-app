/**
 * AI runtime wiring — factory + flags → orchestrator.
 *
 * Prefer `createAiRuntime()` for product call sites (uses `isAiEnabled()` + factory).
 * `createAiOrchestrator()` remains stable; it now defaults provider via factory
 * when none is injected (still defaults `enabled` to compile-time `AI_ENABLED`).
 */

import {
  AiOrchestrator,
  createAiOrchestrator,
  type AiOrchestratorOptions,
} from "./AiOrchestrator";
import {
  createAiProvider,
  type AiProviderKind,
  type CreateAiProviderOptions,
} from "./ProviderFactory";
import type { GeminiProviderOptions } from "./GeminiProvider";
import { isAiEnabled } from "./featureFlags";

export interface AiRuntimeOptions extends AiOrchestratorOptions {
  /** Override factory kind (`stub` | `gemini`). */
  providerKind?: AiProviderKind;
  /** Force stub even if env requests gemini. */
  forceStub?: boolean;
  /** Forwarded to GeminiProvider when live is selected. */
  gemini?: GeminiProviderOptions;
}

/**
 * Product-facing constructor:
 * - `enabled` defaults to `isAiEnabled()`
 * - `provider` defaults to `createAiProvider(...)` unless injected
 */
export function createAiRuntime(
  options: AiRuntimeOptions = {},
): AiOrchestrator {
  const enabled = options.enabled ?? isAiEnabled();
  const provider =
    options.provider ??
    createAiProvider({
      kind: options.providerKind,
      forceStub: options.forceStub,
      aiEnabled: enabled,
      gemini: options.gemini,
    } satisfies CreateAiProviderOptions);

  return createAiOrchestrator({
    enabled,
    provider,
  });
}

export type { AiProviderKind, CreateAiProviderOptions, GeminiProviderOptions };
