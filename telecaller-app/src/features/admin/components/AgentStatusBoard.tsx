import { Users } from "lucide-react";
import { User, Lead } from "@/shared/types";

interface AgentStatusBoardProps {
  users: User[];
  leads: Lead[];
  targets: Record<string, any>;
  agentStatuses: Record<string, any>;
  checkIsManagerial: (role: string) => boolean;
}

export default function AgentStatusBoard({
  users,
  leads,
  targets,
  agentStatuses,
  checkIsManagerial,
}: AgentStatusBoardProps) {
  return (
    <div className="bg-theme-card rounded-xl shadow-sm border border-theme-border p-5 transition-colors">
      <h3 className="text-sm font-bold text-theme-text uppercase tracking-wider mb-4 flex items-center">
        <Users className="w-4 h-4 mr-2 text-indigo-500" />
        Agent Real-time Status Board
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
        {users
          .filter((u) => !checkIsManagerial(u.role))
          .map((tc) => {
            const statusData = agentStatuses[tc.id] || { status: "offline" };
            const status = statusData.status || "offline";

            let statusColor = "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
            let dotColor = "bg-gray-400";
            if (status === "available") {
              statusColor = "bg-green-100 text-green-800 dark:bg-green-955/40 dark:text-green-400";
              dotColor = "bg-green-500";
            } else if (status === "on-call") {
              statusColor = "bg-blue-100 text-blue-800 dark:bg-blue-955/40 dark:text-blue-400";
              dotColor = "bg-blue-500";
            } else if (status === "break") {
              statusColor = "bg-yellow-100 text-yellow-800 dark:bg-yellow-955/40 dark:text-yellow-400";
              dotColor = "bg-yellow-500";
            }

            const target = targets[tc.id]?.targetCount || 50;
            const agentCallsCount = leads
              .filter((l) => l.assignedTo === tc.id)
              .reduce((acc, lead) => {
                const agentLogs = (lead.callLogs || []).filter((log: any) => log.agent === tc.username);
                return acc + agentLogs.length;
              }, 0);

            return (
              <div
                key={tc.id}
                className="bg-gray-55 dark:bg-gray-900/50 rounded-xl p-3 border dark:border-gray-800 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800 dark:text-white text-xs">
                    {tc.username} <span className="text-[10px] text-gray-400 font-normal">({tc.role})</span>
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center ${statusColor}`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColor} animate-pulse`}></span>
                    {status}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase">
                    <span>Call Target</span>
                    <span>
                      {agentCallsCount} / {target}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-800 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div
                      className="bg-theme-accent dark:bg-indigo-400 h-full transition-all duration-500"
                      style={{
                        width: `${Math.min((agentCallsCount / target) * 100, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        {users.filter((u) => !checkIsManagerial(u.role)).length === 0 && (
          <div className="col-span-2 text-center text-gray-400 italic py-6">No agents configured yet.</div>
        )}
      </div>
    </div>
  );
}
