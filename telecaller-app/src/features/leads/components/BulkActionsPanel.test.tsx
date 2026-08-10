import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BulkActionsPanel from "./BulkActionsPanel";
import { Lead, User } from "@/shared/types";

describe("BulkActionsPanel Batch Operation Progress & UI Feedback", () => {
  const mockUser: User = {
    id: "mgr-1",
    username: "admin_user",
    email: "admin@example.com",
    role: "admin",
  };

  const mockUsers: User[] = [
    mockUser,
    { id: "agent-1", username: "agent_bob", email: "bob@example.com", role: "telecaller" },
  ];

  const mockLeads: Lead[] = [
    { id: "l1", name: "Lead 1", phone: "9876543210", status: "new", createdAt: new Date().toISOString() },
    { id: "l2", name: "Lead 2", phone: "9876543211", status: "new", createdAt: new Date().toISOString() },
  ];

  it("renders selected lead count and controls when leads are selected", () => {
    render(
      <BulkActionsPanel
        selectedLeadIds={["l1", "l2"]}
        setSelectedLeadIds={vi.fn()}
        pageLeads={mockLeads}
        bulkAssignee=""
        setBulkAssignee={vi.fn()}
        bulkStatus=""
        setBulkStatus={vi.fn()}
        users={mockUsers}
        isManagerial={(r) => r === "admin" || r === "manager"}
        bulkUpdateLeads={vi.fn().mockResolvedValue(undefined)}
        archiveLeads={vi.fn().mockResolvedValue(undefined)}
        user={mockUser}
        toast={vi.fn()}
      />
    );

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText(/leads selected/i)).toBeInTheDocument();
  });

  it("triggers bulk status update with progress state and toast notification", async () => {
    const bulkUpdateLeadsMock = vi.fn().mockResolvedValue(undefined);
    const toastMock = vi.fn();
    const setSelectedLeadIdsMock = vi.fn();

    render(
      <BulkActionsPanel
        selectedLeadIds={["l1", "l2"]}
        setSelectedLeadIds={setSelectedLeadIdsMock}
        pageLeads={mockLeads}
        bulkAssignee=""
        setBulkAssignee={vi.fn()}
        bulkStatus=""
        setBulkStatus={vi.fn()}
        users={mockUsers}
        isManagerial={(r) => r === "admin" || r === "manager"}
        bulkUpdateLeads={bulkUpdateLeadsMock}
        archiveLeads={vi.fn().mockResolvedValue(undefined)}
        user={mockUser}
        toast={toastMock}
      />
    );

    const statusSelect = screen.getByLabelText("Update status for selected leads");
    fireEvent.change(statusSelect, { target: { value: "contacted" } });

    await waitFor(() => {
      expect(bulkUpdateLeadsMock).toHaveBeenCalledWith(["l1", "l2"], { status: "contacted" });
      expect(toastMock).toHaveBeenCalledWith("Updated status for 2 leads.", "success");
      expect(setSelectedLeadIdsMock).toHaveBeenCalledWith([]);
    });
  });
});
