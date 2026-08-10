import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  setDocMock,
  updateDocMock,
  deleteDocMock,
  getDocMock,
  getDocsMock,
  writeBatchMock,
  docMock,
  queryMock,
  whereMock,
  limitMock,
  orderByMock,
  incrementMock,
} = vi.hoisted(() => ({
  setDocMock: vi.fn(),
  updateDocMock: vi.fn(),
  deleteDocMock: vi.fn(),
  getDocMock: vi.fn(),
  getDocsMock: vi.fn(),
  writeBatchMock: vi.fn(),
  docMock: vi.fn((...args: unknown[]) => ({ path: args.join("/"), id: args.at(-1) })),
  queryMock: vi.fn((...args: unknown[]) => args),
  whereMock: vi.fn((field: string, op: string, value: unknown) => ({ field, op, value })),
  limitMock: vi.fn((n: number) => ({ limit: n })),
  orderByMock: vi.fn((field: string, dir?: string) => ({ field, dir })),
  incrementMock: vi.fn((n: number) => ({ __increment: n })),
}));

const batchUpdateMock = vi.hoisted(() => vi.fn());
const batchSetMock = vi.hoisted(() => vi.fn());
const batchDeleteMock = vi.hoisted(() => vi.fn());
const batchCommitMock = vi.hoisted(() => vi.fn());

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => docMock(...args),
  setDoc: setDocMock,
  updateDoc: updateDocMock,
  deleteDoc: deleteDocMock,
  getDoc: getDocMock,
  getDocs: getDocsMock,
  writeBatch: writeBatchMock,
  query: queryMock,
  where: whereMock,
  limit: limitMock,
  orderBy: orderByMock,
  increment: incrementMock,
  startAfter: vi.fn(),
  runTransaction: vi.fn(),
  onSnapshot: vi.fn(),
  collection: vi.fn(),
  addDoc: vi.fn(),
}));

vi.mock("../firebase", () => ({
  db: { __brand: "mock-db" },
  functions: { __brand: "mock-functions" },
}));

vi.mock("./converters", () => ({
  leadsRef: "leads-ref",
  archivedLeadsRef: "archived-ref",
  usersRef: "users-ref",
  callLogsRef: "calllogs-ref",
  customRolesRef: "roles-ref",
  projectsRef: "projects-ref",
  rostersRef: "rosters-ref",
  callTargetsRef: "targets-ref",
  auditLogsRef: "audit-ref",
  agentProductivityRef: "prod-ref",
  attendanceRef: "attendance-ref",
  leaveRequestsRef: "leave-ref",
  tasksRef: "tasks-ref",
  teamsRef: "teams-ref",
  smartListsRef: "smartlists-ref",
  deletedUsersRef: "deleted-ref",
  agentStatusRef: "status-ref",
  notificationsRef: "notifications-ref",
}));

vi.mock("./ListenerManager", () => ({
  ListenerManager: class {
    subscribe = vi.fn();
    unsubscribe = vi.fn();
  },
}));

vi.mock("@/shared/contracts", () => ({
  buildUserTasksQuery: vi.fn(),
  buildAttendanceDateRangeQuery: vi.fn(),
  buildLeaveRequestsListQuery: vi.fn(),
  buildAuditLogsListQuery: vi.fn(),
  buildUserNotificationsQuery: vi.fn(() => ({ __notificationsQuery: true })),
}));

vi.mock("./callLogSummaries", () => ({
  buildLeadCallSummaryPatch: vi.fn(() => ({ lastCallAt: "2026-07-28" })),
  mergeCallLogsDualRead: vi.fn((collectionLogs: unknown[]) => collectionLogs),
  orderRecentCallLogsChronologically: vi.fn((logs: unknown[]) => logs),
}));

vi.mock("./callLogIds", () => ({
  isEmbeddedCallLogFallbackEnabled: vi.fn(() => false),
}));

const fetchLeadsByPhoneMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/services/leads/leadsSec1Api", () => ({
  fetchLeadsByPhone: (...args: unknown[]) => fetchLeadsByPhoneMock(...args),
}));

import {
  LeadRepository,
  UsersRepository,
  NotificationsRepository,
} from "./repositories";
import { CallLogsRepository } from "./CallLogsRepository";

beforeEach(() => {
  vi.clearAllMocks();
  setDocMock.mockResolvedValue(undefined);
  updateDocMock.mockResolvedValue(undefined);
  deleteDocMock.mockResolvedValue(undefined);
  batchUpdateMock.mockReset();
  batchSetMock.mockReset();
  batchDeleteMock.mockReset();
  batchCommitMock.mockReset();
  writeBatchMock.mockReturnValue({
    update: batchUpdateMock,
    set: batchSetMock,
    delete: batchDeleteMock,
    commit: batchCommitMock.mockResolvedValue(undefined),
  });
});

describe("LeadRepository (mocked Firestore)", () => {
  it("add writes lead document by id", async () => {
    const lead = {
      id: "L1",
      name: "Test",
      phone: "999",
      status: "new",
    };

    await LeadRepository.add(lead);

    expect(setDocMock).toHaveBeenCalledWith(
      { path: "leads-ref/L1", id: "L1" },
      lead,
    );
  });

  it("update patches lead fields", async () => {
    await LeadRepository.update("L1", { status: "contacted" });
    expect(updateDocMock).toHaveBeenCalledWith(
      { path: "leads-ref/L1", id: "L1" },
      { status: "contacted" },
    );
  });

  it("delete removes lead document", async () => {
    await LeadRepository.delete("L1");
    expect(deleteDocMock).toHaveBeenCalledWith({ path: "leads-ref/L1", id: "L1" });
  });

  it("getById returns null when missing", async () => {
    getDocMock.mockResolvedValue({ exists: () => false });

    const result = await LeadRepository.getById("missing");

    expect(result).toBeNull();
  });

  it("getById merges id onto document data", async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      id: "L2",
      data: () => ({ name: "Ada", phone: "111", status: "new" }),
    });

    const result = await LeadRepository.getById("L2");

    expect(result).toMatchObject({ id: "L2", name: "Ada" });
  });

  it("findByPhone returns empty array for blank phone", async () => {
    const result = await LeadRepository.findByPhone("");
    expect(result).toEqual([]);
    expect(fetchLeadsByPhoneMock).not.toHaveBeenCalled();
  });

  it("findByPhone delegates to SEC-1 callable wrapper", async () => {
    fetchLeadsByPhoneMock.mockResolvedValue([
      { id: "L3", name: "Bob", phone: "555", status: "new" },
    ]);

    const results = await LeadRepository.findByPhone("555", 5);

    expect(fetchLeadsByPhoneMock).toHaveBeenCalledWith("555", 5);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("L3");
  });

  it("assign patches assignee fields with updatedAt", async () => {
    await LeadRepository.assign("L9", "user-1", "Agent One", "auth-uid-1");

    expect(updateDocMock).toHaveBeenCalledWith(
      { path: "leads-ref/L9", id: "L9" },
      expect.objectContaining({
        assignedTo: "user-1",
        assignedToName: "Agent One",
        assignedToUid: "auth-uid-1",
        updatedAt: expect.any(String),
      }),
    );
  });

  it("updateStatus merges extra fields", async () => {
    await LeadRepository.updateStatus("L9", "interested", { priority: "high" });

    expect(updateDocMock).toHaveBeenCalledWith(
      { path: "leads-ref/L9", id: "L9" },
      expect.objectContaining({
        status: "interested",
        priority: "high",
        updatedAt: expect.any(String),
      }),
    );
  });

  it("archiveLeadsByIds no-ops on empty input", async () => {
    const count = await LeadRepository.archiveLeadsByIds([], "admin");
    expect(count).toBe(0);
    expect(writeBatchMock).not.toHaveBeenCalled();
  });

  it("archiveLeadsByIds moves found leads to archived collection", async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      id: "L10",
      data: () => ({ name: "Archive Me", phone: "111", status: "new" }),
    });

    const count = await LeadRepository.archiveLeadsByIds(["L10"], "admin-1");

    expect(count).toBe(1);
    expect(batchSetMock).toHaveBeenCalled();
    expect(batchDeleteMock).toHaveBeenCalled();
    expect(batchCommitMock).toHaveBeenCalled();
  });

  it("restoreLeadsByIds no-ops on empty input", async () => {
    expect(await LeadRepository.restoreLeadsByIds([])).toBe(0);
    expect(writeBatchMock).not.toHaveBeenCalled();
  });

  it("restoreLeadsByIds moves archived docs back to leads", async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      id: "L11",
      data: () => ({
        name: "Restore Me",
        phone: "222",
        status: "new",
        archivedAt: "2026-07-01",
        archivedBy: "admin",
      }),
    });

    const count = await LeadRepository.restoreLeadsByIds(["L11"]);
    expect(count).toBe(1);
    expect(batchSetMock).toHaveBeenCalled();
    expect(batchDeleteMock).toHaveBeenCalled();
    expect(batchCommitMock).toHaveBeenCalled();
  });
});

describe("UsersRepository (mocked Firestore)", () => {
  it("add strips password before write", async () => {
    await UsersRepository.add({
      id: "u1",
      username: "agent",
      role: "telecaller",
      password: "secret",
    } as never);

    expect(setDocMock).toHaveBeenCalledWith(
      { path: "users-ref/u1", id: "u1" },
      expect.not.objectContaining({ password: "secret" }),
    );
  });

  it("update strips password from partial updates", async () => {
    await UsersRepository.update("u1", { password: "new-secret" } as never);
    expect(updateDocMock).toHaveBeenCalledWith(
      { path: "users-ref/u1", id: "u1" },
      expect.not.objectContaining({ password: "new-secret" }),
    );
  });

  it("delete removes user document", async () => {
    await UsersRepository.delete("u1");
    expect(deleteDocMock).toHaveBeenCalledWith({ path: "users-ref/u1", id: "u1" });
  });

  it("getByEmail lowercases lookup and returns first match", async () => {
    getDocsMock.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: "u2",
          data: () => ({ email: "agent@example.com", username: "agent" }),
        },
      ],
    });

    const user = await UsersRepository.getByEmail("Agent@Example.com");

    expect(whereMock).toHaveBeenCalledWith("email", "==", "agent@example.com");
    expect(user).toMatchObject({ id: "u2", username: "agent" });
  });

  it("getByEmail returns null when no match", async () => {
    getDocsMock.mockResolvedValue({ empty: true, docs: [] });
    expect(await UsersRepository.getByEmail("missing@example.com")).toBeNull();
  });

  it("getByUsername lowercases lookup", async () => {
    getDocsMock.mockResolvedValue({
      empty: false,
      docs: [{ id: "u3", data: () => ({ username: "tele1" }) }],
    });

    await UsersRepository.getByUsername("TELE1");

    expect(whereMock).toHaveBeenCalledWith("username", "==", "tele1");
  });

  it("updateUserRole writes merge doc under userRoles", async () => {
    await UsersRepository.updateUserRole("auth-uid", "admin");
    expect(setDocMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining("userRoles/auth-uid") }),
      { role: "admin" },
      { merge: true },
    );
  });

  it("deleteUserTransaction unassigns leads and removes user", async () => {
    await UsersRepository.deleteUserTransaction(
      "u-del",
      "auth-del",
      { username: "gone", deletedAt: "2026-07-28", deletedBy: "admin" } as never,
      ["L20"],
    );

    expect(setDocMock).toHaveBeenCalled();
    expect(batchUpdateMock).toHaveBeenCalled();
    expect(batchDeleteMock).toHaveBeenCalled();
    expect(batchCommitMock).toHaveBeenCalled();
  });
});

describe("NotificationsRepository (mocked Firestore)", () => {
  it("add writes notification by id", async () => {
    await NotificationsRepository.add({
      id: "n1",
      userId: "u1",
      title: "Hello",
      read: false,
      createdAt: "2026-07-28",
    } as never);

    expect(setDocMock).toHaveBeenCalledWith(
      { path: "notifications-ref/n1", id: "n1" },
      expect.objectContaining({ id: "n1", title: "Hello" }),
    );
  });

  it("update patches notification fields", async () => {
    await NotificationsRepository.update("n1", { read: true });
    expect(updateDocMock).toHaveBeenCalledWith(
      { path: "notifications-ref/n1", id: "n1" },
      { read: true },
    );
  });

  it("markAllAsRead batch-updates each id", async () => {
    await NotificationsRepository.markAllAsRead(["n1", "n2"]);

    expect(batchUpdateMock).toHaveBeenCalledTimes(2);
    expect(batchCommitMock).toHaveBeenCalled();
  });
});

describe("CallLogsRepository (mocked Firestore)", () => {
  it("getById returns null when missing", async () => {
    getDocMock.mockResolvedValue({ exists: () => false });
    expect(await CallLogsRepository.getById("missing")).toBeNull();
  });

  it("create writes call log and updates lead summary in one batch", async () => {
    docMock.mockImplementationOnce(() => ({ path: "calllogs-ref/auto", id: "cl-auto" }));

    const id = await CallLogsRepository.create("L1", {
      date: "2026-07-28T10:00:00.000Z",
      agent: "Agent",
      status: "contacted",
    } as never);

    expect(id).toBe("cl-auto");
    expect(batchSetMock).toHaveBeenCalled();
    expect(batchUpdateMock).toHaveBeenCalled();
    expect(batchCommitMock).toHaveBeenCalled();
  });

  it("listByLeadId queries by leadId with default page size", async () => {
    getDocsMock.mockResolvedValue({ docs: [] });
    await CallLogsRepository.listByLeadId("L1");
    expect(whereMock).toHaveBeenCalledWith("leadId", "==", "L1");
    expect(limitMock).toHaveBeenCalledWith(200);
  });

  it("reassignLeadId no-ops when no logs exist", async () => {
    getDocsMock.mockResolvedValue({ docs: [] });
    const count = await CallLogsRepository.reassignLeadId("L-old", "L-new");
    expect(count).toBe(0);
    expect(writeBatchMock).not.toHaveBeenCalled();
  });

  it("update patches call log document", async () => {
    await CallLogsRepository.update("cl1", { feedback: "Good call" } as never);
    expect(updateDocMock).toHaveBeenCalledWith(
      { path: "calllogs-ref/cl1", id: "cl1" },
      expect.objectContaining({ feedback: "Good call" }),
    );
  });
});

/**
 * Residual: full repository integration (transactions, listeners, batch limits)
 * belongs under Firestore emulator — see architecture_guide.md § Testing.
 */
