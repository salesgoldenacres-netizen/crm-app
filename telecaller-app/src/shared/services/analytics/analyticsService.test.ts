import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnalyticsService } from "./AnalyticsService";
import { AnalyticsProvider } from "./analyticsContracts";
import { AnalyticsError } from "./analyticsErrors";
import type { DashboardMetrics } from "./analyticsTypes";

import { User } from "@/shared/types";

describe("AnalyticsService Core Architecture", () => {
  let mockClientProvider: AnalyticsProvider;
  let mockSummaryProvider: AnalyticsProvider;
  let mockAggregationProvider: AnalyticsProvider;
  let service: AnalyticsService;

  let activeProjectId: string | undefined;
  let currentUser: User | null;
  let hasPermission: boolean;

  beforeEach(() => {
    activeProjectId = "project-alpha";
    currentUser = { id: "agent-1", username: "agent1", role: "telecaller", email: "agent1@test.com" };
    hasPermission = true;

    // Reset providers with spies
    mockClientProvider = {
      getDashboardMetrics: vi.fn().mockResolvedValue({ callsLoggedToday: 10, callTarget: 50, bookingsToday: 1, bookingTarget: 5, pipelineStats: {}, leaderboard: [] }),
      getActivityMetrics: vi.fn(),
      getPipelineMetrics: vi.fn(),
      getBookingMetrics: vi.fn(),
      getTeamMetrics: vi.fn(),
    };

    mockSummaryProvider = {
      getDashboardMetrics: vi.fn().mockResolvedValue({ callsLoggedToday: 20, callTarget: 50, bookingsToday: 2, bookingTarget: 5, pipelineStats: {}, leaderboard: [] }),
      getActivityMetrics: vi.fn(),
      getPipelineMetrics: vi.fn(),
      getBookingMetrics: vi.fn(),
      getTeamMetrics: vi.fn(),
    };

    mockAggregationProvider = {
      getDashboardMetrics: vi.fn().mockResolvedValue({ callsLoggedToday: 30, callTarget: 50, bookingsToday: 3, bookingTarget: 5, pipelineStats: {}, leaderboard: [] }),
      getActivityMetrics: vi.fn(),
      getPipelineMetrics: vi.fn(),
      getBookingMetrics: vi.fn(),
      getTeamMetrics: vi.fn(),
    };

    service = new AnalyticsService(
      mockClientProvider,
      mockSummaryProvider,
      mockAggregationProvider,
      () => activeProjectId,
      () => currentUser,
      () => hasPermission
    );
  });

  describe("Provider Routing & Fallback Path", () => {
    it("selects client-derived Tier 1 provider first", async () => {
      const res = await service.getDashboardMetrics();
      expect(res.callsLoggedToday).toBe(10);
      expect(mockClientProvider.getDashboardMetrics).toHaveBeenCalled();
      expect(mockSummaryProvider.getDashboardMetrics).not.toHaveBeenCalled();
    });

    it("falls back to summary document Tier 2/3 provider if client provider fails", async () => {
      vi.mocked(mockClientProvider.getDashboardMetrics).mockRejectedValueOnce(new Error("Client error"));
      
      const res = await service.getDashboardMetrics();
      expect(res.callsLoggedToday).toBe(20);
      expect(mockClientProvider.getDashboardMetrics).toHaveBeenCalled();
      expect(mockSummaryProvider.getDashboardMetrics).toHaveBeenCalled();
      expect(mockAggregationProvider.getDashboardMetrics).not.toHaveBeenCalled();
    });

    it("falls back to aggregation count Tier 4 provider if both client and summary fail", async () => {
      vi.mocked(mockClientProvider.getDashboardMetrics).mockRejectedValueOnce(new Error("Client error"));
      vi.mocked(mockSummaryProvider.getDashboardMetrics).mockRejectedValueOnce(new Error("Summary error"));

      const res = await service.getDashboardMetrics();
      expect(res.callsLoggedToday).toBe(30);
      expect(mockClientProvider.getDashboardMetrics).toHaveBeenCalled();
      expect(mockSummaryProvider.getDashboardMetrics).toHaveBeenCalled();
      expect(mockAggregationProvider.getDashboardMetrics).toHaveBeenCalled();
    });

    it("normalizes to a typed AnalyticsError if all provider tiers fail", async () => {
      vi.mocked(mockClientProvider.getDashboardMetrics).mockRejectedValueOnce(new Error("Client error"));
      vi.mocked(mockSummaryProvider.getDashboardMetrics).mockRejectedValueOnce(new Error("Summary error"));
      vi.mocked(mockAggregationProvider.getDashboardMetrics).mockRejectedValueOnce(new Error("Aggregation error"));

      await expect(service.getDashboardMetrics()).rejects.toThrow(AnalyticsError);
    });
  });

  describe("Request Deduplication", () => {
    it("collapses simultaneous concurrent duplicate requests into one promise execution", async () => {
      // Delay response slightly to verify concurrent overlapping calls
      let resolvePromise!: (value: DashboardMetrics) => void;
      const delayedPromise = new Promise<DashboardMetrics>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(mockClientProvider.getDashboardMetrics).mockReturnValueOnce(delayedPromise);

      const p1 = service.getDashboardMetrics();
      const p2 = service.getDashboardMetrics();
      const p3 = service.getDashboardMetrics();

      resolvePromise({
        callsLoggedToday: 42,
        callTarget: 50,
        bookingsToday: 0,
        bookingTarget: 5,
        pipelineStats: {
          newCount: 0,
          contactedCount: 0,
          interestedCount: 0,
          bookedCount: 0,
          totalCount: 0,
        },
        leaderboard: [],
      });

      const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
      expect(r1.callsLoggedToday).toBe(42);
      expect(r2.callsLoggedToday).toBe(42);
      expect(r3.callsLoggedToday).toBe(42);

      // Verify provider was only called once!
      expect(mockClientProvider.getDashboardMetrics).toHaveBeenCalledTimes(1);
    });
  });

  describe("Caching & TTL Expiration", () => {
    it("serves request from cache on subsequent calls before TTL expires", async () => {
      await service.getDashboardMetrics();
      await service.getDashboardMetrics();

      expect(mockClientProvider.getDashboardMetrics).toHaveBeenCalledTimes(1);
    });

    it("re-evaluates from provider if cache is explicitly invalidated", async () => {
      await service.getDashboardMetrics();
      service.invalidateCache();
      await service.getDashboardMetrics();

      expect(mockClientProvider.getDashboardMetrics).toHaveBeenCalledTimes(2);
    });
  });

  describe("Authorization & Scoping Boundaries", () => {
    it("throws PERMISSION_DENIED and bypasses provider call if unauthorized", async () => {
      hasPermission = false;
      await expect(service.getDashboardMetrics()).rejects.toThrow(AnalyticsError);
      expect(mockClientProvider.getDashboardMetrics).not.toHaveBeenCalled();
    });

    it("includes active project scope parameter in calls", async () => {
      activeProjectId = "project-beta";
      await service.getDashboardMetrics();
      expect(mockClientProvider.getDashboardMetrics).toHaveBeenCalledWith("project-beta", "agent1");
    });
  });
});
