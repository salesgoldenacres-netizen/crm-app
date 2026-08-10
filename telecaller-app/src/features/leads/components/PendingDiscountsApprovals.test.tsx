import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PendingDiscountsApprovals from "./PendingDiscountsApprovals";
import { Lead, Project, User } from "@/shared/types";

describe("PendingDiscountsApprovals Concurrency Protection", () => {
  const mockUser: User = {
    id: "mgr-1",
    username: "manager_alice",
    email: "alice@example.com",
    role: "manager",
  };

  const mockProject: Record<string, Project> = {
    p1: { id: "p1", name: "Golden Palms", location: "Sector 5", totalPlots: 10, plots: [], image: "" },
  };

  const pendingLead: Lead = {
    id: "lead-99",
    name: "John Doe",
    phone: "9876543210",
    projectId: "p1",
    plotId: "P-101",
    status: "interested",
    createdAt: new Date().toISOString(),
    discountRequest: {
      requestedAmt: "50000",
      justification: "Festive Season Discount",
      status: "pending",
    },
  };

  it("renders pending discount approvals table when pending items exist", () => {
    render(
      <PendingDiscountsApprovals
        leads={[pendingLead]}
        projects={mockProject}
        updateLead={vi.fn().mockResolvedValue(undefined)}
        logAuditEvent={vi.fn().mockResolvedValue(undefined)}
        user={mockUser}
      />
    );

    expect(screen.getByText(/Pending Discount Approvals \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    expect(screen.getByText(/50000/i)).toBeInTheDocument();
  });

  it("blocks duplicate resolution if status changes from pending before confirmation", async () => {
    const updateLeadMock = vi.fn().mockResolvedValue(undefined);
    const logAuditEventMock = vi.fn().mockResolvedValue(undefined);

    const resolvedLead: Lead = {
      ...pendingLead,
      discountRequest: {
        ...pendingLead.discountRequest!,
        status: "approved",
      },
    };

    render(
      <PendingDiscountsApprovals
        leads={[resolvedLead]}
        projects={mockProject}
        updateLead={updateLeadMock}
        logAuditEvent={logAuditEventMock}
        user={mockUser}
      />
    );

    expect(screen.queryByText(/Pending Discount Approvals/i)).not.toBeInTheDocument();
    expect(updateLeadMock).not.toHaveBeenCalled();
    expect(logAuditEventMock).not.toHaveBeenCalled();
  });
});
