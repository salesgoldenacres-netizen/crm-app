import type { LucideIcon } from "lucide-react";
import {
  Map as MapIcon,
  Users,
  Calendar,
  TrendingUp,
  Trophy,
  Award,
  Star,
  BookOpen,
  Lightbulb,
  Gift,
  ShieldCheck,
  SlidersHorizontal,
  AlertTriangle,
  Paintbrush,
  Webhook,
  Activity,
  BarChart3,
  Clock,
  FolderOpen,
} from "lucide-react";
import type { NavIconTone } from "@/shared/components/sidebar/sidebarNavStyles";

/**
 * Wave 10 Agent 2 — canonical navigation label map.
 * Use these strings everywhere a primary destination is labeled
 * (sidebar, bottom nav, mobile drawer, profile drawer, admin chrome).
 */
export const NAV_LABELS = {
  dashboard: "Dashboard",
  crm: "CRM",
  leads: "Leads",
  calls: "Calls",
  maps: "Maps",
  attendance: "Attendance",
  training: "Training",
  profile: "My Profile",
  templates: "Templates",
  shortcuts: "Shortcuts",
  fullScreen: "Full Screen",
  admin: "Admin",
  account: "Account",
  workspace: "Workspace",
} as const;

export type NavLabelKey = keyof typeof NAV_LABELS;

/** Admin console destinations — single source for Admin page + Operations Desk sidebar. */
export type AdminNavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  tone: NavIconTone;
};

export type AdminNavGroup = {
  title: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    title: "Operations & CRM",
    items: [
      { id: "projects", label: "Manage Projects", icon: MapIcon, tone: "projects" },
      { id: "leads", label: "Manage Leads", icon: FolderOpen, tone: "leads" },
      { id: "users", label: "Telecallers & Teams", icon: Users, tone: "users" },
      { id: "roster", label: "Shift Planner", icon: Clock, tone: "roster" },
      { id: "analytics", label: "Analytics & ROI", icon: BarChart3, tone: "analytics" },
    ],
  },
  {
    title: "Performance & HR",
    items: [
      { id: "attendance", label: "Attendance & Leaves", icon: Calendar, tone: "attendance" },
      { id: "targets", label: "Targets & Goals", icon: TrendingUp, tone: "targets" },
      { id: "leaderboard", label: "Leaderboard", icon: Trophy, tone: "leaderboard" },
      { id: "performance", label: "Agent Performance", icon: Award, tone: "performance" },
      { id: "quality", label: "Call Quality Score", icon: Star, tone: "quality" },
    ],
  },
  {
    title: "Training & Coaching",
    items: [
      { id: "training", label: "Training Content", icon: BookOpen, tone: "training" },
      { id: "coaching", label: "Coaching Tip Editor", icon: Lightbulb, tone: "coaching" },
      { id: "events", label: "Client Events Manager", icon: Gift, tone: "events" },
    ],
  },
  {
    title: "System Settings",
    items: [
      { id: "roles", label: "Roles & Permissions", icon: ShieldCheck, tone: "roles" },
      { id: "customfields", label: "Custom Fields", icon: SlidersHorizontal, tone: "customfields" },
      { id: "merge", label: "Duplicate Merge", icon: AlertTriangle, tone: "merge" },
      { id: "branding", label: "Theme & Branding", icon: Paintbrush, tone: "branding" },
      { id: "integrations", label: "Ad Integrations", icon: Webhook, tone: "integrations" },
      { id: "audit", label: "System Audit Logs", icon: Activity, tone: "audit" },
    ],
  },
];

/** Flat lookup for sidebar admin links. */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap((g) => g.items);

export function getAdminNavItem(id: string): AdminNavItem | undefined {
  return ADMIN_NAV_ITEMS.find((item) => item.id === id);
}
