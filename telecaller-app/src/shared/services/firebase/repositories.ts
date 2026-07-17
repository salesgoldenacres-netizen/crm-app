import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  increment,
  arrayUnion,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
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
} from "@/shared/types";

// 1. Leads Repository
export const LeadsRepository = {
  async add(lead: Lead): Promise<void> {
    await setDoc(doc(leadsRef, lead.id), lead);
  },
  async update(id: string, updates: Partial<Lead>): Promise<void> {
    await updateDoc(doc(leadsRef, id), updates);
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(leadsRef, id));
  },
  /**
   * Persist a call/activity log entry via arrayUnion (race-safe append).
   * Does **not** overwrite profile `Lead.notes` (Wave 6 P0) — notes belong on
   * callLogs / timeline; profile notes are updated only via `updateLead`.
   *
   * DEFERRED: full callLogs extraction to a top-level `callLogs` collection
   * (dual-write + cap embedded array). Keep arrayUnion until that migration.
   */
  async logCall(leadId: string, log: CallLog, status: string, followUpDate: string): Promise<void> {
    const leadDocRef = doc(leadsRef, leadId);
    const patch: Record<string, unknown> = {
      status,
      updatedAt: new Date().toISOString(),
      callLogs: arrayUnion(log) as any,
    };
    // Only touch followUpDate when a value is provided (empty string clears).
    if (followUpDate !== undefined && followUpDate !== null) {
      patch.followUpDate = followUpDate;
    }
    await updateDoc(leadDocRef, patch);
  },
  async rateCallLog(leadId: string, updatedLogs: CallLog[]): Promise<void> {
    await updateDoc(doc(leadsRef, leadId), {
      callLogs: updatedLogs as any,
      updatedAt: new Date().toISOString(),
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
  async archiveLeads(archivedList: { leadId: string; archivedLead: Lead & { archivedAt: string; archivedBy: string } }[]): Promise<void> {
    const batch = writeBatch(db);
    for (const { leadId, archivedLead } of archivedList) {
      batch.set(doc(archivedLeadsRef, leadId), archivedLead);
      batch.delete(doc(leadsRef, leadId));
    }
    await batch.commit();
  },
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

// 2. Users Repository
function stripPasswordField<T extends Record<string, unknown>>(data: T): T {
  if (!("password" in data)) return data;
  const { password: _pw, ...rest } = data;
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
};

// 3. Projects Repository
export const ProjectsRepository = {
  async add(project: Project): Promise<void> {
    await setDoc(doc(projectsRef, project.id), project);
  },
  async set(id: string, project: any): Promise<void> {
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
};

// 6. Rosters Repository
export const RostersRepository = {
  async set(weekId: string, roster: Roster): Promise<void> {
    await setDoc(doc(rostersRef, weekId), roster);
  },
};

// 7. Call Targets Repository
export const CallTargetsRepository = {
  async set(userId: string, target: CallTarget): Promise<void> {
    await setDoc(doc(callTargetsRef, userId), target);
  },
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
};

// 9. Smart Lists Repository
export const SmartListsRepository = {
  async add(list: SmartList): Promise<void> {
    await setDoc(doc(smartListsRef, list.id), list);
  },
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(smartListsRef, id));
  },
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
};

// 11. Attendance Repository
export const AttendanceRepository = {
  async add(record: AttendanceRecord): Promise<void> {
    await setDoc(doc(attendanceRef, record.id), record);
  },
  async update(id: string, updates: Partial<AttendanceRecord>): Promise<void> {
    await updateDoc(doc(attendanceRef, id), updates);
  },
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
};

// 13. Settings repositories
export const SettingsRepository = {
  async setGoals(goals: Goals): Promise<void> {
    await setDoc(doc(db, "settings", "goals"), goals);
  },
  async setEvents(events: any[]): Promise<void> {
    await setDoc(doc(db, "settings", "events"), { list: events });
  },
  async setCustomFields(fields: any[]): Promise<void> {
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
    await setDoc(doc(db, "settings", "branding"), {
      ...branding,
      updatedAt: new Date().toISOString(),
    });
  },
};

// 14. Audit Logs Repository
export const AuditLogsRepository = {
  async add(log: AuditLog): Promise<void> {
    await setDoc(doc(auditLogsRef, log.id), log);
  },
};

// 15. Agent Status Repository
export const AgentStatusRepository = {
  async set(userId: string, status: AgentStatusRecord): Promise<void> {
    await setDoc(doc(agentStatusRef, userId), status, { merge: true });
  },
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
};
