/**
 * Optional Sentry wiring for the web app.
 *
 * Enabled only when VITE_SENTRY_DSN is set. Missing DSN → warn, never a deploy blocker.
 * The @sentry/react SDK is dynamically imported so the vendor chunk is only fetched
 * on builds/environments that actually configure a DSN (P-3).
 * No full APM / tracing mesh in this wave (tracesSampleRate defaults low).
 */

import { logger, setLoggerCaptureHook } from "@/shared/utils/logger";

type SentryModule = typeof import("@sentry/react");

let initialized = false;
let sentry: SentryModule | null = null;

function readDsn(): string {
  return String(import.meta.env.VITE_SENTRY_DSN || "").trim();
}

/**
 * Initialize Sentry + wire logger capture. Safe to call once at startup.
 * @returns true when SDK is active
 */
export async function initAppSentry(): Promise<boolean> {
  const dsn = readDsn();
  if (!dsn) {
    logger.warn(
      "Sentry",
      "VITE_SENTRY_DSN not set — client error reporting disabled (not a deploy blocker)",
    );
    return false;
  }

  if (initialized) return true;

  // Only pull the SDK bundle into the network graph when a DSN is present.
  const Sentry = await import("@sentry/react");
  sentry = Sentry;

  const envRate = import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE;
  let tracesSampleRate = 0.05; // Default prod rate
  if (envRate !== undefined && envRate !== "") {
    const parsed = parseFloat(String(envRate));
    if (!isNaN(parsed)) {
      tracesSampleRate = parsed;
    }
  } else {
    const mode = import.meta.env.MODE;
    if (mode === "development" || mode === "dev") {
      tracesSampleRate = 1.0;
    } else if (mode === "staging") {
      tracesSampleRate = 0.2;
    }
  }

  Sentry.init({
    dsn,
    environment: String(import.meta.env.MODE || "production"),
    tracesSampleRate,
    sendDefaultPii: false,
  });

  setLoggerCaptureHook((event) => {
    if (event.level === "error") {
      const err = event.data?.find((d) => d instanceof Error);
      if (err instanceof Error) {
        Sentry.captureException(err, {
          tags: { context: event.context },
          extra: {
            message: event.message,
            data: event.data,
            timestamp: event.timestamp,
          },
        });
      } else {
        Sentry.captureMessage(`[${event.context}] ${event.message}`, {
          level: "error",
          tags: { context: event.context },
          extra: {
            data: event.data,
            timestamp: event.timestamp,
          },
        });
      }
      return;
    }

    if (event.level === "warn") {
      Sentry.addBreadcrumb({
        category: event.context,
        message: event.message,
        level: "warning",
        data: event.data ? { data: event.data } : undefined,
      });
    }
  });

  initialized = true;
  logger.info("Sentry", "Client error reporting initialized");
  return true;
}

/** Capture an exception if Sentry is active (no-op otherwise). */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!initialized || !sentry) return;
  sentry.captureException(error, context ? { extra: context } : undefined);
}

export function isSentryEnabled(): boolean {
  return initialized;
}
