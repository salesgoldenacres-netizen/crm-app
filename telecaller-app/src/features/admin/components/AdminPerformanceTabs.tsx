import { safeFormatDateTime } from "@/shared/utils/dateUtils";
import { getAgentPoints } from "@/features/admin/utils/performanceUtils";
import { useAttendanceStore } from "@/features/attendance/hooks/useAttendanceStore";
import { User, Lead } from "@/shared/types";

// Modularized feature tabs
import CallQualityTab from "./CallQualityTab";
import AgentLeaderboardTab from "./AgentLeaderboardTab";
import AgentReportCardTab from "./AgentReportCardTab";

interface AdminPerformanceTabsProps {
  tab: "quality" | "leaderboard" | "performance";
  user: User;
  users: User[];
  leads: Lead[];
  isManagerial: (role: string) => boolean;
  rateCallLog: (leadId: string, logIndex: number, score: number, feedback: string) => Promise<void>;
}

export default function AdminPerformanceTabs({
  tab,
  user,
  users,
  leads,
  isManagerial,
  rateCallLog,
}: AdminPerformanceTabsProps) {
  const { allAttendance } = useAttendanceStore(user?.id);
  const getAgentPointsLocal = (telecaller: User) => getAgentPoints(telecaller, leads);

  return (
    <>
      {tab === "quality" && (
        <CallQualityTab
          users={users}
          leads={leads}
          isManagerial={isManagerial}
          rateCallLog={rateCallLog}
          safeFormatDateTime={safeFormatDateTime}
        />
      )}

      {tab === "leaderboard" && (
        <AgentLeaderboardTab
          users={users}
          isManagerial={isManagerial}
          getAgentPointsLocal={getAgentPointsLocal}
        />
      )}

      {tab === "performance" && (
        <AgentReportCardTab
          users={users}
          leads={leads}
          isManagerial={isManagerial}
          allAttendance={allAttendance}
          safeFormatDateTime={safeFormatDateTime}
        />
      )}
    </>
  );
}
