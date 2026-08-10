import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  queryMock,
  whereMock,
  orderByMock,
  limitMock,
  collectionMock,
} = vi.hoisted(() => ({
  queryMock: vi.fn((...args: unknown[]) => ({ __query: args })),
  whereMock: vi.fn((field: string, op: string, value: unknown) => ({
    field,
    op,
    value,
  })),
  orderByMock: vi.fn((field: string, dir?: string) => ({ field, dir })),
  limitMock: vi.fn((n: number) => ({ limit: n })),
  collectionMock: vi.fn((...args: unknown[]) => ({ __collection: args })),
}));

vi.mock("firebase/firestore", () => ({
  collection: collectionMock,
  query: queryMock,
  where: whereMock,
  orderBy: orderByMock,
  limit: limitMock,
}));

vi.mock("@/shared/services/firebase", () => ({
  db: { __brand: "mock-db" },
}));

import {
  buildAgentLeadsQuery,
  buildManagerLeadsQuery,
  buildRoleScopedLeadsQuery,
  buildUserNotificationsQuery,
  buildBroadcastNotificationsQuery,
  buildAttendanceDateRangeQuery,
  buildAuditLogsListQuery,
  buildArchivedLeadsListQuery,
  buildUserTasksQuery,
  buildLeaveRequestsListQuery,
  describeFollowUpDateQueryIndex,
  describeSiteVisitDateQueryIndex,
} from "./queryScopes";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("queryScopes", () => {
  it("buildAgentLeadsQuery scopes by assignedTo with default realtime bound", () => {
    buildAgentLeadsQuery("agent-uid");

    expect(whereMock).toHaveBeenCalledWith("assignedTo", "==", "agent-uid");
    expect(orderByMock).toHaveBeenCalledWith("updatedAt", "desc");
    expect(limitMock).toHaveBeenCalled();
  });

  it("buildAgentLeadsQuery rejects offset pagination", () => {
    expect(() =>
      buildAgentLeadsQuery("agent-uid", { offset: 10 } as never),
    ).toThrow(/Offset-based pagination is explicitly prohibited/);
  });

  it("buildAgentLeadsQuery omits limit when omitLimit is true", () => {
    buildAgentLeadsQuery("agent-uid", { omitLimit: true });
    expect(limitMock).not.toHaveBeenCalled();
  });

  it("buildManagerLeadsQuery requires explicit limit for realtime listeners", () => {
    expect(() => buildManagerLeadsQuery()).toThrow(/explicit limit/);
  });

  it("buildManagerLeadsQuery accepts explicit limit", () => {
    buildManagerLeadsQuery({ limit: 50 });
    expect(limitMock).toHaveBeenCalledWith(50);
  });

  it("buildRoleScopedLeadsQuery routes agents to assignedTo query", () => {
    buildRoleScopedLeadsQuery("agent-uid", "telecaller", []);
    expect(whereMock).toHaveBeenCalledWith("assignedTo", "==", "agent-uid");
  });

  it("buildRoleScopedLeadsQuery routes managers to manager query", () => {
    buildRoleScopedLeadsQuery("mgr-uid", "admin", [], { limit: 25 });
    expect(whereMock).not.toHaveBeenCalledWith("assignedTo", "==", "mgr-uid");
    expect(limitMock).toHaveBeenCalledWith(25);
  });

  it("buildUserNotificationsQuery filters by userId with default limit 100", () => {
    buildUserNotificationsQuery("user-1");
    expect(whereMock).toHaveBeenCalledWith("userId", "==", "user-1");
    expect(orderByMock).toHaveBeenCalledWith("createdAt", "desc");
    expect(limitMock).toHaveBeenCalledWith(100);
  });

  it("buildBroadcastNotificationsQuery targets empty userId broadcasts", () => {
    buildBroadcastNotificationsQuery({ limit: 10 });
    expect(whereMock).toHaveBeenCalledWith("userId", "==", "");
    expect(limitMock).toHaveBeenCalledWith(10);
  });

  it("buildAttendanceDateRangeQuery scopes date window", () => {
    buildAttendanceDateRangeQuery({
      startDate: "2026-07-01",
      endDate: "2026-07-31",
    });
    expect(whereMock).toHaveBeenCalledWith("date", ">=", "2026-07-01");
    expect(whereMock).toHaveBeenCalledWith("date", "<=", "2026-07-31");
  });

  it("buildAttendanceDateRangeQuery adds userId filter when scoped", () => {
    buildAttendanceDateRangeQuery({
      startDate: "2026-07-01",
      endDate: "2026-07-07",
      userId: "agent-1",
    });
    expect(whereMock).toHaveBeenCalledWith("userId", "==", "agent-1");
  });

  it("buildAuditLogsListQuery orders by timestamp desc", () => {
    buildAuditLogsListQuery({ limit: 50 });
    expect(orderByMock).toHaveBeenCalledWith("timestamp", "desc");
    expect(limitMock).toHaveBeenCalledWith(50);
  });

  it("buildArchivedLeadsListQuery orders by archivedAt desc", () => {
    buildArchivedLeadsListQuery();
    expect(orderByMock).toHaveBeenCalledWith("archivedAt", "desc");
    expect(limitMock).toHaveBeenCalledWith(200);
  });

  it("buildUserTasksQuery scopes tasks to user", () => {
    buildUserTasksQuery("user-9", { limit: 20 });
    expect(whereMock).toHaveBeenCalledWith("userId", "==", "user-9");
    expect(orderByMock).toHaveBeenCalledWith("createdAt", "asc");
    expect(limitMock).toHaveBeenCalledWith(20);
  });

  it("buildLeaveRequestsListQuery scopes by user when provided", () => {
    buildLeaveRequestsListQuery({ userId: "agent-2" });
    expect(whereMock).toHaveBeenCalledWith("userId", "==", "agent-2");
  });

  it("describeFollowUpDateQueryIndex documents composite index shape", () => {
    const idx = describeFollowUpDateQueryIndex();
    expect(idx.fields.map((f) => f.field)).toEqual([
      "followUpDate",
      "assignedTo",
    ]);
  });

  it("describeSiteVisitDateQueryIndex documents nested date index", () => {
    const idx = describeSiteVisitDateQueryIndex();
    expect(idx.fields[0].field).toBe("siteVisit.date");
  });
});
