import { describe, it, expect } from "vitest";
import {
  sanitizeCallLogIdPart,
  buildEmbeddedCallLogId,
  simpleHash,
  isEmbeddedCallLogFallbackEnabled,
  CALL_LOGS_EMBEDDED_FALLBACK_ENV,
} from "./callLogIds";
import {
  mergeCallLogsDualRead,
  fingerprintCallLog,
  buildLeadCallSummaryPatch,
  isSystemCallAgent,
  orderRecentCallLogsChronologically,
} from "./callLogSummaries";

describe("callLogIds", () => {
  it("sanitizeCallLogIdPart strips unsafe chars", () => {
    expect(sanitizeCallLogIdPart("lead/abc!")).toBe("lead_abc_");
  });

  it("buildEmbeddedCallLogId is stable for same payload", () => {
    const log = {
      date: "2026-07-18T10:00:00.000Z",
      note: "Hello",
      agent: "Alice",
      status: "interested",
    };
    const a = buildEmbeddedCallLogId("lead1", 0, log);
    const b = buildEmbeddedCallLogId("lead1", 0, log);
    expect(a).toBe(b);
    expect(a.startsWith("emb_lead1_0_")).toBe(true);
  });

  it("buildEmbeddedCallLogId changes when note changes", () => {
    const base = {
      date: "2026-07-18T10:00:00.000Z",
      agent: "Alice",
      status: "new",
    };
    const a = buildEmbeddedCallLogId("lead1", 0, { ...base, note: "A" });
    const b = buildEmbeddedCallLogId("lead1", 0, { ...base, note: "B" });
    expect(a).not.toBe(b);
  });

  it("simpleHash is deterministic", () => {
    expect(simpleHash("x")).toBe(simpleHash("x"));
  });

  it("isEmbeddedCallLogFallbackEnabled defaults true when env unset", () => {
    expect(isEmbeddedCallLogFallbackEnabled()).toBe(true);
  });

  it("documents env key for production flag flip", () => {
    expect(CALL_LOGS_EMBEDDED_FALLBACK_ENV).toBe("VITE_CALL_LOGS_EMBEDDED_FALLBACK");
  });
});

describe("callLogSummaries", () => {
  it("isSystemCallAgent recognizes system agents", () => {
    expect(isSystemCallAgent("system")).toBe(true);
    expect(isSystemCallAgent("Alice")).toBe(false);
  });

  it("buildLeadCallSummaryPatch sets hasAgentCall for agent calls", () => {
    const patch = buildLeadCallSummaryPatch({
      date: "2026-07-18T10:00:00.000Z",
      note: "Talked",
      status: "interested",
      agent: "Alice",
    });
    expect(patch.hasAgentCall).toBe(true);
    expect(patch.lastCallAgent).toBe("Alice");
    expect(patch.lastCallOutcome).toBe("interested");
  });

  it("buildLeadCallSummaryPatch does not set hasAgentCall for system", () => {
    const patch = buildLeadCallSummaryPatch({
      date: "2026-07-18T10:00:00.000Z",
      note: "Created",
      status: "raw",
      agent: "system",
    });
    expect(patch.hasAgentCall).toBeUndefined();
  });

  it("mergeCallLogsDualRead prefers collection and fills gaps from embedded", () => {
    const collection = [
      {
        id: "c1",
        leadId: "L1",
        date: "2026-07-18T11:00:00.000Z",
        note: "New",
        status: "new",
        agent: "Alice",
      },
    ];
    const embedded = [
      {
        date: "2026-07-18T10:00:00.000Z",
        note: "Old",
        status: "raw",
        agent: "system",
      },
      {
        date: "2026-07-18T11:00:00.000Z",
        note: "New",
        status: "new",
        agent: "Alice",
      },
    ];
    const merged = mergeCallLogsDualRead(collection, embedded, {
      includeEmbedded: true,
    });
    expect(merged).toHaveLength(2);
    expect(merged[0].note).toBe("Old");
    expect(merged[1].id).toBe("c1");
  });

  it("mergeCallLogsDualRead can disable embedded fallback", () => {
    const merged = mergeCallLogsDualRead(
      [
        {
          id: "c1",
          leadId: "L1",
          date: "2026-07-18T11:00:00.000Z",
          note: "New",
          status: "new",
          agent: "Alice",
        },
      ],
      [{ date: "2026-07-18T10:00:00.000Z", note: "Old", status: "raw", agent: "system" }],
      { includeEmbedded: false },
    );
    expect(merged).toHaveLength(1);
  });

  it("fingerprintCallLog is stable", () => {
    const log = {
      date: "d",
      note: "n",
      status: "s",
      agent: "a",
    };
    expect(fingerprintCallLog(log)).toBe(fingerprintCallLog(log));
  });

  it("orderRecentCallLogsChronologically returns most recent window in asc order", () => {
    const allLogs = Array.from({ length: 250 }, (_, index) => ({
      id: `log-${index}`,
      leadId: "L1",
      date: new Date(Date.UTC(2020, 0, 1 + index)).toISOString(),
      note: `Call ${index}`,
      status: "new",
      agent: "Alice",
    }));
    const pageSize = 200;
    const newestFirst = [...allLogs].reverse().slice(0, pageSize);
    const chronological = orderRecentCallLogsChronologically(newestFirst);

    expect(chronological).toHaveLength(pageSize);
    expect(chronological[0].id).toBe("log-50");
    expect(chronological[pageSize - 1].id).toBe("log-249");
    expect(
      chronological.every(
        (log, index) =>
          index === 0 ||
          new Date(log.date).getTime() >= new Date(chronological[index - 1].date).getTime(),
      ),
    ).toBe(true);
  });

  it("mergeCallLogsDualRead still merges embedded logs with recent collection window", () => {
    const collectionWindow = orderRecentCallLogsChronologically(
      Array.from({ length: 200 }, (_, index) => ({
        id: `c-${index + 50}`,
        leadId: "L1",
        date: new Date(Date.UTC(2020, 0, 50 + index)).toISOString(),
        note: `Recent ${index + 50}`,
        status: "new",
        agent: "Alice",
      })).reverse(),
    );
    const embedded = [
      {
        date: new Date(Date.UTC(2020, 0, 1)).toISOString(),
        note: "Legacy embedded",
        status: "raw",
        agent: "system",
      },
    ];
    const merged = mergeCallLogsDualRead(collectionWindow, embedded, {
      includeEmbedded: true,
    });

    expect(merged).toHaveLength(201);
    expect(merged[0].note).toBe("Legacy embedded");
    expect(merged[merged.length - 1].note).toBe("Recent 249");
  });
});
