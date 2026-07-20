/**
 * Proves client logCall does not double-count productivity.
 * Sole writer: Cloud Function + productivityEvents.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const getById = vi.fn();
const logCallRepo = vi.fn();

vi.mock("@/shared/services/firebase/repositories", () => ({
  LeadRepository: {
    getById: (...args: unknown[]) => getById(...args),
    logCall: (...args: unknown[]) => logCallRepo(...args),
    findByPhone: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    bulkUpdate: vi.fn(),
    mergeLeads: vi.fn(),
    archiveLeadsByIds: vi.fn(),
    bulkAddLeads: vi.fn(),
  },
  LeadsRepository: {
    getById: (...args: unknown[]) => getById(...args),
    logCall: (...args: unknown[]) => logCallRepo(...args),
  },
}));

vi.mock("@/shared/services/firebase/CallLogsRepository", () => ({
  CallLogsRepository: {
    create: vi.fn(),
    reassignLeadId: vi.fn(),
    rateByLeadIndex: vi.fn(),
  },
}));

vi.mock("@/shared/utils/analytics", () => ({
  logAnalyticsEvent: vi.fn(),
}));

vi.mock("@/shared/contracts", () => ({
  publishCallCompleted: vi.fn(),
  publishFollowUpDiff: vi.fn(),
  publishLeadAssigned: vi.fn(),
  publishLeadCreated: vi.fn(),
  publishLeadMerged: vi.fn(),
  publishLeadReassigned: vi.fn(),
  publishLeadStatusChanged: vi.fn(),
  publishNoteAdded: vi.fn(),
}));

const updateAgentProductivity = vi.fn();
vi.mock("@/features/admin/hooks/adminStores", () => ({
  updateAgentProductivity: (...args: unknown[]) => updateAgentProductivity(...args),
}));

import { useLeadsStore } from "./useLeadsStore";

describe("useLeadsStore.logCall productivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getById.mockResolvedValue({
      id: "lead-1",
      status: "new",
      assignedTo: "agent-1",
      followUpDate: "",
    });
    logCallRepo.mockResolvedValue("call-log-1");
  });

  it("does not call updateAgentProductivity (CF is sole writer)", async () => {
    const { logCall } = useLeadsStore();
    await logCall("lead-1", {
      note: "Call log disposition: interested",
      status: "interested",
      duration: 45,
      timelineActivity: "call",
    });

    expect(logCallRepo).toHaveBeenCalled();
    expect(updateAgentProductivity).not.toHaveBeenCalled();
  });
});
