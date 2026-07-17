import AdminDashboard from "@/features/admin/pages/AdminDashboard";
import { useCallTargetStore } from "@/features/admin/hooks/adminStores";
import { useAgentStatusStore } from "@/features/employees/hooks/useAgentStatusStore";
import { User, Lead, Project } from "@/shared/types";

// Modularized feature widgets
import CustomDateRangeReports from "./CustomDateRangeReports";
import AgentStatusBoard from "./AgentStatusBoard";
import ProjectInventoryDashboard from "./ProjectInventoryDashboard";

interface AdminAnalyticsTabProps {
  user: User;
  users: User[];
  leads: Lead[];
  projects: Record<string, Project>;
  isManagerial: (role: string) => boolean;
}

export default function AdminAnalyticsTab({
  user,
  users,
  leads,
  projects,
  isManagerial: checkIsManagerial,
}: AdminAnalyticsTabProps) {
  const { targets } = useCallTargetStore();
  const { agentStatuses } = useAgentStatusStore();

  return (
    <div className="space-y-6 animate-fadeIn text-sm">
      {/* Shared Company Overview Dashboard */}
      <AdminDashboard user={user} />

      {/* Divider — Admin-only Deep Dive Reports below */}
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-theme-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-theme-surface text-[10px] font-black uppercase tracking-widest text-theme-muted">
            Advanced Analytics & Reports
          </span>
        </div>
      </div>

      {/* Custom Date Range Picker & Outcomes Share */}
      <CustomDateRangeReports leads={leads} />

      {/* Agent Status Board Panel */}
      <AgentStatusBoard
        users={users}
        leads={leads}
        targets={targets}
        agentStatuses={agentStatuses}
        checkIsManagerial={checkIsManagerial}
      />

      {/* Project Inventory Dashboard */}
      <ProjectInventoryDashboard projects={projects} leads={leads} />
    </div>
  );
}
