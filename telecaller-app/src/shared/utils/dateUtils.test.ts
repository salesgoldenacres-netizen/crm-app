import { describe, it, expect } from "vitest";
import { parseSafeDate, safeFormatDateTime, formatDuration } from "./dateUtils";

describe("dateUtils", () => {
  describe("parseSafeDate", () => {
    it("should return null for falsy inputs", () => {
      expect(parseSafeDate(null)).toBeNull();
      expect(parseSafeDate(undefined)).toBeNull();
      expect(parseSafeDate("")).toBeNull();
    });

    it("should parse valid Date instances", () => {
      const d = new Date();
      expect(parseSafeDate(d)).toBe(d);
    });

    it("should parse ISO date strings", () => {
      const parsed = parseSafeDate("2026-07-10T12:00:00Z");
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed?.toISOString()).toBe("2026-07-10T12:00:00.000Z");
    });

    it("should parse timestamps as numbers", () => {
      const ts = 1783684800000; // Some future date
      const parsed = parseSafeDate(ts);
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed?.getTime()).toBe(ts);
    });

    it("should parse timestamps as strings representing numbers", () => {
      const tsStr = "1783684800000";
      const parsed = parseSafeDate(tsStr);
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed?.getTime()).toBe(1783684800000);
    });

    it("should return null for invalid date strings", () => {
      expect(parseSafeDate("not-a-date")).toBeNull();
    });
  });

  describe("safeFormatDateTime", () => {
    it("should return dash for invalid inputs", () => {
      expect(safeFormatDateTime(null)).toBe("—");
      expect(safeFormatDateTime("invalid")).toBe("—");
    });

    it("should format valid date strings", () => {
      const formatted = safeFormatDateTime("2026-07-10T12:00:00Z", false);
      expect(formatted).toContain("2026");
    });
  });

  describe("formatDuration", () => {
    it("should return 00:00 for null/undefined/NaN", () => {
      expect(formatDuration(null)).toBe("00:00");
      expect(formatDuration(undefined)).toBe("00:00");
      expect(formatDuration(NaN)).toBe("00:00");
    });

    it("should format seconds correctly", () => {
      expect(formatDuration(45)).toBe("00:45");
      expect(formatDuration(60)).toBe("01:00");
      expect(formatDuration(75)).toBe("01:15");
    });

    it("should format hours correctly when present", () => {
      expect(formatDuration(3600)).toBe("01:00:00");
      expect(formatDuration(3675)).toBe("01:01:15");
    });
  });
});
