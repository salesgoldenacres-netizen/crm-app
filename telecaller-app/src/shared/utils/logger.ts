/**
 * Centralised logger utility.
 *
 * In production builds all debug/info output is suppressed.
 * Errors and warnings are always emitted so they surface in
 * crash-reporting tools (Sentry, Crashlytics, etc.).
 *
 * Optional Sentry path:
 *   Set VITE_SENTRY_DSN and call initAppSentry() at startup.
 *   Without a DSN, capture hooks are no-ops (warn only — not a deploy blocker).
 *
 * Usage:
 *   import { logger } from "@/shared/utils/logger";
 *   logger.info("LeadsStore", "Fetched 42 leads");
 *   logger.error("AuthService", "Login failed", err);
 */

const IS_DEV =
  typeof import.meta !== "undefined" &&
  (import.meta as ImportMeta & { env?: Record<string, unknown> }).env?.DEV === true;

type LogLevel = "debug" | "info" | "warn" | "error";

export type StructuredEvent = {
  level: LogLevel;
  context: string;
  message: string;
  data?: unknown[];
  timestamp: string;
};

type CaptureHook = (event: StructuredEvent) => void;

function formatPrefix(level: LogLevel, context: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] [${context}]`;
}

function noop(..._args: unknown[]): void {
  // intentionally empty – used to silence logs in production
}

let extraCaptureHook: CaptureHook | null = null;

/** Register an optional structured capture sink (wired by initAppSentry). */
export function setLoggerCaptureHook(hook: CaptureHook | null): void {
  extraCaptureHook = hook;
}

function emitStructured(
  level: LogLevel,
  context: string,
  message: string,
  data: unknown[],
): void {
  const event: StructuredEvent = {
    level,
    context,
    message,
    data: data.length ? data : undefined,
    timestamp: new Date().toISOString(),
  };
  if (extraCaptureHook) {
    try {
      extraCaptureHook(event);
    } catch {
      // never let reporting break the app
    }
  }
}

export const logger = {
  /**
   * Verbose developer-only logs. Stripped in production.
   */
  debug: IS_DEV
    ? (context: string, message: string, ...data: unknown[]) =>
        console.debug(formatPrefix("debug", context), message, ...data)
    : noop,

  /**
   * General informational messages. Stripped in production.
   */
  info: IS_DEV
    ? (context: string, message: string, ...data: unknown[]) =>
        console.info(formatPrefix("info", context), message, ...data)
    : noop,

  /**
   * Warnings that may indicate a problem. Always emitted.
   */
  warn: (context: string, message: string, ...data: unknown[]) => {
    console.warn(formatPrefix("warn", context), message, ...data);
    emitStructured("warn", context, message, data);
  },

  /**
   * Errors and exceptions. Always emitted.
   */
  error: (context: string, message: string, ...data: unknown[]) => {
    console.error(formatPrefix("error", context), message, ...data);
    emitStructured("error", context, message, data);
  },
};
