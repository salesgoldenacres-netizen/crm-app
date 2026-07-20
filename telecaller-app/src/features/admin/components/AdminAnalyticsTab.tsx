import AdminDashboard from "@/features/admin/pages/AdminDashboard";
import { useCallTargetStore } from "@/features/admin/hooks/adminStores";
import { useAgentStatusStore } from "@/features/employees/hooks/useAgentStatusStore";
import { User, Project } from "@/shared/types";
import AggregateUnavailable from "./AggregateUnavailable";
import AgentStatusBoard from "./AgentStatusBoard";

interface AdminAnalyticsTabProps {
  user: User;
  users: User[];
  projects: Record<string, Project>;
  isManagerial: (role: string) => boolean;
}

export default function AdminAnalyticsTab({
  user,
  users,
  projects: _projects,
  isManagerial: checkIsManagerial,
}: AdminAnalyticsTabProps) {
  const { targets } = useCallTargetStore();
  const { agentStatuses } = useAgentStatusStore();

  return (
    <div className="space-y-6 animate-fadeIn text-sm">
      <AdminDashboard user={user} />

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-theme-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-theme-surface text-[10px] font-bold uppercase tracking-widest text-theme-muted">
            Advanced Analytics & Reports
          </span>
        </div>
      </div>

      {/* Tier 2 — no empty-store lead scans */}
      <AggregateUnavailable
        title="Custom date-range reports unavailable here"
        detail="Date-range outcomes require summary documents / Reports — not a global leads array."
      />

      <AgentStatusBoard
        users={users}
        leads={[]}
        targets={targets}
        agentStatuses={agentStatuses}
        checkIsManagerial={checkIsManagerial}
        aggregatesUnavailable
      />

      <AggregateUnavailable
        title="Project inventory lead counts unavailable"
        detail="Inventory lead rollups need bounded queries or summary counters. See Reports."
      />
    </div>
  );
}
