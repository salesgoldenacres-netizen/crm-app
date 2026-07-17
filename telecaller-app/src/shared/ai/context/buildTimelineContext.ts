/**
 * Bounded timeline digest for AI prompts.
 * Accepts already-loaded events (e.g. from `useTimelineEvents`) — no queries.
 */

import { scrubPiiFromText } from "./redact";
import type {
  BuildTimelineContextOptions,
  TimelineContextEvent,
  TimelineContextPack,
} from "./types";

const DEFAULT_MAX_EVENTS = 8;
const DEFAULT_SUMMARY_MAX = 200;

function eventTimestamp(ev: TimelineContextEvent): string {
  return String(ev.timestamp || ev.createdAt || "").trim();
}

/** Newer first when timestamps parse; stable otherwise. */
function sortRecentFirst(events: TimelineContextEvent[]): TimelineContextEvent[] {
  return [...events].sort((a, b) => {
    const ta = Date.parse(eventTimestamp(a));
    const tb = Date.parse(eventTimestamp(b));
    if (Number.isFinite(ta) && Number.isFinite(tb)) return tb - ta;
    if (Number.isFinite(tb)) return 1;
    if (Number.isFinite(ta)) return -1;
    return 0;
  });
}

export function buildTimelineContext(
  events: TimelineContextEvent[] | null | undefined,
  options: BuildTimelineContextOptions = {},
): TimelineContextPack {
  const maxEvents = options.maxEvents ?? DEFAULT_MAX_EVENTS;
  const summaryMax = options.summaryMaxChars ?? DEFAULT_SUMMARY_MAX;
  const list = Array.isArray(events) ? events : [];
  const recent = sortRecentFirst(list)
    .slice(0, Math.max(0, maxEvents))
    .map((ev) => {
      const type = String(ev.type || "unknown").trim() || "unknown";
      const summary = scrubPiiFromText(String(ev.summary || ""), summaryMax);
      const timestamp = eventTimestamp(ev);
      return { type, summary, timestamp };
    })
    .filter((ev) => ev.summary || ev.type !== "unknown");

  const lines = recent.map((ev) => {
    const when = ev.timestamp ? ` (${ev.timestamp.slice(0, 10)})` : "";
    return `- [${ev.type}]${when} ${ev.summary}`.trim();
  });

  return {
    eventCount: list.length,
    includedCount: recent.length,
    recent,
    timelineSummary: lines.join("\n"),
  };
}
