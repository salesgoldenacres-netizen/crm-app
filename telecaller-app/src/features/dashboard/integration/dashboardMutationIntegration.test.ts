import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
const mockRefreshDashboard = vi.fn();
const mockBaseLogCall = vi.fn();
const mockBaseUpdateLead = vi.fn();
const mockBaseAddLead = vi.fn();

describe("Dashboard Mutation Integration — Analytics Invalidation Boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Emulate Dashboard composition wrappers as constructed in Dashboard.tsx
  const createDashboardMutations = (
    refreshDashboard: () => void,
    baseLogCall: typeof mockBaseLogCall,
    baseUpdateLead: typeof mockBaseUpdateLead,
    baseAddLead: typeof mockBaseAddLead
  ) => {
    const logCall = async (leadId: string, payload: any) => {
      await baseLogCall(leadId, payload);
      refreshDashboard();
    };

    const updateLead = async (
      id: string,
      updatedFields: Partial<any>,
      options?: { suppressTimeline?: boolean }
    ) => {
      await baseUpdateLead(id, updatedFields, options);
      if (updatedFields.status !== undefined) {
        refreshDashboard();
      }
    };

    const addLead = async (leadData: any) => {
      const result = await baseAddLead(leadData);
      refreshDashboard();
      return result;
    };

    return { logCall, updateLead, addLead };
  };

  it("1. Triggers refreshDashboard on successful logCall", async () => {
    mockBaseLogCall.mockResolvedValueOnce(undefined);
    const { logCall } = createDashboardMutations(
      mockRefreshDashboard,
      mockBaseLogCall,
      mockBaseUpdateLead,
      mockBaseAddLead
    );

    await logCall("lead-1", { note: "Discussed pricing", status: "interested" });

    expect(mockBaseLogCall).toHaveBeenCalledWith("lead-1", { note: "Discussed pricing", status: "interested" });
    expect(mockRefreshDashboard).toHaveBeenCalledTimes(1);
  });

  it("2. Triggers refreshDashboard on successful updateLead with status change", async () => {
    mockBaseUpdateLead.mockResolvedValueOnce(undefined);
    const { updateLead } = createDashboardMutations(
      mockRefreshDashboard,
      mockBaseLogCall,
      mockBaseUpdateLead,
      mockBaseAddLead
    );

    await updateLead("lead-1", { status: "booked" });

    expect(mockBaseUpdateLead).toHaveBeenCalledWith("lead-1", { status: "booked" }, undefined);
    expect(mockRefreshDashboard).toHaveBeenCalledTimes(1);
  });

  it("3. Does NOT trigger refreshDashboard on updateLead without status change", async () => {
    mockBaseUpdateLead.mockResolvedValueOnce(undefined);
    const { updateLead } = createDashboardMutations(
      mockRefreshDashboard,
      mockBaseLogCall,
      mockBaseUpdateLead,
      mockBaseAddLead
    );

    await updateLead("lead-1", { notes: "Updated phone number" });

    expect(mockBaseUpdateLead).toHaveBeenCalledWith("lead-1", { notes: "Updated phone number" }, undefined);
    expect(mockRefreshDashboard).not.toHaveBeenCalled();
  });

  it("4. Does NOT trigger refreshDashboard if logCall fails", async () => {
    mockBaseLogCall.mockRejectedValueOnce(new Error("Firestore write failed"));
    const { logCall } = createDashboardMutations(
      mockRefreshDashboard,
      mockBaseLogCall,
      mockBaseUpdateLead,
      mockBaseAddLead
    );

    await expect(
      logCall("lead-1", { note: "Attempted call", status: "rnr" })
    ).rejects.toThrow("Firestore write failed");

    expect(mockRefreshDashboard).not.toHaveBeenCalled();
  });

  it("5. Does NOT trigger refreshDashboard if updateLead fails", async () => {
    mockBaseUpdateLead.mockRejectedValueOnce(new Error("Permission denied"));
    const { updateLead } = createDashboardMutations(
      mockRefreshDashboard,
      mockBaseLogCall,
      mockBaseUpdateLead,
      mockBaseAddLead
    );

    await expect(
      updateLead("lead-1", { status: "booked" })
    ).rejects.toThrow("Permission denied");

    expect(mockRefreshDashboard).not.toHaveBeenCalled();
  });

  it("6. Triggers refreshDashboard on successful addLead", async () => {
    mockBaseAddLead.mockResolvedValueOnce({ id: "new-lead-1", name: "John Doe" });
    const { addLead } = createDashboardMutations(
      mockRefreshDashboard,
      mockBaseLogCall,
      mockBaseUpdateLead,
      mockBaseAddLead
    );

    const result = await addLead({ name: "John Doe", phone: "9876543210" });

    expect(result).toEqual({ id: "new-lead-1", name: "John Doe" });
    expect(mockRefreshDashboard).toHaveBeenCalledTimes(1);
  });
});
