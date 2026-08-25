export type CalendarEventType =
  | "callback"
  | "site_visit"
  | "token_expiry"
  | "deal_closing";

export type CalendarViewMode = "month" | "week" | "day" | "agenda";

export interface CalendarEvent {
  id: string;
  title: string;
  leadId: string;
  leadName: string;
  phone: string;
  email?: string;
  type: CalendarEventType;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  status?: string;
  priority?: "hot" | "warm" | "cold";
  projectId?: string;
  projectName?: string;
  plotNumber?: string;
  assignedTo?: string;
  notes?: string;
  amount?: number; // In INR (₹)
}

export interface CalendarEventTypeConfig {
  type: CalendarEventType;
  label: string;
  badgeClass: string;
  dotClass: string;
  borderClass: string;
}

export const CALENDAR_EVENT_TYPES: CalendarEventTypeConfig[] = [
  {
    type: "callback",
    label: "Callback Follow-up",
    badgeClass: "text-blue-600 dark:text-blue-300 bg-blue-500/10 border-blue-500/25",
    dotClass: "bg-blue-500",
    borderClass: "border-l-blue-500",
  },
  {
    type: "site_visit",
    label: "Site Visit Scheduled",
    badgeClass: "text-purple-600 dark:text-purple-300 bg-purple-500/10 border-purple-500/25",
    dotClass: "bg-purple-500",
    borderClass: "border-l-purple-500",
  },
  {
    type: "token_expiry",
    label: "Token Expiry",
    badgeClass: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/25",
    dotClass: "bg-amber-500",
    borderClass: "border-l-amber-500",
  },
  {
    type: "deal_closing",
    label: "Deal Expected Close",
    badgeClass: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
    dotClass: "bg-emerald-500",
    borderClass: "border-l-emerald-500",
  },
];
