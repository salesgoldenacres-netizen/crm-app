import {
  Award,
  User as UserIcon,
  Share2,
  Shield,
  Layout,
  Flame,
  Hand,
  Phone,
  Swords,
  Map,
  Trophy,
  Crown,
  Gem,
  type LucideIcon,
} from "lucide-react";
import { User } from "@/shared/types";
import { useToast } from "@/shared/components/Toast";
import Badge from "@/shared/components/ui/Badge";
import Button from "@/shared/components/ui/Button";
import { NAV_LABELS } from "@/shared/constants/navTaxonomy";

interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  target: number;
}

interface AgentStats {
  totalCallsCount: number;
  siteVisitsCount: number;
  streak: number;
  badges: AchievementBadge[];
}

interface AgentProfileViewProps {
  user: User;
  agentStats: AgentStats;
}

const BADGE_ICONS: Record<string, LucideIcon> = {
  welcome: Hand,
  dialer_pro: Phone,
  phone_warrior: Swords,
  visit_master: Map,
  first_booking: Trophy,
  top_closer: Crown,
  rejection_warrior: Shield,
  elite_agent: Gem,
};

const BADGE_TONES: Record<string, string> = {
  welcome:
    "bg-theme-success/10 border-theme-success/20 text-theme-success",
  first_booking:
    "bg-theme-warning/10 border-theme-warning/20 text-theme-warning",
  top_closer:
    "bg-theme-accent-muted border-theme-border text-theme-accent",
  dialer_pro:
    "bg-sky-50 border-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
  phone_warrior:
    "bg-theme-warning/10 border-theme-warning/20 text-theme-warning",
  visit_master:
    "bg-theme-success/10 border-theme-success/20 text-theme-success",
  rejection_warrior:
    "bg-theme-danger/10 border-theme-danger/20 text-theme-danger",
  elite_agent:
    "bg-sky-50 border-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
};

const TOGGLE_TRACK =
  "w-11 h-6 bg-theme-surface peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-theme-ring rounded-full peer dark:bg-theme-surface peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-theme-card after:border-theme-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-accent relative";

export default function AgentProfileView({ user, agentStats }: AgentProfileViewProps) {
  const { toast } = useToast();
  const onCopyProfileLink = () => {
    navigator.clipboard.writeText(`https://goldenacres.app/agent/${user.username}`);
    toast("Profile link copied to clipboard!", "success");
  };

  const unlockedCount = agentStats.badges.filter((b) => b.unlocked).length;

  return (
    <div className="w-full max-w-full mx-auto px-3 sm:px-6 lg:px-12 py-5 sm:py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="type-page-title text-theme-text flex items-center">
            <Award className="w-6 h-6 mr-3 text-theme-warning" aria-hidden="true" />
            {NAV_LABELS.profile}
          </h2>
          <p className="type-secondary text-theme-muted mt-1">
            Track your performance and unlock new skill badges.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-theme-card rounded-theme shadow-elevation-sm border border-theme-border p-6 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-theme-accent-muted rounded-full flex items-center justify-center mb-4 border-4 border-theme-border">
              <UserIcon className="w-12 h-12 text-theme-accent" aria-hidden="true" />
            </div>
            <h3 className="type-card-title text-theme-text">{user.username}</h3>
            <Badge variant="primary" className="mt-2">
              {user.role}
            </Badge>

            <div className="w-full mt-6 space-y-3 text-sm text-left">
              <div className="flex justify-between border-b border-theme-border pb-2">
                <span className="text-theme-muted">Total Calls Logged</span>
                <span className="font-semibold text-theme-text tabular-nums">
                  {agentStats.totalCallsCount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-b border-theme-border pb-2">
                <span className="text-theme-muted">Site Visits Secured</span>
                <span className="font-semibold text-theme-text tabular-nums">
                  {agentStats.siteVisitsCount}
                </span>
              </div>
              <div className="flex justify-between pb-2 items-center">
                <span className="text-theme-muted">Current Streak</span>
                <span className="inline-flex items-center gap-1 font-semibold text-theme-warning tabular-nums">
                  <Flame className="w-3.5 h-3.5" aria-hidden="true" />
                  {agentStats.streak} {agentStats.streak === 1 ? "Day" : "Days"}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="mt-6 w-full"
              onClick={onCopyProfileLink}
              aria-label="Copy my profile link"
            >
              <Share2 className="w-4 h-4 mr-2" aria-hidden="true" />
              Copy My Profile Link
            </Button>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-theme-card rounded-theme shadow-elevation-sm border border-theme-border p-6">
            <div className="flex justify-between items-center mb-6 gap-3 flex-wrap">
              <h3 className="type-card-title text-theme-text flex items-center">
                <Shield className="w-5 h-5 mr-2 text-theme-accent" aria-hidden="true" />
                Achievements & Skill Badges
              </h3>
              <Badge variant="primary">
                {unlockedCount} / {agentStats.badges.length} Unlocked
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {agentStats.badges.map((badge) => {
                const pct = Math.min(Math.round((badge.progress / badge.target) * 100), 100);
                const Icon = BADGE_ICONS[badge.id] ?? Award;
                const styleClass = badge.unlocked
                  ? BADGE_TONES[badge.id] ||
                    "bg-theme-accent-muted border-theme-border text-theme-accent"
                  : "bg-theme-surface/40 border-theme-border text-theme-muted";

                return (
                  <div
                    key={badge.id}
                    className={`relative flex flex-col justify-between p-4 border rounded-theme text-center ${styleClass} ${
                      !badge.unlocked ? "opacity-70" : ""
                    }`}
                  >
                    <div className="relative mb-3 flex justify-center">
                      <span
                        className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-theme-card/60 border border-theme-border ${
                          !badge.unlocked ? "opacity-40 grayscale" : ""
                        }`}
                      >
                        <Icon className="w-6 h-6" aria-hidden="true" />
                      </span>
                      {!badge.unlocked && (
                        <span className="absolute top-0 right-[25%] bg-theme-surface p-0.5 rounded-full border border-theme-border">
                          <Shield className="w-3 h-3 text-theme-muted" aria-hidden="true" />
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span
                        className={`text-xs font-semibold block ${
                          badge.unlocked ? "text-theme-text" : "text-theme-muted"
                        }`}
                      >
                        {badge.name}
                      </span>
                      <span className="text-[9px] text-theme-muted block leading-3 min-h-[24px]">
                        {badge.description}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-theme-border/50">
                      {badge.unlocked ? (
                        <Badge variant="success" className="text-[9px]">
                          Unlocked
                        </Badge>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] font-semibold text-theme-muted">
                            <span>Progress</span>
                            <span className="tabular-nums">
                              {badge.progress.toLocaleString()} / {badge.target.toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full bg-theme-surface rounded-full h-1 overflow-hidden">
                            <div
                              className="bg-theme-accent h-1 transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-theme-card rounded-theme shadow-elevation-sm border border-theme-border p-6">
            <h3 className="type-card-title text-theme-text flex items-center border-b border-theme-border pb-3 mb-4">
              <Layout className="w-5 h-5 mr-2 text-theme-accent" aria-hidden="true" />
              Dashboard Preferences
            </h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer gap-3">
                <span className="text-sm font-medium text-theme-text">Show Funnel Chart</span>
                <input
                  type="checkbox"
                  className="sr-only peer"
                  defaultChecked
                  aria-label="Show Funnel Chart"
                />
                <div aria-hidden="true" className={TOGGLE_TRACK} />
              </label>
              <label className="flex items-center justify-between cursor-pointer gap-3">
                <span className="text-sm font-medium text-theme-text">Show Leaderboard</span>
                <input
                  type="checkbox"
                  className="sr-only peer"
                  defaultChecked
                  aria-label="Show Leaderboard"
                />
                <div aria-hidden="true" className={TOGGLE_TRACK} />
              </label>
              <label className="flex items-center justify-between cursor-pointer gap-3">
                <span className="text-sm font-medium text-theme-text">Show Today&apos;s Events</span>
                <input
                  type="checkbox"
                  className="sr-only peer"
                  defaultChecked
                  aria-label="Show Today's Events"
                />
                <div aria-hidden="true" className={TOGGLE_TRACK} />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
