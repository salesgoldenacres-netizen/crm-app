import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  increment,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { ListenerManager } from "../ListenerManager";
import {
  agentProductivityRef,
  attendanceRef,
  leaveRequestsRef,
  callTargetsRef,
  agentStatusRef,
} from "../converters";
import {
  buildAttendanceDateRangeQuery,
  buildLeaveRequestsListQuery,
} from "@/shared/contracts";
import {
  DailyProductivity,
  AttendanceRecord,
  LeaveRequest,
  CallTarget,
  AgentStatusRecord,
} from "@/shared/types";

export const AgentProductivityRepository = {
  async update(id: string, updates: Partial<DailyProductivity>): Promise<void> {
    await updateDoc(doc(agentProductivityRef, id), updates);
  },
  async add(productivity: DailyProductivity): Promise<void> {
    await setDoc(doc(agentProductivityRef, `${productivity.userId}_${productivity.date}`), productivity);
  },
  async incrementTelemetry(id: string, callCount: number, talkTime: number, bookCount: number, interestCount: number, activeTime: string): Promise<void> {
    const ref = doc(agentProductivityRef, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const parts = id.split("_");
      const userId = parts[0];
      const date = parts[1];
      await setDoc(ref, {
        userId,
        agentId: userId,
        date,
        totalCalls: callCount,
        totalTalkTimeSeconds: talkTime,
        lastActiveTime: activeTime,
        idleWarning: false,
        bookedCount: bookCount,
        interestedCount: interestCount,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await updateDoc(ref, {
        totalCalls: increment(callCount),
        totalTalkTimeSeconds: increment(talkTime),
        bookedCount: increment(bookCount),
        interestedCount: increment(interestCount),
        lastActiveTime: activeTime,
        updatedAt: new Date().toISOString(),
      });
    }
  },
  subscribe(callback: (productivity: DailyProductivity[]) => void): () => void {
    const key = "agentProductivity";
    return ListenerManager.subscribe<DailyProductivity[]>(
      key,
      (dispatch) => {
        return onSnapshot(agentProductivityRef, (snapshot) => {
          const list: DailyProductivity[] = [];
          snapshot.forEach((d) => list.push(d.data()));
          dispatch(list);
        });
      },
      callback
    );
  },
  subscribeMap(callback: (productivity: Record<string, DailyProductivity>) => void): () => void {
    const key = "agentProductivity_map";
    return ListenerManager.subscribe<Record<string, DailyProductivity>>(
      key,
      (dispatch) => {
        return onSnapshot(agentProductivityRef, (snapshot) => {
          const prod: Record<string, DailyProductivity> = {};
          snapshot.forEach((d) => {
            prod[d.id] = d.data();
          });
          dispatch(prod);
        });
      },
      callback
    );
  }
};

export const AttendanceRepository = {
  async add(record: AttendanceRecord): Promise<void> {
    await setDoc(doc(attendanceRef, record.id), record);
  },
  async update(id: string, updates: Partial<AttendanceRecord>): Promise<void> {
    await updateDoc(doc(attendanceRef, id), updates);
  },
  subscribeRange(
    startDate: string,
    endDate: string,
    callback: (records: AttendanceRecord[]) => void,
    userId?: string,
  ): () => void {
    const key = `attendance_range_${startDate}_${endDate}_${userId || "all"}`;
    return ListenerManager.subscribe<AttendanceRecord[]>(
      key,
      (dispatch) => {
        const rangeQuery = buildAttendanceDateRangeQuery({
          startDate,
          endDate,
          userId,
        });
        return onSnapshot(rangeQuery, (snapshot) => {
          const records: AttendanceRecord[] = [];
          snapshot.forEach((d) => {
            records.push({ id: d.id, ...d.data() } as AttendanceRecord);
          });
          dispatch(records);
        });
      },
      callback
    );
  },
  subscribeToday(docId: string, callback: (record: AttendanceRecord | null) => void): () => void {
    const key = `attendance_today_${docId}`;
    return ListenerManager.subscribe<AttendanceRecord | null>(
      key,
      (dispatch) => {
        return onSnapshot(doc(attendanceRef, docId), (docSnap) => {
          dispatch(
            docSnap.exists()
              ? ({ ...docSnap.data(), id: docSnap.id } as AttendanceRecord)
              : null,
          );
        });
      },
      callback
    );
  }
};

export const LeaveRequestsRepository = {
  async add(request: LeaveRequest): Promise<void> {
    await setDoc(doc(leaveRequestsRef, request.id), request);
  },
  async update(id: string, updates: Partial<LeaveRequest>): Promise<void> {
    await updateDoc(doc(leaveRequestsRef, id), updates);
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(leaveRequestsRef, id));
  },
  subscribeList(
    options: { limit?: number; userId?: string },
    callback: (list: LeaveRequest[]) => void
  ): () => void {
    const key = `leaveRequests_list_${JSON.stringify(options)}`;
    return ListenerManager.subscribe<LeaveRequest[]>(
      key,
      (dispatch) => {
        const listQuery = buildLeaveRequestsListQuery(options);
        return onSnapshot(listQuery, (snapshot) => {
          const list: LeaveRequest[] = [];
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as LeaveRequest);
          });
          dispatch(list);
        });
      },
      callback
    );
  }
};

export const CallTargetsRepository = {
  async set(userId: string, target: CallTarget): Promise<void> {
    await setDoc(doc(callTargetsRef, userId), target);
  },
  subscribe(callback: (targets: Record<string, CallTarget>) => void): () => void {
    const key = "callTargets";
    return ListenerManager.subscribe<Record<string, CallTarget>>(
      key,
      (dispatch) => {
        return onSnapshot(callTargetsRef, (snapshot) => {
          const tgts: Record<string, CallTarget> = {};
          snapshot.forEach((d) => {
            tgts[d.id] = d.data();
          });
          dispatch(tgts);
        });
      },
      callback
    );
  }
};

export const AgentStatusRepository = {
  async set(userId: string, status: AgentStatusRecord): Promise<void> {
    await setDoc(doc(agentStatusRef, userId), status, { merge: true });
  },
  subscribe(
    callback: (statuses: Record<string, AgentStatusRecord>) => void,
    onError?: (err: Error) => void
  ): () => void {
    const key = "agentStatuses";
    return ListenerManager.subscribe<Record<string, AgentStatusRecord>>(
      key,
      (dispatch) => {
        return onSnapshot(
          agentStatusRef,
          (snapshot) => {
            const statuses: Record<string, AgentStatusRecord> = {};
            snapshot.forEach((d) => {
              statuses[d.id] = d.data();
            });
            dispatch(statuses);
          },
          (err) => onError?.(err)
        );
      },
      callback
    );
  }
};
