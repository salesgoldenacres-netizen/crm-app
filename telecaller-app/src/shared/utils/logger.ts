/**
 * Centralised logger utility.
 *
 * In production builds all debug/info output is suppressed.
 * Errors and warnings are always emitted so they surface in
 * crash-reporting tools (Sentry, Crashlytics, etc.) later.
 *
 * Usage:
 *   import { logger } from "@/shared/utils/logger";
 *   logger.info("LeadsStore", "Fetched 42 leads");
 *   logger.error("AuthService", "Login failed", err);
 */

const IS_DEV =
  typeof import.meta !== "undefined" &&
  (import.meta as any).env?.DEV === true;

type LogLevel = "debug" | "info" | "warn" | "error";

function formatPrefix(level: LogLevel, context: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] [${context}]`;
}

function noop(..._args: unknown[]): void {
  // intentionally empty – used to silence logs in production
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
  warn: (context: string, message: string, ...data: unknown[]) =>
    console.warn(formatPrefix("warn", context), message, ...data),

  /**
   * Errors and exceptions. Always emitted.
   */
  error: (context: string, message: string, ...data: unknown[]) =>
    console.error(formatPrefix("error", context), message, ...data),
};
