/**
 * Task schema extensions (contract only until auto-tasks authorized).
 * Manual TasksWidget remains unchanged; Agent 3 may populate these fields later.
 */

export type TaskSource =
  | "manual"
  | "followup"
  | "sla"
  | "site_visit"
  | "missed_call"
  | "stuck_lead"
  | "system";

export type TaskType =
  | "follow_up"
  | "call_back"
  | "site_visit"
  | "sla"
  | "review"
  | "other";

/**
 * Optional fields to add on `TaskItem` when auto-task generation is authorized.
 * Existing `{ id, userId, text, done, createdAt? }` remains valid.
 */
export interface TaskItemExtensions {
  leadId?: string;
  dueAt?: string;
  source?: TaskSource;
  type?: TaskType;
}
