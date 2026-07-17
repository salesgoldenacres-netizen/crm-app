import { describe, it, expect } from "vitest";
import {
  getIstDateString,
  addIstDays,
  buildAutomationIdempotencyKey,
  buildAutomationNotificationId,
  AUTOMATION_JOB_TYPES,
  AUTOMATION_THRESHOLDS,
} from "./automation";
import {
  normalizeSiteVisitStatus,
  isRemindableSiteVisit,
  getSiteVisitDate,
} from "./siteVisit";

describe("automation IST helpers", () => {
  it("formats a known UTC instant to IST calendar date", () => {
    // 2026-07-13 20:30 UTC → 2026-07-14 02:00 IST
    expect(getIstDateString("2026-07-13T20:30:00.000Z")).toBe("2026-07-14");
  });

  it("adds days on YYYY-MM-DD without UTC drift", () => {
    expect(addIstDays("2026-07-14", 1)).toBe("2026-07-15");
    expect(addIstDays("2026-07-14", -1)).toBe("2026-07-13");
    expect(addIstDays("2026-01-31", 1)).toBe("2026-02-01");
  });
});

describe("automation idempotency", () => {
  it("builds leadId+type+date keys", () => {
    const key = buildAutomationIdempotencyKey({
      jobType: AUTOMATION_JOB_TYPES.FOLLOW_UP,
      leadId: "abc123",
      dateYmd: "2026-07-14",
    });
    expect(key).toBe("follow_up:abc123:2026-07-14");
    expect(buildAutomationNotificationId(key)).toBe(
      "auto_follow_up_abc123_2026-07-14",
    );
  });

  it("exposes shared SLA threshold", () => {
    expect(AUTOMATION_THRESHOLDS.SLA_FIRST_TOUCH_HOURS).toBe(24);
  });

  it("exposes distinct site-visit reminder job types for D-1 / D-0 / no-show", () => {
    expect(AUTOMATION_JOB_TYPES.SITE_VISIT_REMINDER).toBe("site_visit_reminder");
    expect(AUTOMATION_JOB_TYPES.SITE_VISIT_REMINDER_DAY_BEFORE).toBe(
      "site_visit_reminder_day_before",
    );
    expect(AUTOMATION_JOB_TYPES.SITE_VISIT_REMINDER_SAME_DAY).toBe(
      "site_visit_reminder_same_day",
    );
    expect(AUTOMATION_JOB_TYPES.SITE_VISIT_NO_SHOW).toBe("site_visit_no_show");
  });
});

describe("siteVisit contract", () => {
  it("normalizes aliases", () => {
    expect(normalizeSiteVisitStatus("Canceled")).toBe("cancelled");
    expect(normalizeSiteVisitStatus("no-show")).toBe("no_show");
  });

  it("detects remindable visits", () => {
    expect(
      isRemindableSiteVisit({
        status: "site-visit-confirmed",
        siteVisit: { date: "2026-07-20", status: "confirmed" },
      }),
    ).toBe(true);
    expect(
      isRemindableSiteVisit({
        status: "site-visit-completed",
        siteVisit: { date: "2026-07-20" },
      }),
    ).toBe(false);
    expect(
      getSiteVisitDate({ siteVisit: { date: "2026-07-20" } }),
    ).toBe("2026-07-20");
  });
});
