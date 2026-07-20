import type { CallLog } from "@/shared/types";

const SYSTEM_CALL_AGENTS = new Set([
  "system",
  "System (Auto)",
  "system_webhook",
]);

export function isSystemCallAgent(agent: string | undefined | null): boolean {
  if (!agent) return false;
  return SYSTEM_CALL_AGENTS.has(String(agent));
}

/** Lead summary patch applied on every new call-log write. */
export function buildLeadCallSummaryPatch(
  log: CallLog,
  options?: { lastAgentId?: string | null },
): Record<string, unknown> {
  const now = new Date().toISOString();
  const at = log.date || now;
  const patch: Record<string, unknown> = {
    lastCallAt: at,
    lastCallOutcome: log.status || "",
    lastCallAgent: log.agent || "",
    lastCallNote: String(log.note || "").slice(0, 200),
    updatedAt: now,
  };
  if (options?.lastAgentId) {
    patch.lastAgentId = options.lastAgentId;
  }
  if (!isSystemCallAgent(log.agent)) {
    patch.hasAgentCall = true;
  }
  return patch;
}

/**
 * Merge top-level call log docs with optional embedded fallback entries.
 * Prefers collection docs; embedded entries are appended when no matching
 * (date+note+agent) fingerprint exists in the collection set.
 */
export function mergeCallLogsDualRead<T extends CallLog & { id?: string }>(
  collectionLogs: T[],
  embeddedLogs: CallLog[] | undefined,
  options?: { includeEmbedded?: boolean },
): T[] {
  const includeEmbedded = options?.includeEmbedded !== false;
  const fromCollection = [...collectionLogs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  if (!includeEmbedded || !embeddedLogs?.length) {
    return fromCollection;
  }

  const seen = new Set(
    fromCollection.map((l) => fingerprintCallLog(l)),
  );
  const merged: T[] = [...fromCollection];
  embeddedLogs.forEach((log, index) => {
    const fp = fingerprintCallLog(log);
    if (seen.has(fp)) return;
    seen.add(fp);
    merged.push({
      ...log,
      id: log && (log as T).id ? (log as T).id : `embedded:${index}`,
    } as T);
  });
  merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return merged;
}

export function fingerprintCallLog(log: CallLog): string {
  return `${log.date || ""}|${log.agent || ""}|${log.status || ""}|${String(log.note || "").slice(0, 120)}`;
}

/**
 * Firestore `listByLeadId` queries order by date descending with a limit so the
 * window contains the most recent N logs. Reverse to ascending chronological
 * order for UI timelines and dual-read merge compatibility.
 */
export function orderRecentCallLogsChronologically<T extends { date?: string | null }>(
  logsNewestFirst: T[],
): T[] {
  return [...logsNewestFirst].reverse();
}
