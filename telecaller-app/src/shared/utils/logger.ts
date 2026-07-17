/**
 * Centralised logger utility.
 *
 * In production builds all debug/info output is suppressed.
 * Errors and warnings are always emitted so they surface in
 * crash-reporting tools (Sentry, Crashlytics, etc.) later.
 *
 * Optional Sentry path (no paid setup required):
 *   Set VITE_SENTRY_DSN to enable. Without a DSN, capture hooks are no-ops.
 *
 * Usage:
 *   import { logger } from "@/shared/utils/logger";
 *   logger.info("LeadsStore", "Fetched 42 leads");
 *   logger.error("AuthService", "Login failed", err);
 */

const IS_DEV =
  typeof import.meta !== "undefined" &&
  (import.meta as ImportMeta & { env?: Record<string, unknown> }).env?.DEV === true;

const SENTRY_DSN =
  typeof import.meta !== "undefined"
    ? String(
        (import.meta as ImportMeta & { env?: Record<string, unknown> }).env
          ?.VITE_SENTRY_DSN || "",
      ).trim()
    : "";

type LogLevel = "debug" | "info" | "warn" | "error";

type StructuredEvent = {
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

/**
 * Env-gated structured capture hook.
 * Replace body when @sentry/browser (or similar) is installed —
 * keep this stub so enabling Sentry is a one-line DSN + SDK install.
 */
const captureStructured: CaptureHook = (event) => {
  if (!SENTRY_DSN) return;
  // Ready hook: structured payload for a future Sentry.init({ dsn: SENTRY_DSN }).
  // Until the SDK is added, mirror to console so prod errors remain visible.
  if (typeof console !== "undefined" && typeof console.debug === "function") {
    console.debug("[logger:sentry-stub]", {
      dsnConfigured: true,
      level: event.level,
      context: event.context,
      message: event.message,
      timestamp: event.timestamp,
    });
  }
};

let extraCaptureHook: CaptureHook | null = null;

/** Register an optional structured capture sink (e.g. wiring real Sentry later). */
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
  captureStructured(event);
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
