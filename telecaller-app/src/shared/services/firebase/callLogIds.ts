/**
 * Stable id helpers for call log migration / idempotent creates.
 * Pure functions — safe to unit test without Firestore.
 */

/** Sanitize a fragment for use inside a Firestore document id. */
export function sanitizeCallLogIdPart(value: string, maxLen = 48): string {
  return String(value || "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, maxLen);
}

/**
 * Deterministic id for an embedded call log entry during backfill.
 * Re-running backfill with the same lead + index + payload yields the same id.
 */
export function buildEmbeddedCallLogId(
  leadId: string,
  index: number,
  log: { date?: string; note?: string; agent?: string; status?: string },
): string {
  const lead = sanitizeCallLogIdPart(leadId, 40);
  const date = sanitizeCallLogIdPart(log.date || "", 24);
  const agent = sanitizeCallLogIdPart(log.agent || "", 20);
  const status = sanitizeCallLogIdPart(log.status || "", 16);
  // Include a short note fingerprint so reorders with same index but different
  // content do not collide incorrectly; keep id length under Firestore limits.
  const noteFp = simpleHash(String(log.note || "")).toString(36).slice(0, 8);
  return `emb_${lead}_${index}_${date}_${agent}_${status}_${noteFp}`;
}

/** Tiny non-crypto fingerprint for id stability (not security-sensitive). */
export function simpleHash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Env key for Phase C dual-read (embedded `lead.callLogs[]` merge on read).
 *
 * Rollout (see `directives/phase-0-audit-convergence.md` Agent A):
 * 1. Dry-run + apply backfill (`execution/backfill_call_logs.py`)
 * 2. `--verify` on backfill script → 0 missing top-level docs
 * 3. Spot-check lead history UI
 * 4. Set `VITE_CALL_LOGS_EMBEDDED_FALLBACK=false` in production env + OTA rebuild
 * 5. Remove dual-read merge path once stable (next patch)
 *
 * Default remains `true` until step 4 so pre-backfill history stays visible.
 * Only explicit `false` or `0` disables embedded fallback.
 */
export const CALL_LOGS_EMBEDDED_FALLBACK_ENV = "VITE_CALL_LOGS_EMBEDDED_FALLBACK";

export function isEmbeddedCallLogFallbackEnabled(): boolean {
  const raw = String(import.meta.env[CALL_LOGS_EMBEDDED_FALLBACK_ENV] ?? "true");
  return raw !== "false" && raw !== "0";
}
