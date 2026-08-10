import type { User } from "@/shared/types";

/** Minimal assignee shape for uid resolution (users doc id + linked Auth uid). */
export type AssigneeIdentity = Pick<User, "id" | "uid">;

/**
 * SEC-1: denormalize Auth uid for future Firestore read rules (`assignedToUid`).
 * `assignedTo` remains the users/{docId} key for legacy queries and ownership checks.
 */
export function resolveAssignedToUid(
  assignedTo: string | undefined | null,
  assignee?: AssigneeIdentity | null,
): string {
  if (!assignedTo || assignedTo === "Unassigned") return "";
  if (assignee?.uid) return assignee.uid;
  return "";
}

export function buildAssignmentFields(
  assignedTo: string,
  assignedToName: string,
  assignee?: AssigneeIdentity | null,
): {
  assignedTo: string;
  assignedToName: string;
  assignedToUid: string;
} {
  return {
    assignedTo: assignedTo || "",
    assignedToName: assignedToName || "Unassigned",
    assignedToUid: resolveAssignedToUid(assignedTo, assignee),
  };
}
