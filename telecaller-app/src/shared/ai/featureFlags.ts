/**
 * Wave 7 AI feature flags — wraps `AI_ENABLED` with optional env resolution.
 *
 * Default: OFF. Production builds stay off unless `AI_ENABLED` is flipped in code
 * (or a future Remote Config layer). Optional `VITE_AI_ENABLED` only applies in
 * non-production builds so local/dev can exercise AI without shipping on-by-default.
 *
 * Orchestrator: pass `createAiOrchestrator({ enabled: isAiEnabled() })`.
 * Do not import vendor SDKs or Firebase Remote Config here yet.
 */

import { hasPromptContract } from "./PromptRegistry";
import { AI_CAPABILITY_IDS, AI_ENABLED } from "./types";

/**
 * Parse optional truthy env strings (`true` / `1` / `yes`, case-insensitive).
 * Unset, empty, or any other value → false.
 */
export function parseAiEnabledEnvValue(
  raw: string | boolean | undefined | null,
): boolean {
  if (raw === true) return true;
  if (raw == null) return false;
  if (typeof raw !== "string") return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

/**
 * Optional Vite env override. Honored only when `import.meta.env.PROD` is false
 * so production never turns on via env by accident.
 */
function readDevEnvAiEnabled(): boolean {
  if (import.meta.env.PROD) return false;
  return parseAiEnabledEnvValue(import.meta.env.VITE_AI_ENABLED);
}

/**
 * Master AI kill-switch resolution.
 * 1. Compile-time `AI_ENABLED` (currently false)
 * 2. Else optional `VITE_AI_ENABLED` in non-prod builds only
 */
export function isAiEnabled(): boolean {
  if (AI_ENABLED) return true;
  return readDevEnvAiEnabled();
}

/**
 * Capability-level gate.
 * - No `capabilityId` → same as master `isAiEnabled()`
 * - With `capabilityId` → master must be on AND capability must be known
 *   (registered prompt contract or declared `AI_CAPABILITY_IDS` value)
 *
 * Unknown IDs fail closed. Per-capability Remote Config can plug in later
 * without changing call sites.
 */
export function AiFeatureGate(capabilityId?: string): boolean {
  if (!isAiEnabled()) return false;
  if (capabilityId == null || capabilityId === "") return true;

  if (hasPromptContract(capabilityId)) return true;

  const declared = Object.values(AI_CAPABILITY_IDS) as string[];
  return declared.includes(capabilityId);
}
