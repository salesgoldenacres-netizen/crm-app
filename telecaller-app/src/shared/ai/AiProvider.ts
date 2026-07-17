/**
 * Pluggable model backend. Feature code must never import a vendor SDK —
 * only AiProvider implementations live behind the orchestrator.
 */

import type { AiCompletionRequest, AiCompletionResult } from "./types";

export interface AiProviderCallOptions {
  signal?: AbortSignal;
}

export interface AiProvider {
  readonly id: string;
  readonly models: readonly string[];
  complete(
    req: AiCompletionRequest,
    options?: AiProviderCallOptions,
  ): Promise<AiCompletionResult>;
}
