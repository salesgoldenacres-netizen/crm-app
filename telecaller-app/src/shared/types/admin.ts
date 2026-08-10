export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  user: string;
  changes?: Record<string, unknown> | null;
}

export interface Branding {
  [key: string]: string | number | boolean | SavedTheme[] | undefined;
  companyName: string;
  logoUrl: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  sidebarColor: string;
  headerColor: string;
  backgroundColor: string;
  surfaceColor: string;
  cardBackground: string;
  borderColor: string;
  ringColor: string;
  textPrimary: string;
  textSecondary: string;
  /** Dark appearance surfaces — fully controllable from Branding Customizer. */
  darkBackgroundColor: string;
  darkSurfaceColor: string;
  darkCardBackground: string;
  darkBorderColor: string;
  darkRingColor: string;
  darkTextPrimary: string;
  darkTextSecondary: string;
  darkSidebarColor: string;
  darkHeaderColor: string;
  successColor: string;
  warningColor: string;
  dangerColor: string;
  infoColor: string;
  typography: string;
  fontSize: number;
  borderRadius: number;
  shadowIntensity: number;
  roundedCards: boolean;
  glassmorphism: boolean;
  compactMode: boolean;
  darkSidebar: boolean;
  stickyHeader: boolean;
  animations: boolean;
  customCss: string;
  savedThemes?: SavedTheme[];
  /** Stamped on publish/migrate so legacy indigo remap runs only once. */
  brandPaletteVersion?: number;
}

export interface SavedTheme extends Partial<Omit<Branding, "savedThemes">> {
  id: string;
  name: string;
}

export interface CallTarget {
  userId: string;
  targetCount: number;
  bookingTargetCount: number;
  updatedAt?: string;
}

export interface CustomField {
  name: string;
  label: string;
  type: string;
  options?: string[];
  required?: boolean;
}

export interface EventLog {
  id: string;
  title?: string;
  name?: string;
  date: string;
  type: string;
  time?: string;
  description?: string;
}

export interface Goals {
  monthlyCallGoal: number;
  monthlyBookingGoal: number;
  customGoalText: string;
  targetRevenue: number;
  updatedAt?: string;
}

export interface Roster {
  weekId: string;
  schedule: Record<string, string>;
  updatedAt?: string;
}

export interface SmartList {
  id: string;
  userId?: string;
  name: string;
  filters: Record<string, unknown>;
  createdAt?: string;
}

export interface TaskItem {
  id: string;
  userId: string;
  text: string;
  done: boolean;
  createdAt?: string;
  /** Optional — populate only when auto-tasks are authorized (Wave 6 contract). */
  leadId?: string;
  dueAt?: string;
  source?: string;
  type?: string;
}

export interface TrainingDocument {
  id: string;
  title: string;
  url: string;
}

export interface TrainingVideo {
  id: string;
  title: string;
  url: string;
}

export interface TrainingObjection {
  id: string;
  title: string;
  content: string[];
}

export interface TrainingData {
  documents: TrainingDocument[];
  videos: TrainingVideo[];
  objections: TrainingObjection[];
}

export interface DailyProductivity {
  /** Canonical owner id (Firestore users doc id). */
  userId: string;
  /** Alias written by server triggers for back-compat; prefer userId. */
  agentId?: string;
  agentName?: string;
  date: string;
  totalCalls: number;
  totalTalkTimeSeconds: number;
  lastActiveTime: string | null;
  idleWarning: boolean;
  bookedCount: number;
  interestedCount: number;
  updatedAt?: string;
  createdAt?: string;
}

export interface NotificationItem {
  id: string;
  userId?: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  /** Optional deep-link context (Wave 6 notification helper). */
  leadId?: string;
}
