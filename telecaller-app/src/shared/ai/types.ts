/**
 * Wave 7 AI platform — shared DTOs.
 * Feature UI imports orchestrator + types only; never a vendor SDK.
 */

import type { AiActionProposal } from "./contracts/confirmWriteContracts";

/**
 * Compile-time master kill switch (default false).
 * Runtime resolution: `isAiEnabled()` / `AiFeatureGate` in `featureFlags.ts`.
 */
export const AI_ENABLED = false;

export type AiWritePolicy = "none" | "propose" | "policy_auto";
export type AiResponseFormat = "text" | "json";
export type AiMessageRole = "user" | "assistant" | "system";
export type AiResultSource = "stub" | "llm" | "rules";

export type AiErrorCode =
  | "AI_DISABLED"
  | "UNKNOWN_CAPABILITY"
  | "UNAUTHORIZED"
  | "SAFETY_VIOLATION"
  | "INVALID_OUTPUT"
  | "PROVIDER_ERROR"
  | "PROVIDER_TIMEOUT"
  | "TOKEN_LIMIT_EXCEEDED"
  | "CONTEXT_TOO_LARGE";

export interface AiMessage {
  role: AiMessageRole;
  content: string;
}

export interface AiCompletionRequest {
  capabilityId: string;
  context?: Record<string, unknown>;
  model?: string;
  system: string;
  messages: AiMessage[];
  responseFormat?: AiResponseFormat;
  jsonSchema?: unknown;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  metadata?: Record<string, string>;
}

export interface AiTokenUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface AiCompletionResult {
  text?: string;
  json?: unknown;
  usage?: AiTokenUsage;
  model: string;
  providerId: string;
  latencyMs: number;
  finishReason?: string;
}

export interface AiError {
  code: AiErrorCode;
  message: string;
  details?: unknown;
}

/** In-memory / log-shaped audit. Persistence TBD — no Firestore in Phase 2A. */
export interface AiAuditRecord {
  id: string;
  capabilityId: string;
  promptVersion: string;
  providerId: string;
  model: string;
  userId?: string;
  leadId?: string;
  role?: string;
  contextHash?: string;
  latencyMs: number;
  usage?: AiTokenUsage;
  ok: boolean;
  errorCode?: AiErrorCode;
  timestamp: string;
}

/** C1 structured output for `lead-brief-v1`. */
export interface LeadBriefV1Output {
  brief: string;
  bullets?: string[];
  /** Optional W7-AI-3 proposal set; execution still requires human confirmation. */
  proposals?: AiActionProposal[];
}

/**
 * Orchestrator input. Context builders (Agent 1) supply `context`;
 * Agent 0 accepts preloaded context only — no CRM I/O here.
 */
export interface AiRunInput {
  leadId?: string;
  userId?: string;
  role?: string;
  /** Slot values for the prompt `userTemplate` (`{{key}}`). */
  context?: Record<string, unknown>;
  metadata?: Record<string, string>;
  /** Optional request cancellation / supersession signal from the UI. */
  signal?: AbortSignal;
}

export type AiCapabilityResult<T = unknown> =
  | {
      ok: true;
      capabilityId: string;
      data: T;
      text?: string;
      source: AiResultSource;
      audit: AiAuditRecord;
    }
  | {
      ok: false;
      capabilityId: string;
      error: AiError;
      audit?: AiAuditRecord;
    };

export const AI_CAPABILITY_IDS = {
  LEAD_BRIEF_V1: "lead-brief-v1",
} as const;

export type AiCapabilityId =
  (typeof AI_CAPABILITY_IDS)[keyof typeof AI_CAPABILITY_IDS];
