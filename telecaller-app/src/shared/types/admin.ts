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

export type DealStage =
  | "new_inquiry"
  | "site_visit_scheduled"
  | "site_visit_completed"
  | "token_paid"
  | "plot_reserved"
  | "agreement_signed"
  | "closed_won"
  | "closed_lost";

export interface DealStageConfig {
  id: DealStage;
  name: string;
  probability: number;
  color: string;
  badgeClass: string;
  barClass: string;
}

export interface Deal {
  id: string;
  title: string;
  leadId: string;
  leadName: string;
  phone: string;
  email?: string;
  projectId: string;
  projectName?: string;
  plotId?: string;
  plotNumber?: string;
  stage: DealStage;
  amount: number;
  expectedCloseDate?: string;
  assignedTo: string;
  assignedToName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface CreateDealPayload {
  title: string;
  leadId: string;
  leadName: string;
  phone: string;
  email?: string;
  projectId: string;
  projectName?: string;
  plotId?: string;
  plotNumber?: string;
  stage: DealStage;
  amount: number;
  expectedCloseDate?: string;
  assignedTo: string;
  assignedToName?: string;
  notes?: string;
}

export interface DealFilters {
  searchQuery: string;
  projectId: string;
  assignedTo: string;
  stage: string;
}

export interface DealMetrics {
  totalDeals: number;
  totalPipelineValue: number;
  weightedPipelineValue: number;
  closedWonValue: number;
  closedWonCount: number;
  winRate: number;
}

export const DEAL_STAGES: DealStageConfig[] = [
  {
    id: "new_inquiry",
    name: "New Inquiry",
    probability: 10,
    color: "violet",
    barClass: "bg-violet-500",
    badgeClass: "text-violet-600 dark:text-violet-300 bg-violet-500/10 border-violet-500/25",
  },
  {
    id: "site_visit_scheduled",
    name: "Site Visit Scheduled",
    probability: 30,
    color: "blue",
    barClass: "bg-blue-500",
    badgeClass: "text-blue-600 dark:text-blue-300 bg-blue-500/10 border-blue-500/25",
  },
  {
    id: "site_visit_completed",
    name: "Site Visit Done",
    probability: 50,
    color: "cyan",
    barClass: "bg-cyan-500",
    badgeClass: "text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 border-cyan-500/25",
  },
  {
    id: "token_paid",
    name: "Token Paid",
    probability: 70,
    color: "amber",
    barClass: "bg-amber-500",
    badgeClass: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/25",
  },
  {
    id: "plot_reserved",
    name: "Plot Reserved",
    probability: 85,
    color: "purple",
    barClass: "bg-purple-500",
    badgeClass: "text-purple-600 dark:text-purple-300 bg-purple-500/10 border-purple-500/25",
  },
  {
    id: "agreement_signed",
    name: "Agreement Signed",
    probability: 95,
    color: "indigo",
    barClass: "bg-indigo-500",
    badgeClass: "text-indigo-600 dark:text-indigo-300 bg-indigo-500/10 border-indigo-500/25",
  },
  {
    id: "closed_won",
    name: "Closed Won",
    probability: 100,
    color: "emerald",
    barClass: "bg-emerald-500",
    badgeClass: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
  },
  {
    id: "closed_lost",
    name: "Closed Lost",
    probability: 0,
    color: "rose",
    barClass: "bg-rose-500",
    badgeClass: "text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/25",
  },
];
