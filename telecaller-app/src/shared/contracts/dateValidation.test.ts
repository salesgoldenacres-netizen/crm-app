import { describe, expect, it } from "vitest";
import { validateYmdDate } from "./dateValidation";

describe("dateValidation", () => {
  it("passes for a valid current or future date", () => {
    const result = validateYmdDate("2026-07-20", { todayYmd: "2026-07-14" });
    expect(result.valid).toBe(true);
  });

  it("passes for today's date", () => {
    const result = validateYmdDate("2026-07-14", { todayYmd: "2026-07-14" });
    expect(result.valid).toBe(true);
  });

  it("rejects invalid format", () => {
    const result = validateYmdDate("14-07-2026", { todayYmd: "2026-07-14" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe("INVALID_FORMAT");
      expect(result.reason).toContain("must match YYYY-MM-DD");
    }
  });

  it("rejects non-numeric characters", () => {
    const result = validateYmdDate("2026-07-ab", { todayYmd: "2026-07-14" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe("INVALID_FORMAT");
    }
  });

  it("rejects invalid month", () => {
    const result = validateYmdDate("2026-13-14", { todayYmd: "2026-07-14" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe("INVALID_CALENDAR_DATE");
      expect(result.reason).toContain("Month");
    }
  });

  it("rejects invalid day bounds (e.g. 32)", () => {
    const result = validateYmdDate("2026-07-32", { todayYmd: "2026-07-14" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe("INVALID_CALENDAR_DATE");
    }
  });

  it("rejects invalid calendar dates (e.g., Feb 30)", () => {
    const result = validateYmdDate("2026-02-30", { todayYmd: "2026-07-14" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe("INVALID_CALENDAR_DATE");
      expect(result.reason).toContain("is not a valid calendar date");
    }
  });

  it("rejects leap year invalid day (e.g., Feb 29 on non-leap year)", () => {
    const result = validateYmdDate("2027-02-29", { todayYmd: "2026-07-14" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe("INVALID_CALENDAR_DATE");
    }
  });

  it("allows leap year valid day (e.g., Feb 29 on leap year 2028)", () => {
    const result = validateYmdDate("2028-02-29", { todayYmd: "2026-07-14" });
    expect(result.valid).toBe(true);
  });

  it("rejects dates in the past by default", () => {
    const result = validateYmdDate("2026-07-13", { todayYmd: "2026-07-14" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.code).toBe("DATE_IN_PAST");
      expect(result.reason).toContain("cannot be in the past");
    }
  });

  it("allows dates in the past when allowPast is true", () => {
    const result = validateYmdDate("2026-07-13", {
      todayYmd: "2026-07-14",
      allowPast: true,
    });
    expect(result.valid).toBe(true);
  });
});
