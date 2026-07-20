/**
 * @deprecated Wave 3 — not mounted on LeadsWorkspace.
 * Canonical work queues: `LeadListPresetStrip`. Emoji + rainbow borders removed so
 * remounts do not violate Emoji Policy / Command Surface Contract.
 */
import {
  UserCheck,
  Inbox,
  TrendingUp,
  AlertCircle,
  Calendar,
  Clock,
  ArrowLeftRight,
  PhoneCall,
  Tag,
  CheckSquare,
  CheckCircle,
  X,
} from "lucide-react";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring";

interface TabItem {
  id: string;
  name: string;
  count: number;
  icon: React.ReactNode;
}

interface QuickAccessStatusTabsProps {
  leadStatusFilter: string;
  setLeadStatusFilter: (filter: string) => void;
  counts: {
    totalAssigned: number;
    rawCount: number;
    hotCount: number;
    overdueCount: number;
    followupsToday: number;
    newCount: number;
    notAttemptedCount: number;
    reEngagedCount: number;
    contactedCount: number;
    interestedCount: number;
    siteVisitCompletedCount: number;
    siteVisitConfirmed: number;
    bookedCount: number;
    notInterestedCount: number;
  };
}

/** @deprecated Prefer `LeadListPresetStrip` on LeadsWorkspace. */
export default function QuickAccessStatusTabs({
  leadStatusFilter,
  setLeadStatusFilter,
  counts,
}: QuickAccessStatusTabsProps) {
  const {
    totalAssigned,
    rawCount,
    hotCount,
    overdueCount,
    followupsToday,
    newCount,
    notAttemptedCount,
    reEngagedCount,
    contactedCount,
    interestedCount,
    siteVisitCompletedCount,
    siteVisitConfirmed,
    bookedCount,
    notInterestedCount,
  } = counts;

  const tabs: TabItem[] = [
    { id: "all", name: "All Leads", count: totalAssigned, icon: <UserCheck className="w-4 h-4" /> },
    { id: "raw", name: "Raw Inbox", count: rawCount, icon: <Inbox className="w-4 h-4" /> },
    { id: "hot", name: "Hot", count: hotCount, icon: <TrendingUp className="w-4 h-4" /> },
    { id: "overdue", name: "Overdue", count: overdueCount, icon: <AlertCircle className="w-4 h-4" /> },
    { id: "today", name: "Today", count: followupsToday, icon: <Calendar className="w-4 h-4" /> },
    { id: "new", name: "New", count: newCount, icon: <Clock className="w-4 h-4" /> },
    {
      id: "not-attempted",
      name: "Not Attempted",
      count: notAttemptedCount,
      icon: <AlertCircle className="w-4 h-4" />,
    },
    {
      id: "re-engaged",
      name: "Re Engaged",
      count: reEngagedCount,
      icon: <ArrowLeftRight className="w-4 h-4" />,
    },
    { id: "contacted", name: "Contacted", count: contactedCount, icon: <PhoneCall className="w-4 h-4" /> },
    { id: "interested", name: "Interested", count: interestedCount, icon: <Tag className="w-4 h-4" /> },
    {
      id: "site-visit-completed",
      name: "Site Visit Completed",
      count: siteVisitCompletedCount,
      icon: <CheckSquare className="w-4 h-4" />,
    },
    {
      id: "site-visit-confirmed",
      name: "Site Visit Confirmed",
      count: siteVisitConfirmed,
      icon: <UserCheck className="w-4 h-4" />,
    },
    {
      id: "booked",
      name: "Booked & Reserved",
      count: bookedCount,
      icon: <CheckCircle className="w-4 h-4" />,
    },
    {
      id: "not-interested",
      name: "Not Interested",
      count: notInterestedCount,
      icon: <X className="w-4 h-4" />,
    },
  ];

  return (
    <div className="relative border-b border-theme-border bg-theme-surface">
      <nav
        className="-mb-px flex space-x-4 overflow-x-auto pb-1 scrollbar-none px-4"
        aria-label="Status shortcuts"
      >
        {tabs.map((tab) => {
          const isActive = leadStatusFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setLeadStatusFilter(tab.id)}
              className={`whitespace-nowrap min-h-11 px-1.5 border-b-2 font-semibold text-sm inline-flex items-center gap-2 transition-colors cursor-pointer bg-transparent ${FOCUS_RING} ${
                isActive
                  ? "border-theme-accent text-theme-accent"
                  : "border-transparent text-theme-muted hover:text-theme-text hover:border-theme-border"
              }`}
            >
              <span className="text-theme-muted" aria-hidden>
                {tab.icon}
              </span>
              <span>{tab.name}</span>
              <span
                className={`ml-0.5 py-0.5 px-1.5 rounded-theme text-[10px] font-semibold tabular-nums ${
                  isActive
                    ? "bg-theme-accent-muted text-theme-accent"
                    : "bg-theme-card text-theme-muted border border-theme-border"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
