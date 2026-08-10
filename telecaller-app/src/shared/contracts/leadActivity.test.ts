import { describe, it, expect } from "vitest";
import {
  resolveFollowUpYmd,
  ymdDiffDays,
  getOverdueDays,
  getLastActivityYmd,
  getStaleDays,
  isFollowUpMissing,
  isPaidSource,
  hadConnectedCall,
  hasRecentConnect,
  countTrailingRnrOrUnanswered,
  daysAgoYmd,
} from "./leadActivity";

describe("leadActivity", () => {
  it("resolveFollowUpYmd extracts YYYY-MM-DD prefix", () => {
    expect(resolveFollowUpYmd({ followUpDate: "2026-07-20T10:00:00Z" })).toBe(
      "2026-07-20",
    );
    expect(resolveFollowUpYmd({ followUpOn: "2026-08-01 extra" })).toBe(
      "2026-08-01",
    );
    expect(resolveFollowUpYmd({})).toBe("");
  });

  it("ymdDiffDays computes calendar day delta", () => {
    expect(ymdDiffDays("2026-07-10", "2026-07-01")).toBe(9);
    expect(ymdDiffDays("", "2026-07-01")).toBe(0);
  });

  it("getOverdueDays returns 0 when follow-up is today or future", () => {
    expect(
      getOverdueDays({ followUpDate: "2026-07-28" }, "2026-07-28"),
    ).toBe(0);
    expect(
      getOverdueDays({ followUpDate: "2026-07-30" }, "2026-07-28"),
    ).toBe(0);
  });

  it("getOverdueDays counts days past follow-up", () => {
    expect(
      getOverdueDays({ followUpDate: "2026-07-20" }, "2026-07-28"),
    ).toBe(8);
  });

  it("getLastActivityYmd picks max of updated, created, and call logs", () => {
    expect(
      getLastActivityYmd({
        updatedAt: "2026-07-01",
        createdAt: "2026-06-01",
        callLogs: [{ date: "2026-07-15" }],
      }),
    ).toBe("2026-07-15");
  });

  it("getStaleDays measures inactivity from last activity", () => {
    expect(
      getStaleDays(
        { updatedAt: "2026-07-01", callLogs: [] },
        "2026-07-11",
      ),
    ).toBe(10);
  });

  it("isFollowUpMissing detects absent follow-up", () => {
    expect(isFollowUpMissing({})).toBe(true);
    expect(isFollowUpMissing({ followUpDate: "2026-07-28" })).toBe(false);
  });

  it("isPaidSource detects paid channel keywords", () => {
    expect(isPaidSource({ source: "Google Ads campaign" })).toBe(true);
    expect(isPaidSource({ leadSource: "Walk-in" })).toBe(false);
  });

  it("hadConnectedCall detects connected dispositions", () => {
    expect(
      hadConnectedCall({
        callLogs: [{ disposition: "Connected" }],
      }),
    ).toBe(true);
    expect(
      hadConnectedCall({
        callLogs: [{ status: "no answer" }],
      }),
    ).toBe(false);
  });

  it("hasRecentConnect respects withinHours window", () => {
    const now = Date.parse("2026-07-28T12:00:00.000Z");
    expect(
      hasRecentConnect(
        {
          callLogs: [
            {
              disposition: "Connected",
              timestamp: "2026-07-28T11:00:00.000Z",
            },
          ],
        },
        now,
        2,
      ),
    ).toBe(true);
    expect(
      hasRecentConnect(
        {
          callLogs: [
            {
              disposition: "Connected",
              timestamp: "2026-07-27T08:00:00.000Z",
            },
          ],
        },
        now,
        2,
      ),
    ).toBe(false);
  });

  it("countTrailingRnrOrUnanswered counts consecutive RNR from newest", () => {
    expect(
      countTrailingRnrOrUnanswered({
        callLogs: [
          { disposition: "Interested" },
          { disposition: "RNR" },
          { disposition: "no answer" },
        ],
      }),
    ).toBe(2);
  });

  it("daysAgoYmd subtracts calendar days from anchor", () => {
    expect(daysAgoYmd(3, "2026-07-28")).toBe("2026-07-25");
  });
});
