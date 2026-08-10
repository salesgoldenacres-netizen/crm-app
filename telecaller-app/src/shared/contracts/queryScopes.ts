/**
 * Query-scoping helpers for role-scoped CRM listeners.
 * Agent 3 / performance track wires these into stores — do not invent ad-hoc queries.
 *
 * Required composite indexes are documented in
 * `directives/wave6-phase2a-agent0-notes.md` (Agent 3 deploys before jobs).
 */

import {
  collection,
  limit as fsLimit,
  orderBy,
  query,
  where,
  type Query,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/shared/services/firebase";
import { COLLECTIONS } from "@/shared/constants";
import { isManagerial } from "@/shared/utils/roleUtils";
import type { CustomRole } from "@/shared/types";
import { AGENT_OPEN_LEADS_REALTIME_BOUND } from "@/shared/services/leads/leadQueryConstants";

export interface LeadScopeOptions {
  /**
   * Max docs for a **realtime listener** only.
   * Default is AGENT_OPEN_LEADS_REALTIME_BOUND (not 500).
   * Pagination must set `omitLimit: true` and apply pageSize via FirestorePaginationProvider.
   */
  limit?: number;
  /**
   * When true, do not attach fsLimit — the pagination provider applies pageSize+1.
   * Required for cursor pagination (avoids double-limit / hidden 500 cliff).
   */
  omitLimit?: boolean;
  /** Field to order by (default updatedAt). */
  orderField?: "updatedAt" | "createdAt" | "followUpDate";
  orderDirection?: "asc" | "desc";
  /** Soft archive filter when field exists on docs. */
  excludeArchived?: boolean;
  /** Active project filtering (Wave 8). */
  projectId?: string | null;
  /** Wave 8 Phase 2D-B Pagination support */
  startAfterCursor?: import("../services/performance/pagination/contracts/CursorToken").CursorToken;
  pageSize?: number;
  offset?: never;
}

export interface NotificationScopeOptions {
  limit?: number;
}

export interface AttendanceScopeOptions {
  /** Inclusive YYYY-MM-DD start. */
  startDate: string;
  /** Inclusive YYYY-MM-DD end. */
  endDate: string;
  userId?: string;
  limit?: number;
}

export interface AuditListOptions {
  limit?: number;
}

export interface ArchivedLeadsListOptions {
  /** Max archived docs for the live listener (default 200). */
  limit?: number;
}

export interface UserTasksScopeOptions {
  limit?: number;
}

export interface LeaveRequestsListOptions {
  limit?: number;
  userId?: string;
}

function leadsCollection() {
  return collection(db, COLLECTIONS.LEADS);
}

function notificationsCollection() {
  return collection(db, COLLECTIONS.NOTIFICATIONS);
}

function attendanceCollection() {
  return collection(db, COLLECTIONS.ATTENDANCE);
}

function auditLogsCollection() {
  return collection(db, COLLECTIONS.AUDIT_LOGS);
}

function archivedLeadsCollection() {
  return collection(db, COLLECTIONS.ARCHIVED_LEADS);
}

function tasksCollection() {
  return collection(db, COLLECTIONS.TASKS);
}

function leaveRequestsCollection() {
  return collection(db, COLLECTIONS.LEAVE_REQUESTS);
}

/**
 * Agent-scoped leads: `assignedTo == uid`.
 * Requires index: assignedTo ASC + updatedAt DESC (see notes).
 */
export function buildAgentLeadsQuery(
  uid: string,
  options: LeadScopeOptions = {},
): Query {
  if ("offset" in options && (options as Record<string, unknown>).offset !== undefined) {
    throw new Error("Offset-based pagination is explicitly prohibited.");
  }
  const orderField = options.orderField ?? "updatedAt";
  const direction = options.orderDirection ?? "desc";
  const constraints: QueryConstraint[] = [];
  if (options.projectId) {
    constraints.push(where("projectId", "==", options.projectId));
  }
  constraints.push(where("assignedTo", "==", uid));
  constraints.push(orderBy(orderField, direction));
  if (!options.omitLimit) {
    // Realtime path only — never mount an unbounded agent leads listener.
    const lim = options.limit ?? AGENT_OPEN_LEADS_REALTIME_BOUND;
    constraints.push(fsLimit(lim));
  }
  return query(leadsCollection(), ...constraints);
}

/**
 * Manager/admin leads: order + optional bound.
 * Production list reads must use LeadQueryService (omitLimit + cursor pages).
 * Realtime listeners must pass an explicit `limit` — there is no company-wide default of 500.
 */
export function buildManagerLeadsQuery(options: LeadScopeOptions = {}): Query {
  if ("offset" in options && (options as Record<string, unknown>).offset !== undefined) {
    throw new Error("Offset-based pagination is explicitly prohibited.");
  }
  const orderField = options.orderField ?? "updatedAt";
  const direction = options.orderDirection ?? "desc";
  const constraints: QueryConstraint[] = [];
  if (options.projectId) {
    constraints.push(where("projectId", "==", options.projectId));
  }
  constraints.push(orderBy(orderField, direction));
  if (!options.omitLimit) {
    if (options.limit == null) {
      throw new Error(
        "buildManagerLeadsQuery requires an explicit limit for realtime listeners, or omitLimit for pagination.",
      );
    }
    constraints.push(fsLimit(options.limit));
  }
  return query(leadsCollection(), ...constraints);
}

/**
 * Role-aware lead query matrix.
 * Agents → assignedTo; managerial → bounded manager query.
 */
export function buildRoleScopedLeadsQuery(
  uid: string,
  roleCode: string,
  customRoles: CustomRole[] = [],
  options: LeadScopeOptions = {},
): Query {
  if (isManagerial(roleCode, customRoles)) {
    return buildManagerLeadsQuery(options);
  }
  return buildAgentLeadsQuery(uid, options);
}

/**
 * Notifications for a single user.
 * Requires index: userId ASC + createdAt DESC (see notes).
 * Shared announcements (`userId` missing) remain a separate query if product needs them.
 * Default limit 100 — never mount unbounded notification history.
 */
export function buildUserNotificationsQuery(
  uid: string,
  options: NotificationScopeOptions = {},
): Query {
  const lim = options.limit ?? 100;
  return query(
    notificationsCollection(),
    where("userId", "==", uid),
    orderBy("createdAt", "desc"),
    fsLimit(lim),
  );
}

/**
 * Optional shared/broadcast notifications (no userId).
 * Prefer mounting only when UI needs announcements.
 */
export function buildBroadcastNotificationsQuery(
  options: NotificationScopeOptions = {},
): Query {
  const lim = options.limit ?? 50;
  return query(
    notificationsCollection(),
    where("userId", "==", ""),
    orderBy("createdAt", "desc"),
    fsLimit(lim),
  );
}

/**
 * Attendance for a date window (dashboard / today views).
 * Requires index: date ASC (+ userId when scoped).
 */
export function buildAttendanceDateRangeQuery(
  options: AttendanceScopeOptions,
): Query {
  const constraints: QueryConstraint[] = [
    where("date", ">=", options.startDate),
    where("date", "<=", options.endDate),
    orderBy("date", "asc"),
  ];
  if (options.userId) {
    // When filtering by user, prefer userId equality + date range
    // Composite: userId ASC, date ASC
    return query(
      attendanceCollection(),
      where("userId", "==", options.userId),
      where("date", ">=", options.startDate),
      where("date", "<=", options.endDate),
      orderBy("date", "asc"),
      ...(options.limit != null ? [fsLimit(options.limit)] : []),
    );
  }
  if (options.limit != null) {
    constraints.push(fsLimit(options.limit));
  }
  return query(attendanceCollection(), ...constraints);
}

/**
 * Audit log **list** query — subscribe only on Audit UI, never on every Dashboard mount.
 * Writes stay on `AuditLogsRepository.add` (write/list split).
 */
export function buildAuditLogsListQuery(options: AuditListOptions = {}): Query {
  const lim = options.limit ?? 100;
  return query(
    auditLogsCollection(),
    orderBy("timestamp", "desc"),
    fsLimit(lim),
  );
}

/**
 * Archived leads list — bounded; mount only on Lead Bin UI.
 * Single-field `archivedAt` index is auto-sufficient.
 */
export function buildArchivedLeadsListQuery(
  options: ArchivedLeadsListOptions = {},
): Query {
  const lim = options.limit ?? 200;
  return query(
    archivedLeadsCollection(),
    orderBy("archivedAt", "desc"),
    fsLimit(lim),
  );
}

/**
 * Per-user tasks (replaces full-collection + client filter).
 * Requires index: userId ASC + createdAt ASC.
 */
export function buildUserTasksQuery(
  uid: string,
  options: UserTasksScopeOptions = {},
): Query {
  const constraints: QueryConstraint[] = [
    where("userId", "==", uid),
    orderBy("createdAt", "asc"),
  ];
  if (options.limit != null) {
    constraints.push(fsLimit(options.limit));
  }
  return query(tasksCollection(), ...constraints);
}

/**
 * Leave requests list — bounded; prefer enabling only on widget/attendance UIs.
 * Optional userId scopes agents to their own rows.
 */
export function buildLeaveRequestsListQuery(
  options: LeaveRequestsListOptions = {},
): Query {
  const lim = options.limit ?? 200;
  if (options.userId) {
    return query(
      leaveRequestsCollection(),
      where("userId", "==", options.userId),
      orderBy("createdAt", "desc"),
      fsLimit(lim),
    );
  }
  return query(
    leaveRequestsCollection(),
    orderBy("createdAt", "desc"),
    fsLimit(lim),
  );
}

/**
 * Follow-up reminder job shape (for Agent 3 — document required indexes).
 * Equality on followUpDate (YYYY-MM-DD) is preferred over range scans when possible.
 */
export function describeFollowUpDateQueryIndex(): {
  collection: string;
  fields: Array<{ field: string; order: "ASCENDING" | "DESCENDING" }>;
} {
  return {
    collection: COLLECTIONS.LEADS,
    fields: [
      { field: "followUpDate", order: "ASCENDING" },
      { field: "assignedTo", order: "ASCENDING" },
    ],
  };
}

/**
 * Site-visit reminder equality on nested date (Phase 2C automation).
 */
export function describeSiteVisitDateQueryIndex(): {
  collection: string;
  fields: Array<{ field: string; order: "ASCENDING" | "DESCENDING" }>;
} {
  return {
    collection: COLLECTIONS.LEADS,
    fields: [{ field: "siteVisit.date", order: "ASCENDING" }],
  };
}
