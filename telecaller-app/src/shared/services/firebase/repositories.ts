import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  increment,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  orderBy,
  startAfter,
  runTransaction,
  type QueryDocumentSnapshot,
  onSnapshot,
  collection,
  addDoc,
  type QuerySnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../firebase";
import { ListenerManager } from "./ListenerManager";
import {
  buildUserTasksQuery,
  buildAttendanceDateRangeQuery,
  buildLeaveRequestsListQuery,
  buildAuditLogsListQuery,
  buildUserNotificationsQuery,
} from "@/shared/contracts";
import {
  leadsRef,
  archivedLeadsRef,
  usersRef,
  customRolesRef,
  projectsRef,
  rostersRef,
  callTargetsRef,
  auditLogsRef,
  agentProductivityRef,
  attendanceRef,
  leaveRequestsRef,
  tasksRef,
  teamsRef,
  smartListsRef,
  deletedUsersRef,
  agentStatusRef,
  notificationsRef,
} from "./converters";
import {
  Lead,
  User,
  Project,
  AttendanceRecord,
  CustomRole,
  DailyProductivity,
  AuditLog,
  EventLog,
  Roster,
  CallTarget,
  Goals,
  SmartList,
  TaskItem,
  LeaveRequest,
  Team,
  CallLog,
  DeletedUserRecord,
  AgentStatusRecord,
  NotificationItem,
  TrainingData,
  Branding,
  CustomField,
} from "@/shared/types";
import { CallLogsRepository } from "./CallLogsRepository";
import type { Appearance } from "@/features/settings/hooks/useThemeStore";
import type { IVRActiveCall } from "@/features/calls/hooks/useIVRStore";
import type { TimelineEvent } from "@/features/messaging/timelineTypes";

/**
 * Identity-based lead mutations (Production Hardening Phase F).
 * List reads → LeadQueryService. Never scan a global in-memory leads[].
 */
export const LeadRepository = {
  async add(lead: Lead): Promise<void> {
    await setDoc(doc(leadsRef, lead.id), lead);
  },
  async update(id: string, updates: Partial<Lead>): Promise<void> {
    await updateDoc(doc(leadsRef, id), updates);
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(leadsRef, id));
  },
  /** Point read for detail pages — not a list query. */
  async getById(id: string): Promise<Lead | null> {
    const snap = await getDoc(doc(leadsRef, id));
    if (!snap.exists()) return null;
    return { ...snap.data(), id: snap.id } as Lead;
  },
  /**
   * Indexed phone lookup for dedup. Phones must already be normalized
   * the same way create/import stores them (see normalizePhone).
   */
  async findByPhone(phone: string, max = 10): Promise<Lead[]> {
    if (!phone) return [];
    const snap = await getDocs(
      query(leadsRef, where("phone", "==", phone), limit(max)),
    );
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Lead);
  },
  async assign(
    id: string,
    assignedTo: string,
    assignedToName: string,
  ): Promise<void> {
    await updateDoc(doc(leadsRef, id), {
      assignedTo,
      assignedToName,
      updatedAt: new Date().toISOString(),
    });
  },
  async updateStatus(id: string, status: string, extra?: Partial<Lead>): Promise<void> {
    await updateDoc(doc(leadsRef, id), {
      ...extra,
      status,
      updatedAt: new Date().toISOString(),
    });
  },
  /**
   * Archive by lead ids — loads each doc by id (no global array scan).
   */
  async archiveLeadsByIds(leadIds: string[], archivedBy: string): Promise<number> {
    if (leadIds.length === 0) return 0;
    const now = new Date().toISOString();
    const leads = await Promise.all(leadIds.map((id) => this.getById(id)));
    
    const batch = writeBatch(db);
    let archived = 0;
    for (let i = 0; i < leadIds.length; i++) {
      const lead = leads[i];
      if (!lead) continue;
      const leadId = leadIds[i];
      const archivedLead = {
        ...lead,
        archivedAt: now,
        archivedBy,
        updatedAt: now,
      };
      batch.set(doc(archivedLeadsRef, leadId), archivedLead);
      batch.delete(doc(leadsRef, leadId));
      archived += 1;
    }
    if (archived > 0) await batch.commit();
    return archived;
  },
  /**
   * Restore archived leads by id — loads from archived collection.
   */
  async restoreLeadsByIds(leadIds: string[]): Promise<number> {
    if (leadIds.length === 0) return 0;
    const snaps = await Promise.all(leadIds.map((id) => getDoc(doc(archivedLeadsRef, id))));
    
    const batch = writeBatch(db);
    let restored = 0;
    for (let i = 0; i < leadIds.length; i++) {
      const snap = snaps[i];
      if (!snap.exists()) continue;
      const id = leadIds[i];
      const data = { ...(snap.data() as Lead & { archivedAt?: string; archivedBy?: string }) };
      delete (data as { archivedAt?: string }).archivedAt;
      delete (data as { archivedBy?: string }).archivedBy;
      batch.set(doc(leadsRef, id), { ...data, id, updatedAt: new Date().toISOString() });
      batch.delete(doc(archivedLeadsRef, id));
      restored += 1;
    }
    if (restored > 0) await batch.commit();
    return restored;
  },
  /**
   * Merge source → target by id inside a transaction (load both by id).
   * Call-log reassignment happens outside the transaction (top-level collection).
   */
  async mergeLeads(
    targetId: string,
    sourceId: string,
    customSelections: Partial<Lead> | null = null,
  ): Promise<{ target: Lead; source: Lead } | null> {
    if (!targetId || !sourceId || targetId === sourceId) return null;

    await CallLogsRepository.reassignLeadId(sourceId, targetId);

    const result = await runTransaction(db, async (tx) => {
      const targetRef = doc(leadsRef, targetId);
      const sourceRef = doc(leadsRef, sourceId);
      const [targetSnap, sourceSnap] = await Promise.all([
        tx.get(targetRef),
        tx.get(sourceRef),
      ]);
      if (!targetSnap.exists() || !sourceSnap.exists()) return null;

      const targetLead = { ...targetSnap.data(), id: targetSnap.id } as Lead;
      const sourceLead = { ...sourceSnap.data(), id: sourceSnap.id } as Lead;

      // Phase C: history lives in top-level `callLogs` (reassigned above).
      // Do not merge or re-seed embedded `lead.callLogs[]` — read-only fallback until backfill + flag off.
      let updates: Partial<Lead> = {
        callCount: (targetLead.callCount || 0) + (sourceLead.callCount || 0),
        hasAgentCall: !!(targetLead.hasAgentCall || sourceLead.hasAgentCall),
        updatedAt: new Date().toISOString(),
      };

      if (customSelections) {
        const selectedNotes = customSelections.notes || "";
        let mergedNotes = selectedNotes;
        if (
          sourceLead.notes &&
          sourceLead.notes !== targetLead.notes &&
          !selectedNotes.includes(sourceLead.notes)
        ) {
          mergedNotes = `${selectedNotes}\n[Merged Notes from ${sourceLead.name}]: ${sourceLead.notes}`;
        }
        updates = { ...updates, ...customSelections, notes: mergedNotes };
      } else {
        updates.notes = `${targetLead.notes || ""}\n[Merged Notes from ${sourceLead.name}]: ${sourceLead.notes || ""}`;
        if (!targetLead.email && sourceLead.email) updates.email = sourceLead.email;
        if (!targetLead.source && sourceLead.source) updates.source = sourceLead.source;
      }

      tx.update(targetRef, updates);
      tx.delete(sourceRef);
      return {
        target: { ...targetLead, ...updates },
        source: sourceLead,
      };
    });

    return result;
  },
  /**
   * Collect lead ids assigned to a user (paginated). Used on user delete unassign.
   * Does not load a company-wide lead collection into memory.
   */
  async listIdsByAssignee(assigneeId: string, pageSize = 50): Promise<string[]> {
    const ids: string[] = [];
    let last: QueryDocumentSnapshot | undefined;
    const MAX_PAGES = 40;
    for (let page = 0; page < MAX_PAGES; page++) {
      const constraints = [
        where("assignedTo", "==", assigneeId),
        orderBy("updatedAt", "desc"),
        limit(pageSize),
      ];
      const q = last
        ? query(leadsRef, ...constraints, startAfter(last))
        : query(leadsRef, ...constraints);
      const snap = await getDocs(q);
      if (snap.empty) break;
      snap.docs.forEach((d) => ids.push(d.id));
      last = snap.docs[snap.docs.length - 1];
      if (snap.docs.length < pageSize) break;
    }
    return ids;
  },
  /**
   * Persist a call/activity log via top-level `callLogs` + lead summary fields.
   * Does **not** overwrite profile `Lead.notes` (Wave 6 P0) and does **not**
   * append to embedded `lead.callLogs[]` (Phase C — no dual-write).
   */
  async logCall(
    leadId: string,
    log: CallLog,
    status: string,
    followUpDate: string,
    options?: { lastAgentId?: string | null },
  ): Promise<string> {
    return CallLogsRepository.create(leadId, log, {
      status,
      followUpDate:
        followUpDate !== undefined && followUpDate !== null ? followUpDate : undefined,
      lastAgentId: options?.lastAgentId,
    });
  },
  /**
   * @deprecated Prefer CallLogsRepository.update / rateByLeadIndex.
   */
  async rateCallLog(leadId: string, updatedLogs: CallLog[]): Promise<void> {
    const withScore = [...updatedLogs].reverse().find((l) => l.qualityScore != null);
    if (!withScore) return;
    const logs = await CallLogsRepository.listByLeadId(leadId);
    const match = logs.find(
      (l) =>
        l.date === withScore.date &&
        l.note === withScore.note &&
        l.agent === withScore.agent,
    );
    if (!match) return;
    await CallLogsRepository.update(match.id, {
      qualityScore: withScore.qualityScore,
      feedback: withScore.feedback || withScore.adminFeedback || "",
      adminFeedback: withScore.adminFeedback || withScore.feedback || "",
    });
  },
  async bulkUpdate(ids: string[], updates: Partial<Lead>): Promise<void> {
    const batch = writeBatch(db);
    for (const id of ids) {
      batch.update(doc(leadsRef, id), {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    }
    await batch.commit();
  },
  /** @deprecated Prefer archiveLeadsByIds — kept for callers that already built archived payloads. */
  async archiveLeads(archivedList: { leadId: string; archivedLead: Lead & { archivedAt: string; archivedBy: string } }[]): Promise<void> {
    const batch = writeBatch(db);
    for (const { leadId, archivedLead } of archivedList) {
      batch.set(doc(archivedLeadsRef, leadId), archivedLead);
      batch.delete(doc(leadsRef, leadId));
    }
    await batch.commit();
  },
  /** @deprecated Prefer restoreLeadsByIds */
  async restoreLeads(restoredList: { id: string; lead: Lead }[]): Promise<void> {
    const batch = writeBatch(db);
    for (const { id, lead } of restoredList) {
      batch.set(doc(leadsRef, id), lead);
      batch.delete(doc(archivedLeadsRef, id));
    }
    await batch.commit();
  },
  async deletePermanently(ids: string[]): Promise<void> {
    const batch = writeBatch(db);
    for (const id of ids) {
      batch.delete(doc(archivedLeadsRef, id));
    }
    await batch.commit();
  },
  async bulkAddLeads(newLeads: Lead[], updatedDuplicates: Lead[]): Promise<void> {
    const batch = writeBatch(db);
    for (const lead of newLeads) {
      batch.set(doc(leadsRef, lead.id), lead);
    }
    for (const lead of updatedDuplicates) {
      batch.set(doc(leadsRef, lead.id), lead);
    }
    await batch.commit();
  },
};

/** @deprecated Use LeadRepository — identical identity-based API. */
export const LeadsRepository = LeadRepository;

// 2. Users Repository
function stripPasswordField<T extends Record<string, unknown>>(data: T): T {
  if (!("password" in data)) return data;
  const rest = { ...data };
  delete rest.password;
  return rest as T;
}

export const UsersRepository = {
  async add(user: User): Promise<void> {
    await setDoc(doc(usersRef, user.id), stripPasswordField(user as User & Record<string, unknown>) as User);
  },
  async update(id: string, updates: Partial<User>): Promise<void> {
    await updateDoc(
      doc(usersRef, id),
      stripPasswordField(updates as Partial<User> & Record<string, unknown>) as Partial<User>,
    );
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(usersRef, id));
  },
  async deleteUserTransaction(
    id: string,
    uid: string | undefined,
    deletedRecord: DeletedUserRecord,
    leadIdsToUnassign: string[]
  ): Promise<void> {
    await setDoc(
      doc(deletedUsersRef, deletedRecord.username),
      stripPasswordField(deletedRecord as DeletedUserRecord & Record<string, unknown>) as DeletedUserRecord,
    );
    const batch = writeBatch(db);
    for (const leadId of leadIdsToUnassign) {
      batch.update(doc(leadsRef, leadId), {
        assignedTo: "",
        assignedToName: "Unassigned",
        updatedAt: new Date().toISOString(),
      });
    }
    batch.delete(doc(usersRef, id));
    if (uid) {
      batch.delete(doc(db, "userRoles", uid));
    }
    await batch.commit();
  },
  async updateUserRole(uid: string, role: string): Promise<void> {
    await setDoc(doc(db, "userRoles", uid), { role }, { merge: true });
  },
  async addAuthRole(uid: string, role: string): Promise<void> {
    await setDoc(doc(db, "userRoles", uid), { role });
  },
  subscribeByUid(uid: string, callback: (user: User | null) => void, onError?: (err: Error) => void): () => void {
    const key = `users_uid_${uid}`;
    return ListenerManager.subscribe<User | null>(
      key,
      (dispatch) => {
        const qUid = query(usersRef, where("uid", "==", uid));
        return onSnapshot(
          qUid,
          (snapshot) => {
            if (!snapshot.empty) {
              const docSnap = snapshot.docs[0];
              dispatch({ ...docSnap.data(), id: docSnap.id } as User);
            } else {
              dispatch(null);
            }
          },
          onError
        );
      },
      callback
    );
  },
  async getByEmail(email: string): Promise<User | null> {
    const qEmail = query(usersRef, where("email", "==", email.toLowerCase()));
    const snap = await getDocs(qEmail);
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    return { ...docSnap.data(), id: docSnap.id } as User;
  },
  async getByUsername(username: string): Promise<User | null> {
    const qUsername = query(usersRef, where("username", "==", username.toLowerCase()));
    const snap = await getDocs(qUsername);
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    return { ...docSnap.data(), id: docSnap.id } as User;
  },
  subscribeDeletedUsers(callback: (list: DeletedUserRecord[]) => void, onError?: (err: Error) => void): () => void {
    const key = "users_deleted";
    return ListenerManager.subscribe<DeletedUserRecord[]>(
      key,
      (dispatch) => {
        return onSnapshot(
          deletedUsersRef,
          (snapshot) => {
            const list: DeletedUserRecord[] = [];
            snapshot.forEach((d) => list.push(d.data()));
            list.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
            dispatch(list);
          },
          onError
        );
      },
      callback
    );
  },
};

// 3. Projects Repository
export const ProjectsRepository = {
  async add(project: Project): Promise<void> {
    await setDoc(doc(projectsRef, project.id), project);
  },
  async set(id: string, project: Project): Promise<void> {
    await setDoc(doc(projectsRef, id), project);
  },
  async update(id: string, updates: Partial<Project>): Promise<void> {
    await updateDoc(doc(projectsRef, id), updates);
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(projectsRef, id));
  },
};

// 4. Custom Roles Repository
export const CustomRolesRepository = {
  async add(role: CustomRole): Promise<void> {
    await setDoc(doc(customRolesRef, role.id), role);
  },
  async update(id: string, updates: Partial<CustomRole>): Promise<void> {
    await updateDoc(doc(customRolesRef, id), updates);
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(customRolesRef, id));
  },
  subscribe(callback: (roles: CustomRole[]) => void, presets: CustomRole[]): () => void {
    const key = "customRoles";
    return ListenerManager.subscribe<CustomRole[]>(
      key,
      (dispatch) => {
        return onSnapshot(customRolesRef, (snapshot) => {
          if (snapshot.empty) {
            dispatch(presets);
            return;
          }
          const list: CustomRole[] = [];
          snapshot.forEach((d) => list.push(d.data()));
          dispatch(list);
        });
      },
      callback
    );
  }
};

// 5. Teams Repository
export const TeamsRepository = {
  async add(team: Team): Promise<void> {
    await setDoc(doc(teamsRef, team.id), team);
  },
  async update(id: string, updates: Partial<Team>): Promise<void> {
    await updateDoc(doc(teamsRef, id), updates);
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(teamsRef, id));
  },
  subscribe(callback: (teams: Team[]) => void): () => void {
    const key = "teams";
    return ListenerManager.subscribe<Team[]>(
      key,
      (dispatch) => {
        return onSnapshot(teamsRef, (snapshot) => {
          const list: Team[] = [];
          snapshot.forEach((d) => list.push(d.data()));
          dispatch(list);
        });
      },
      callback
    );
  }
};

// 6. Rosters Repository
export const RostersRepository = {
  async set(weekId: string, roster: Roster): Promise<void> {
    await setDoc(doc(rostersRef, weekId), roster);
  },
  subscribe(callback: (rosters: Record<string, Roster>) => void): () => void {
    const key = "rosters";
    return ListenerManager.subscribe<Record<string, Roster>>(
      key,
      (dispatch) => {
        return onSnapshot(rostersRef, (snapshot) => {
          const rost: Record<string, Roster> = {};
          snapshot.forEach((d) => {
            rost[d.id] = d.data();
          });
          dispatch(rost);
        });
      },
      callback
    );
  }
};

// 7. Call Targets Repository
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

// 8. Tasks Repository
export const TasksRepository = {
  async add(task: TaskItem): Promise<void> {
    await setDoc(doc(tasksRef, task.id), task);
  },
  async update(id: string, updates: Partial<TaskItem>): Promise<void> {
    await updateDoc(doc(tasksRef, id), updates);
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(tasksRef, id));
  },
  async bulkDelete(ids: string[]): Promise<void> {
    const batch = writeBatch(db);
    for (const id of ids) {
      batch.delete(doc(tasksRef, id));
    }
    await batch.commit();
  },
  subscribeUserTasks(userId: string, callback: (tasks: TaskItem[]) => void): () => void {
    const key = `tasks_user_${userId}`;
    return ListenerManager.subscribe<TaskItem[]>(
      key,
      (dispatch) => {
        const q = buildUserTasksQuery(userId);
        return onSnapshot(q, (snapshot) => {
          const list: TaskItem[] = [];
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as TaskItem);
          });
          dispatch(list);
        });
      },
      callback
    );
  }
};

// 9. Smart Lists Repository
export const SmartListsRepository = {
  async add(list: SmartList): Promise<void> {
    await setDoc(doc(smartListsRef, list.id), list);
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(smartListsRef, id));
  },
  subscribeUserLists(userId: string | undefined, callback: (lists: SmartList[]) => void): () => void {
    const key = `smartLists_user_${userId ?? "global"}`;
    return ListenerManager.subscribe<SmartList[]>(
      key,
      (dispatch) => {
        return onSnapshot(smartListsRef, (snapshot) => {
          const lists: SmartList[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            if (!userId || data.userId === userId || !data.userId)
              lists.push(data);
          });
          lists.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          dispatch(lists);
        });
      },
      callback
    );
  }
};

// 10. Agent Productivity Repository
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

// 11. Attendance Repository
export const AttendanceRepository = {
  async add(record: AttendanceRecord): Promise<void> {
    await setDoc(doc(attendanceRef, record.id), record);
  },
  async update(id: string, updates: Partial<AttendanceRecord>): Promise<void> {
    await updateDoc(doc(attendanceRef, id), updates);
  },
  subscribeRange(startDate: string, endDate: string, callback: (records: AttendanceRecord[]) => void): () => void {
    const key = `attendance_range_${startDate}_${endDate}`;
    return ListenerManager.subscribe<AttendanceRecord[]>(
      key,
      (dispatch) => {
        const rangeQuery = buildAttendanceDateRangeQuery({ startDate, endDate });
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

// 12. Leave Requests Repository
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

// 13. Settings repositories
export const SettingsRepository = {
  async setGoals(goals: Goals): Promise<void> {
    await setDoc(doc(db, "settings", "goals"), goals);
  },
  async setEvents(events: EventLog[]): Promise<void> {
    await setDoc(doc(db, "settings", "events"), { list: events });
  },
  async setCustomFields(fields: CustomField[]): Promise<void> {
    await setDoc(doc(db, "settings", "customFields"), { fields });
  },
  async setCoachingTip(text: string): Promise<void> {
    await setDoc(doc(db, "settings", "coachingTip"), { text, updatedAt: new Date().toISOString() });
  },
  async setTrainingData(data: TrainingData): Promise<void> {
    await setDoc(doc(db, "settings", "training"), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  },
  async setBranding(branding: Partial<Branding>): Promise<void> {
    // merge:true — migrate/seed patches must not wipe identity / savedThemes
    await setDoc(
      doc(db, "settings", "branding"),
      {
        ...branding,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  },
  async setIntegrations(integrations: Record<string, unknown>): Promise<void> {
    await setDoc(doc(db, "settings", "integrations"), integrations, { merge: true });
  },
  async setIntegrationsSecrets(secrets: Record<string, unknown>): Promise<void> {
    await setDoc(doc(db, "settings", "integrations_secrets"), secrets, { merge: true });
  },
  async setRouting(routing: Record<string, unknown>): Promise<void> {
    await setDoc(doc(db, "settings", "routing"), routing);
  },
  async setRemoteConfig(config: Record<string, unknown>): Promise<void> {
    await setDoc(doc(db, "settings", "remoteConfig"), config, { merge: true });
  },
  async getIntegrationsSecrets(): Promise<Record<string, unknown> | null> {
    const snap = await getDoc(doc(db, "settings", "integrations_secrets"));
    return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
  },
  async getRouting(): Promise<Record<string, unknown> | null> {
    const snap = await getDoc(doc(db, "settings", "routing"));
    return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
  },
  async getIntegrations(): Promise<Record<string, unknown> | null> {
    const snap = await getDoc(doc(db, "settings", "integrations"));
    return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
  },
  subscribeGoals(callback: (goals: Goals | null) => void): () => void {
    const key = "settings_goals";
    return ListenerManager.subscribe<Goals | null>(
      key,
      (dispatch) => {
        return onSnapshot(doc(db, "settings", "goals"), (docSnap) => {
          dispatch(docSnap.exists() ? (docSnap.data() as Goals) : null);
        });
      },
      callback
    );
  },
  subscribeEvents(callback: (events: EventLog[]) => void): () => void {
    const key = "settings_events";
    return ListenerManager.subscribe<EventLog[]>(
      key,
      (dispatch) => {
        return onSnapshot(doc(db, "settings", "events"), (docSnap) => {
          dispatch(docSnap.exists() ? ((docSnap.data()?.list || []) as EventLog[]) : []);
        });
      },
      callback
    );
  },
  subscribeCoachingTip(callback: (text: string) => void): () => void {
    const key = "settings_coachingTip";
    return ListenerManager.subscribe<string>(
      key,
      (dispatch) => {
        return onSnapshot(doc(db, "settings", "coachingTip"), (docSnap) => {
          dispatch(docSnap.exists() ? docSnap.data().text || "" : "");
        });
      },
      callback
    );
  },
  subscribeCustomFields(callback: (fields: CustomField[]) => void): () => void {
    const key = "settings_customFields";
    return ListenerManager.subscribe<CustomField[]>(
      key,
      (dispatch) => {
        return onSnapshot(doc(db, "settings", "customFields"), (docSnap) => {
          dispatch(docSnap.exists() ? (docSnap.data()?.fields || []) as CustomField[] : []);
        });
      },
      callback
    );
  },
  subscribeTraining(callback: (data: TrainingData | null) => void): () => void {
    const key = "settings_training";
    return ListenerManager.subscribe<TrainingData | null>(
      key,
      (dispatch) => {
        return onSnapshot(doc(db, "settings", "training"), (docSnap) => {
          dispatch(docSnap.exists() ? (docSnap.data() as TrainingData) : null);
        });
      },
      callback
    );
  },
  subscribeRemoteConfig(callback: (data: Record<string, unknown>) => void): () => void {
    const key = "settings_remoteConfig";
    return ListenerManager.subscribe<Record<string, unknown>>(
      key,
      (dispatch) => {
        return onSnapshot(doc(db, "settings", "remoteConfig"), (docSnap) => {
          if (docSnap.exists()) dispatch(docSnap.data() as Record<string, unknown>);
        });
      },
      callback
    );
  },
  subscribeIntegrations(callback: (data: Record<string, unknown>) => void): () => void {
    const key = "settings_integrations";
    return ListenerManager.subscribe<Record<string, unknown>>(
      key,
      (dispatch) => {
        return onSnapshot(doc(db, "settings", "integrations"), (docSnap) => {
          if (docSnap.exists()) dispatch(docSnap.data() as Record<string, unknown>);
        });
      },
      callback
    );
  },
  subscribeBranding(
    callback: (branding: Branding) => void,
    mapDoc: (data: Record<string, unknown>) => Branding,
    onMissing: () => Branding
  ): () => void {
    const key = "settings_branding";
    return ListenerManager.subscribe<Branding>(
      key,
      (dispatch) => {
        return onSnapshot(
          doc(db, "settings", "branding"),
          (docSnap) => {
            if (docSnap.exists()) {
              dispatch(mapDoc(docSnap.data() as Record<string, unknown>));
            } else {
              dispatch(onMissing());
            }
          },
          (err) => {
            console.warn("Branding snapshot unavailable", err);
          }
        );
      },
      callback
    );
  }
};

// 14. Audit Logs Repository
export const AuditLogsRepository = {
  async add(log: AuditLog): Promise<void> {
    await setDoc(doc(auditLogsRef, log.id), log);
  },
  subscribeList(
    options: { limit?: number },
    callback: (logs: AuditLog[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const key = `auditLogs_list_${JSON.stringify(options)}`;
    return ListenerManager.subscribe<AuditLog[]>(
      key,
      (dispatch) => {
        const listQuery = buildAuditLogsListQuery(options);
        return onSnapshot(
          listQuery,
          (snapshot) => {
            const logs: AuditLog[] = [];
            snapshot.forEach((d) => logs.push({ id: d.id, ...d.data() } as AuditLog));
            dispatch(logs);
          },
          onError
        );
      },
      callback
    );
  }
};

// 15. Agent Status Repository
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

// 16. Notifications Repository
export const NotificationsRepository = {
  async add(notification: NotificationItem): Promise<void> {
    await setDoc(doc(notificationsRef, notification.id), notification);
  },
  async update(id: string, updates: Partial<NotificationItem>): Promise<void> {
    await updateDoc(doc(notificationsRef, id), updates);
  },
  async markAllAsRead(ids: string[]): Promise<void> {
    const batch = writeBatch(db);
    for (const id of ids) {
      batch.update(doc(notificationsRef, id), { read: true });
    }
    await batch.commit();
  },
  subscribeUserNotifications(
    userId: string,
    callback: (list: NotificationItem[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const key = `notifications_user_${userId}`;
    return ListenerManager.subscribe<NotificationItem[]>(
      key,
      (dispatch) => {
        const q = buildUserNotificationsQuery(userId);
        return onSnapshot(
          q,
          (snapshot) => {
            const list: NotificationItem[] = [];
            snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as NotificationItem));
            dispatch(list);
          },
          onError
        );
      },
      callback
    );
  }
};

// 17. Themes Repository
export const ThemesRepository = {
  async get(userId: string): Promise<{ appearance: Appearance } | null> {
    const snap = await getDoc(doc(db, "themes", userId));
    if (!snap.exists()) return null;
    return snap.data() as { appearance: Appearance };
  },
  async set(userId: string, appearance: string): Promise<void> {
    await setDoc(doc(db, "themes", userId), { appearance }, { merge: true });
  },
  subscribe(userId: string, callback: (data: { appearance: Appearance } | null) => void): () => void {
    const key = `themes_user_${userId}`;
    return ListenerManager.subscribe<{ appearance: Appearance } | null>(
      key,
      (dispatch) => {
        return onSnapshot(doc(db, "themes", userId), (docSnap) => {
          if (docSnap.exists()) {
            dispatch(docSnap.data() as { appearance: Appearance });
          } else {
            dispatch(null);
          }
        });
      },
      callback
    );
  }
};

// 18. IVR Calls Repository
export const IvrCallsRepository = {
  subscribeActiveCall(agentId: string, callback: (call: IVRActiveCall | null) => void): () => void {
    const key = `ivrCalls_active_${agentId}`;
    return ListenerManager.subscribe<IVRActiveCall | null>(
      key,
      (dispatch) => {
        const q = query(
          collection(db, "ivrCalls"),
          where("agentId", "==", agentId),
          where("status", "==", "ringing"),
          orderBy("timestamp", "desc"),
          limit(1)
        );
        return onSnapshot(q, (snap) => {
          if (!snap.empty) {
            const d = snap.docs[0];
            dispatch({ id: d.id, ...(d.data() as Omit<IVRActiveCall, "id">) });
          } else {
            dispatch(null);
          }
        });
      },
      callback
    );
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, "ivrCalls", id));
  },
  async add(call: Omit<IVRActiveCall, "id">): Promise<void> {
    await addDoc(collection(db, "ivrCalls"), call);
  }
};

// 19. Dashboard Preferences Repository
export const DashboardPreferencesRepository = {
  subscribe(userId: string, callback: (data: Record<string, unknown> | null) => void): () => void {
    const key = `dashboardPreferences_user_${userId}`;
    return ListenerManager.subscribe<Record<string, unknown> | null>(
      key,
      (dispatch) => {
        return onSnapshot(doc(db, "dashboardPreferences", userId), (docSnap) => {
          if (docSnap.exists()) {
            dispatch(docSnap.data() as Record<string, unknown>);
          } else {
            dispatch(null);
          }
        });
      },
      callback
    );
  },
  async set(userId: string, data: Record<string, unknown>): Promise<void> {
    await setDoc(doc(db, "dashboardPreferences", userId), data, { merge: true });
  },
  async reset(userId: string, defaultData: Record<string, unknown>): Promise<void> {
    await setDoc(doc(db, "dashboardPreferences", userId), defaultData);
  }
};

// 20. Timeline Events Repository
export const TimelineEventsRepository = {
  async add(payload: Omit<TimelineEvent, "id"> | Partial<TimelineEvent>, idempotencyKey?: string): Promise<string | null> {
    if (idempotencyKey) {
      const safeKey = String(idempotencyKey).replace(/[^\w.-]/g, "_").slice(0, 120);
      const id = `tl_${safeKey}`;
      await setDoc(doc(db, "timelineEvents", id), payload, { merge: true });
      return id;
    }
    const ref = await addDoc(collection(db, "timelineEvents"), payload);
    return ref.id;
  },
  subscribe(leadId: string, max: number, callback: (events: TimelineEvent[]) => void): () => void {
    const key = `timelineEvents_lead_${leadId}_max_${max}`;
    return ListenerManager.subscribe<TimelineEvent[]>(
      key,
      (dispatch) => {
        const q = query(
          collection(db, "timelineEvents"),
          where("leadId", "==", leadId),
          orderBy("timestamp", "desc"),
          limit(max)
        );
        return onSnapshot(q, (snap) => {
          const list: TimelineEvent[] = [];
          snap.forEach((d) => {
            const data = d.data();
            list.push({
              id: d.id,
              leadId: String(data.leadId || leadId),
              type: data.type,
              source: data.source || "system",
              sourceId: data.sourceId,
              conversationId: data.conversationId,
              messageId: data.messageId,
              summary: String(data.summary || ""),
              icon: data.icon || "note",
              actorId: data.actorId,
              actorName: data.actorName,
              metadata: data.metadata,
              timestamp: String(data.timestamp || data.createdAt || ""),
              createdAt: String(data.createdAt || data.timestamp || ""),
            } as TimelineEvent);
          });
          dispatch(list);
        });
      },
      callback
    );
  }
};

// 21. WhatsApp Messages Repository
export const WhatsAppMessagesRepository = {
  subscribe(leadId: string, max: number, callback: (snapshot: QuerySnapshot<DocumentData>) => void, onError: (err: Error) => void): () => void {
    const key = `whatsappMessages_lead_${leadId}_max_${max}`;
    return ListenerManager.subscribe<QuerySnapshot<DocumentData>>(
      key,
      (dispatch) => {
        const q = query(
          collection(db, "whatsappMessages"),
          where("leadId", "==", leadId),
          orderBy("timestamp", "asc"),
          limit(max)
        );
        return onSnapshot(q, dispatch, onError);
      },
      callback
    );
  },
  subscribeLegacy(leadId: string, max: number, callback: (snapshot: QuerySnapshot<DocumentData>) => void, onError: (err: Error) => void): () => void {
    const key = `whatsappMessagesLegacy_lead_${leadId}_max_${max}`;
    return ListenerManager.subscribe<QuerySnapshot<DocumentData>>(
      key,
      (dispatch) => {
        const q = query(
          collection(db, "leads", leadId, "whatsappMessages"),
          orderBy("timestamp", "asc"),
          limit(max)
        );
        return onSnapshot(q, dispatch, onError);
      },
      callback
    );
  }
};

// 22. WhatsApp Conversations Repository
export const WhatsAppConversationsRepository = {
  subscribe(max: number, callback: (snapshot: QuerySnapshot<DocumentData>) => void, onError: (err: Error) => void): () => void {
    const key = `whatsappConversations_max_${max}`;
    return ListenerManager.subscribe<QuerySnapshot<DocumentData>>(
      key,
      (dispatch) => {
        const q = query(
          collection(db, "whatsappConversations"),
          orderBy("lastMessageAt", "desc"),
          limit(max)
        );
        return onSnapshot(q, dispatch, onError);
      },
      callback
    );
  }
};
