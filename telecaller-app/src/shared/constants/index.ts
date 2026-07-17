/**
 * Global Firestore Collection registry to eliminate magic strings
 * and prevent typos in database references.
 */
export const COLLECTIONS = {
  LEADS: "leads",
  ARCHIVED_LEADS: "archivedLeads",
  USERS: "users",
  USER_ROLES: "userRoles",
  CUSTOM_ROLES: "customRoles",
  DELETED_USERS: "deletedUsers",
  SETTINGS: "settings",
  PROJECTS: "projects",
  ROSTERS: "rosters",
  CALL_TARGETS: "callTargets",
  AUDIT_LOGS: "auditLogs",
  AGENT_PRODUCTIVITY: "agentProductivity",
  AGENT_STATUS: "agentStatus",
  ATTENDANCE: "attendance",
  LEAVE_REQUESTS: "leaveRequests",
  NOTIFICATIONS: "notifications",
  THEMES: "themes",
  DASHBOARD_PREFERENCES: "dashboardPreferences",
  IVR_CALLS: "ivrCalls",
  TASKS: "tasks",
  TEAMS: "teams",
  SMART_LISTS: "smartLists",
} as const;
