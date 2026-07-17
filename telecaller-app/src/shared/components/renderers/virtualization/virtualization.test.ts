import { describe, it, expect } from "vitest";
import { DefaultVirtualizationEngine } from "./DefaultVirtualizationEngine";
import { FixedRowHeightStrategy } from "./strategies/FixedRowHeightStrategy";

describe("Wave 8 Phase 2D-A Virtualization Infrastructure", () => {
  describe("DefaultVirtualizationEngine (Stateless Math)", () => {
    const strategy = new FixedRowHeightStrategy(50);
    const engine = new DefaultVirtualizationEngine();

    it("handles zero items correctly", () => {
      const range = engine.calculateRange(0, 400, 0, 10, strategy);
      expect(range.startIndex).toBe(0);
      expect(range.endIndex).toBe(0);
      expect(range.startPad).toBe(0);
      expect(range.totalHeight).toBe(0);
    });

    it("handles zero container height correctly", () => {
      const range = engine.calculateRange(0, 0, 100, 10, strategy);
      expect(range.startIndex).toBe(0);
      expect(range.endIndex).toBe(0);
      expect(range.startPad).toBe(0);
      expect(range.totalHeight).toBe(0);
    });

    it("calculates range accurately under standard offsets", () => {
      // clientHeight = 200, rowHeight = 50 => 4 visible rows
      // scrollTop = 100 => visible range starts at index 2 (100 / 50) and ends at index 5 ((100+200)/50)
      // overscan = 2 => startIndex = 0 (2 - 2), endIndex = 7 (5 + 2)
      const range = engine.calculateRange(100, 200, 20, 2, strategy);
      expect(range.startIndex).toBe(0);
      expect(range.endIndex).toBe(7);
      expect(range.startPad).toBe(0);
      expect(range.totalHeight).toBe(1000); // 20 * 50
    });

    it("clamps negative scrollTop to zero", () => {
      const range = engine.calculateRange(-50, 200, 20, 2, strategy);
      expect(range.startIndex).toBe(0);
      expect(range.startPad).toBe(0);
    });

    it("clamps indexes beyond maximum dataset rows", () => {
      const range = engine.calculateRange(2000, 200, 10, 2, strategy);
      expect(range.endIndex).toBe(9);
    });

    it("handles single-row dataset", () => {
      const range = engine.calculateRange(0, 100, 1, 2, strategy);
      expect(range.startIndex).toBe(0);
      expect(range.endIndex).toBe(0);
      expect(range.totalHeight).toBe(50);
    });
  });

  describe("FixedRowHeightStrategy Validation", () => {
    it("rejects non-positive row heights", () => {
      expect(() => new FixedRowHeightStrategy(0)).toThrow();
      expect(() => new FixedRowHeightStrategy(-10)).toThrow();
    });
  });
});
