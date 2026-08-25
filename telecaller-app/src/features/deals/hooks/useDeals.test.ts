import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDeals } from "./useDeals";

// Mock Toast hook
vi.mock("@/shared/components/Toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock dealsService functions
vi.mock("../services/dealsService", () => ({
  subscribeToDeals: vi.fn((_options, onNext) => {
    onNext([
      {
        id: "deal-1",
        title: "Plot 101 Booking",
        leadId: "lead-1",
        leadName: "John Doe",
        phone: "9876543210",
        projectId: "proj-1",
        stage: "site_visit_completed",
        amount: 2500000,
        assignedTo: "user-1",
        createdAt: "2026-08-01T10:00:00Z",
        updatedAt: "2026-08-01T10:00:00Z",
      },
      {
        id: "deal-2",
        title: "Plot 202 Booking",
        leadId: "lead-2",
        leadName: "Jane Smith",
        phone: "9876543211",
        projectId: "proj-1",
        stage: "closed_won",
        amount: 5000000,
        assignedTo: "user-1",
        createdAt: "2026-08-02T10:00:00Z",
        updatedAt: "2026-08-02T10:00:00Z",
      },
    ]);
    return () => {};
  }),
  createDealInDb: vi.fn().mockResolvedValue("deal-new"),
  updateDealStageInDb: vi.fn().mockResolvedValue(undefined),
  updateDealInDb: vi.fn().mockResolvedValue(undefined),
  deleteDealFromDb: vi.fn().mockResolvedValue(undefined),
}));

describe("useDeals hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch deals and compute KPI metrics correctly", () => {
    const { result } = renderHook(() => useDeals());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.deals).toHaveLength(2);

    const { metrics } = result.current;
    expect(metrics.totalDeals).toBe(2);
    expect(metrics.totalPipelineValue).toBe(7500000); // 2.5L + 50L = 75L
    expect(metrics.closedWonValue).toBe(5000000);
    expect(metrics.closedWonCount).toBe(1);
    expect(metrics.winRate).toBe(100); // 1 won, 0 lost -> 100%
  });

  it("should call createDeal and toast on success", async () => {
    const { result } = renderHook(() => useDeals());

    let dealId: string | undefined;
    await act(async () => {
      dealId = await result.current.createDeal({
        title: "New Plot Deal",
        leadId: "lead-3",
        leadName: "Alice Red",
        phone: "9998887770",
        projectId: "proj-1",
        stage: "new_inquiry",
        amount: 3000000,
        assignedTo: "user-1",
      });
    });

    expect(dealId).toBe("deal-new");
  });

  it("should update deal stage successfully", async () => {
    const { result } = renderHook(() => useDeals());

    await act(async () => {
      await result.current.updateDealStage("deal-1", "token_paid");
    });

    expect(result.current.error).toBeNull();
  });

  it("should delete deal successfully", async () => {
    const { result } = renderHook(() => useDeals());

    await act(async () => {
      await result.current.deleteDeal("deal-1");
    });

    expect(result.current.error).toBeNull();
  });
});
