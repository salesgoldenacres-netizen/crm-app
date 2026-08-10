import {
  FirestoreDataConverter,
  DocumentData,
  QueryDocumentSnapshot,
  collection,
  CollectionReference,
} from "firebase/firestore";
import { db } from "../firebase";
import { COLLECTIONS } from "@/shared/constants";
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
  SmartList,
  TaskItem,
  LeaveRequest,
  Team,
  DeletedUserRecord,
  AgentStatusRecord,
  NotificationItem,
  CallLogDocument,
} from "@/shared/types";
import {
  deserializeProjectPlotsForApp,
  serializeProjectForFirestore,
} from "./projectFirestore";

export {
  deserializePlotPointsForApp,
  deserializeProjectPlotsForApp,
  serializePlotPointsForFirestore,
  serializeProjectForFirestore,
} from "./projectFirestore";

// Generic Firestore Data Converter
export const genericConverter = <T extends object>(): FirestoreDataConverter<T> => ({
  toFirestore(model: T): DocumentData {
    const data = { ...model } as Record<string, unknown>;
    delete data.id;
    return data as DocumentData;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): T {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      ...data,
    } as unknown as T;
  },
});

/** Project converter: encodes nested coordinate arrays before setDoc. */
export const projectConverter: FirestoreDataConverter<Project> = {
  toFirestore(model: Project): DocumentData {
    return serializeProjectForFirestore(model);
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Project {
    const data = snapshot.data();
    return deserializeProjectPlotsForApp({
      id: snapshot.id,
      ...data,
    } as Project);
  },
};

// Helper function to get typed collections
export const getCollectionRef = <T extends object>(
  collectionName: string
): CollectionReference<T> => {
  return collection(db, collectionName).withConverter(genericConverter<T>());
};

// Strongly typed Collection References
export const leadsRef = getCollectionRef<Lead>(COLLECTIONS.LEADS);
export const callLogsRef = getCollectionRef<CallLogDocument>(COLLECTIONS.CALL_LOGS);
export const archivedLeadsRef = getCollectionRef<Lead>(COLLECTIONS.ARCHIVED_LEADS);
export const usersRef = getCollectionRef<User>(COLLECTIONS.USERS);
export const customRolesRef = getCollectionRef<CustomRole>(COLLECTIONS.CUSTOM_ROLES);
export const projectsRef = collection(db, COLLECTIONS.PROJECTS).withConverter(projectConverter);
export const rostersRef = getCollectionRef<Roster>(COLLECTIONS.ROSTERS);
export const callTargetsRef = getCollectionRef<CallTarget>(COLLECTIONS.CALL_TARGETS);
export const auditLogsRef = getCollectionRef<AuditLog>(COLLECTIONS.AUDIT_LOGS);
export const agentProductivityRef = getCollectionRef<DailyProductivity>(COLLECTIONS.AGENT_PRODUCTIVITY);
export const attendanceRef = getCollectionRef<AttendanceRecord>(COLLECTIONS.ATTENDANCE);
export const leaveRequestsRef = getCollectionRef<LeaveRequest>(COLLECTIONS.LEAVE_REQUESTS);
export const tasksRef = getCollectionRef<TaskItem>(COLLECTIONS.TASKS);
export const teamsRef = getCollectionRef<Team>(COLLECTIONS.TEAMS);
export const smartListsRef = getCollectionRef<SmartList>(COLLECTIONS.SMART_LISTS);
export const deletedUsersRef = getCollectionRef<DeletedUserRecord>(COLLECTIONS.DELETED_USERS);
export const agentStatusRef = getCollectionRef<AgentStatusRecord>(COLLECTIONS.AGENT_STATUS);
export const notificationsRef = getCollectionRef<NotificationItem>(COLLECTIONS.NOTIFICATIONS);
