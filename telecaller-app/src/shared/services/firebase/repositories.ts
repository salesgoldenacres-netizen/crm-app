/**
 * Modular Barrel Export for Firebase Repositories.
 * Decomposed from monolithic repositories.ts into domain-scoped modules under ./domain/.
 */
export { doc, writeBatch, serverTimestamp, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

export { LeadRepository, LeadsRepository } from "./domain/leadRepository";
export {
  UsersRepository,
  CustomRolesRepository,
  TeamsRepository,
  RostersRepository,
} from "./domain/userRepository";
export { ProjectsRepository } from "./domain/projectRepository";
export { DealsRepository } from "./domain/dealRepository";
export { TasksRepository, SmartListsRepository } from "./domain/taskRepository";
export {
  AgentProductivityRepository,
  AttendanceRepository,
  LeaveRequestsRepository,
  CallTargetsRepository,
  AgentStatusRepository,
} from "./domain/productivityRepository";
export {
  SettingsRepository,
  ThemesRepository,
  DashboardPreferencesRepository,
} from "./domain/settingsRepository";
export {
  AuditLogsRepository,
  NotificationsRepository,
  IvrCallsRepository,
  TimelineEventsRepository,
  WhatsAppMessagesRepository,
  WhatsAppConversationsRepository,
} from "./domain/communicationRepository";
