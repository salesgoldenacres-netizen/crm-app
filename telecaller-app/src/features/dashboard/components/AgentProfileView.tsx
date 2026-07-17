import { Award, User as UserIcon, Share2, Shield, Layout } from "lucide-react";
import { User } from "@/shared/types";

interface Badge {
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
  badges: Badge[];
}

interface AgentProfileViewProps {
  user: User;
  agentStats: AgentStats;
}

export default function AgentProfileView({ user, agentStats }: AgentProfileViewProps) {
  const onCopyProfileLink = () => {
    navigator.clipboard.writeText(`https://goldenacres.app/agent/${user.username}`);
    alert("Profile link copied to clipboard!");
  };

  return (
    <div className="w-full max-w-full mx-auto px-3 sm:px-6 lg:px-12 py-5 sm:py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-950 dark:text-white flex items-center">
            <Award className="w-6 h-6 mr-3 text-yellow-500" />
            My Profile & Achievements
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Track your performance and unlock new skill badges.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          {/* Agent ID Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mb-4 border-4 border-indigo-50 dark:border-indigo-950">
              <UserIcon className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="font-bold text-xl text-gray-900 dark:text-white">{user.username}</h3>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mt-1">
              {user.role}
            </span>

            <div className="w-full mt-6 space-y-3 text-sm text-left">
              <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                <span className="text-gray-500">Total Calls Logged</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  {agentStats.totalCallsCount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                <span className="text-gray-500">Site Visits Secured</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  {agentStats.siteVisitsCount}
                </span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-gray-500">Current Streak</span>
                <span className="font-bold text-orange-600 dark:text-orange-400">
                  🔥 {agentStats.streak} {agentStats.streak === 1 ? "Day" : "Days"}
                </span>
              </div>
            </div>

            <button
              onClick={onCopyProfileLink}
              className="mt-6 w-full py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-bold transition-colors flex items-center justify-center border border-indigo-200 dark:border-indigo-800"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Copy My Profile Link
            </button>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          {/* Achievements & Badges */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                <Shield className="w-5 h-5 mr-2 text-indigo-500" />
                Achievements & Skill Badges
              </h3>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/40">
                {agentStats.badges.filter((b) => b.unlocked).length} / {agentStats.badges.length}{" "}
                Unlocked
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {agentStats.badges.map((badge) => {
                const pct = Math.min(Math.round((badge.progress / badge.target) * 100), 100);

                const colorMap: Record<string, string> = {
                  welcome:
                    "bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400",
                  first_booking:
                    "bg-yellow-50/80 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800 text-yellow-800 dark:text-yellow-400",
                  top_closer:
                    "bg-purple-50/80 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800 text-purple-800 dark:text-purple-400",
                  dialer_pro:
                    "bg-blue-50/80 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800 text-blue-800 dark:text-blue-400",
                  phone_warrior:
                    "bg-orange-50/80 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800 text-orange-800 dark:text-orange-400",
                  visit_master:
                    "bg-teal-50/80 border-teal-200 dark:bg-teal-950/20 dark:border-teal-800 text-teal-800 dark:text-teal-400",
                  rejection_warrior:
                    "bg-rose-50/80 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800 text-rose-800 dark:text-rose-400",
                  elite_agent:
                    "bg-sky-50/80 border-sky-200 dark:bg-sky-950/20 dark:border-sky-800 text-sky-800 dark:text-sky-400",
                };

                const styleClass = badge.unlocked
                  ? colorMap[badge.id] ||
                    "bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-900/20"
                  : "bg-gray-50/30 border-gray-200 dark:bg-gray-800/40 dark:border-gray-700/80 text-gray-400 dark:text-gray-500";

                return (
                  <div
                    key={badge.id}
                    className={`relative flex flex-col justify-between p-4 border rounded-xl text-center transition-all duration-300 hover:shadow-md ${styleClass} ${
                      !badge.unlocked
                        ? "opacity-70"
                        : "shadow-sm transform hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="relative mb-3 flex justify-center">
                      <span
                        className={`text-4xl filter ${!badge.unlocked ? "grayscale opacity-40" : ""}`}
                      >
                        {badge.icon}
                      </span>
                      {!badge.unlocked && (
                        <span className="absolute top-0 right-[25%] bg-gray-200 dark:bg-gray-700 p-0.5 rounded-full border border-white dark:border-gray-800">
                          <Shield className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span
                        className={`text-xs font-bold block ${
                          badge.unlocked ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {badge.name}
                      </span>
                      <span className="text-[9px] text-gray-500 dark:text-gray-400 block leading-3 min-h-[24px]">
                        {badge.description}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100/50 dark:border-gray-700/30">
                      {badge.unlocked ? (
                        <span className="inline-flex items-center text-[9px] font-bold bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                          Unlocked
                        </span>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] font-semibold text-gray-500 dark:text-gray-400">
                            <span>Progress</span>
                            <span>
                              {badge.progress.toLocaleString()} / {badge.target.toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 overflow-hidden">
                            <div
                              className="bg-indigo-500 h-1 transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
              <Layout className="w-5 h-5 mr-2 text-indigo-500" />
              Dashboard Preferences
            </h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Show Funnel Chart
                </span>
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600 relative"></div>
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Show Leaderboard
                </span>
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600 relative"></div>
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Show Today's Events
                </span>
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600 relative"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
