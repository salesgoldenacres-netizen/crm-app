import { safeFormatDateTime } from "@/shared/utils/dateUtils";
import { useAttendanceStore } from "@/features/attendance/hooks/useAttendanceStore";
import { User } from "@/shared/types";
import AggregateUnavailable from "./AggregateUnavailable";
import CallQualityTab from "./CallQualityTab";
import AgentLeaderboardTab from "./AgentLeaderboardTab";

interface AdminPerformanceTabsProps {
  tab: "quality" | "leaderboard" | "performance";
  user: User;
  users: User[];
  isManagerial: (role: string) => boolean;
  rateCallLog: (leadId: string, logIndex: number, score: number, feedback: string) => Promise<void>;
}

export default function AdminPerformanceTabs({
  tab,
  user,
  users,
  isManagerial,
  rateCallLog,
}: AdminPerformanceTabsProps) {
  useAttendanceStore(user?.id);

  return (
    <>
      {tab === "quality" && (
        <CallQualityTab
          users={users}
          leads={[]}
          isManagerial={isManagerial}
          rateCallLog={rateCallLog}
          safeFormatDateTime={safeFormatDateTime}
          aggregatesUnavailable
        />
      )}

      {tab === "leaderboard" && (
        <div className="space-y-4">
          <AggregateUnavailable
            title="Lead-derived leaderboard unavailable"
            detail="Points from scanning all leads are retired. Use agentProductivity / Reports."
          />
          <AgentLeaderboardTab
            users={users}
            isManagerial={isManagerial}
            getAgentPointsLocal={() => ({
              points: 0,
              callsCount: 0,
              bookingsCount: 0,
              interestedCount: 0,
              badges: [] as string[],
            })}
          />
        </div>
      )}

      {tab === "performance" && (
        <AggregateUnavailable
          title="Agent report card lead scan unavailable"
          detail="Performance rollups from a global leads array are retired. See Reports or productivity docs."
        />
      )}
    </>
  );
}
