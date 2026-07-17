/** Semantic color-coded icons for navigation (light + dark). */

export const navIconColor = {
  dashboard: "text-sky-500 dark:text-sky-400",
  leads: "text-indigo-500 dark:text-indigo-400",
  calls: "text-emerald-500 dark:text-emerald-400",
  maps: "text-amber-500 dark:text-amber-400",
  attendance: "text-cyan-500 dark:text-cyan-400",
  training: "text-rose-500 dark:text-rose-400",
  profile: "text-blue-500 dark:text-blue-400",
  templates: "text-violet-500 dark:text-violet-400",
  shortcuts: "text-fuchsia-500 dark:text-fuchsia-400",
  fullscreen: "text-slate-500 dark:text-slate-400",
  admin: "text-purple-500 dark:text-purple-400",
  // Leads CRM children
  leadsOverview: "text-sky-500 dark:text-sky-400",
  leadsList: "text-indigo-500 dark:text-indigo-400",
  leadsForm: "text-teal-500 dark:text-teal-400",
  leadsKanban: "text-orange-500 dark:text-orange-400",
  leadsBin: "text-red-500 dark:text-red-400",
  // Calls children
  whatsapp: "text-green-500 dark:text-green-400",
  callHistory: "text-emerald-600 dark:text-emerald-300",
  // Maps children
  mapsOverview: "text-amber-500 dark:text-amber-400",
  mapsProject: "text-orange-500 dark:text-orange-400",
  // Admin subgroups
  projects: "text-blue-500 dark:text-blue-400",
  users: "text-indigo-500 dark:text-indigo-400",
  roster: "text-cyan-500 dark:text-cyan-400",
  analytics: "text-sky-500 dark:text-sky-400",
  targets: "text-amber-500 dark:text-amber-400",
  leaderboard: "text-yellow-500 dark:text-yellow-400",
  performance: "text-orange-500 dark:text-orange-400",
  quality: "text-lime-600 dark:text-lime-400",
  coaching: "text-amber-500 dark:text-amber-400",
  events: "text-pink-500 dark:text-pink-400",
  roles: "text-red-500 dark:text-red-400",
  customfields: "text-slate-500 dark:text-slate-400",
  merge: "text-orange-600 dark:text-orange-400",
  branding: "text-fuchsia-500 dark:text-fuchsia-400",
  integrations: "text-cyan-600 dark:text-cyan-400",
  audit: "text-rose-500 dark:text-rose-400",
} as const;

export type NavIconTone = keyof typeof navIconColor;

/** Shared desktop sidebar nav class helpers — keep item chrome consistent. */

export function sidebarNavItem(active: boolean, collapsed = false): string {
  return [
    "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] leading-none transition-colors duration-150",
    collapsed ? "justify-center" : "",
    active
      ? "bg-theme-accent-muted text-theme-accent font-semibold shadow-[inset_3px_0_0_0_#e8c84a]"
      : "text-theme-muted font-medium hover:text-theme-text hover:bg-theme-surface/70",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Parent row for collapsible groups (Leads / Calls / Maps / Control Panel). */
export function sidebarGroupRow(active: boolean, collapsed = false): string {
  return [
    "flex items-center rounded-lg text-[13px] leading-none transition-colors duration-150",
    collapsed ? "justify-center" : "",
    active
      ? "bg-theme-accent-muted text-theme-accent font-semibold shadow-[inset_3px_0_0_0_#e8c84a]"
      : "text-theme-muted font-medium hover:text-theme-text hover:bg-theme-surface/70",
  ]
    .filter(Boolean)
    .join(" ");
}

export function sidebarGroupLink(collapsed = false): string {
  return [
    "flex items-center gap-2.5 px-2.5 py-2 flex-1 min-w-0",
    collapsed ? "justify-center" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function sidebarGroupToggle(): string {
  return "inline-flex items-center justify-center px-2.5 py-2 shrink-0 cursor-pointer border-0 bg-transparent text-theme-muted hover:text-theme-text";
}

/** Child link — always pair with a 14px icon so text columns align. */
export function sidebarSubItem(active: boolean): string {
  return [
    "flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] leading-none transition-colors duration-150 min-h-8",
    active
      ? "bg-theme-accent-muted text-theme-accent font-semibold"
      : "text-theme-muted font-medium hover:text-theme-text hover:bg-theme-surface/70",
  ].join(" ");
}

export function sidebarSubTree(): string {
  return "ml-3.5 mt-1 space-y-0.5 border-l border-theme-border/80 pl-2 animate-fadeIn";
}

export function sidebarCategoryClass(isFirst = false): string {
  return [
    "px-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-theme-muted/80 select-none",
    isFirst ? "pt-1 pb-2" : "pt-5 pb-2",
  ].join(" ");
}

export function sidebarIcon(tone: NavIconTone): string {
  return `w-4 h-4 shrink-0 ${navIconColor[tone]}`;
}

export function sidebarSubIcon(tone: NavIconTone): string {
  return `w-3.5 h-3.5 shrink-0 ${navIconColor[tone]}`;
}

export const sidebarChevronClass =
  "w-3.5 h-3.5 shrink-0 text-theme-muted/80 transition-transform duration-200";
