import { useState, useEffect } from "react";
import { LeaveRequest } from "@/shared/types";
import { LeaveRequestsRepository } from "@/shared/services/firebase/repositories";

export interface UseLeaveRequestsStoreOptions {
  /**
   * When false, skip the live list listener (Dashboard lazy-subscribe).
   * `submitLeaveRequest` / `updateLeaveStatus` still write via repository.
   */
  enabled?: boolean;
  /** Max docs for the list listener (default 200 via contract). */
  listLimit?: number;
  /** When set, scope list to this user's leave rows. */
  userId?: string;
}

export function useLeaveRequestsStore(
  options: UseLeaveRequestsStoreOptions = {},
) {
  const { enabled = true, listLimit, userId } = options;
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoaded, setIsLoaded] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = LeaveRequestsRepository.subscribeList(
      {
        ...(listLimit != null ? { limit: listLimit } : {}),
        ...(userId ? { userId } : {}),
      },
      (list) => {
        list.sort(
          (a, b) =>
            new Date(b.createdAt ?? "").getTime() -
            new Date(a.createdAt ?? "").getTime(),
        );
        setLeaveRequests(list);
        setIsLoaded(true);
      }
    );
    return () => unsubscribe();
  }, [enabled, listLimit, userId]);

  const submitLeaveRequest = async (request: {
    userId: string;
    username: string;
    startDate: string;
    endDate: string;
    leaveType?: string;
    reason?: string;
  }) => {
    const id = Date.now().toString() + "-" + Math.floor(Math.random() * 1000);
    const newReq: LeaveRequest = {
      id,
      userId: request.userId,
      username: request.username,
      startDate: request.startDate,
      endDate: request.endDate,
      leaveType: request.leaveType ?? "casual",
      reason: request.reason ?? "",
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    await LeaveRequestsRepository.add(newReq);
  };

  const updateLeaveStatus = async (
    id: string,
    status: "pending" | "approved" | "rejected",
  ) => {
    await LeaveRequestsRepository.update(id, { status });
  };

  return { leaveRequests, isLoaded, submitLeaveRequest, updateLeaveStatus };
}
