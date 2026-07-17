import { Trophy as TrophyIcon } from "lucide-react";
import { Team, Lead } from "@/shared/types";

interface Goals {
  monthlyCallGoal: number;
  monthlyBookingGoal: number;
  customGoalText: string;
  targetRevenue: number;
  updatedAt?: string;
}

interface TeamsGoalsWidgetProps {
  teams: Team[];
  leads: Lead[];
  goals: Goals;
}

export default function TeamsGoalsWidget({ teams, leads, goals }: TeamsGoalsWidgetProps) {
  const bookingGoal = goals.monthlyBookingGoal || 20;

  return (
    <div className="rounded-xl border border-theme-border bg-theme-card p-3 flex flex-col gap-2.5">
      <div className="border-b border-theme-border pb-2 flex justify-between items-center gap-2">
        <h2 className="text-xs font-bold text-theme-text flex items-center gap-1.5">
          <TrophyIcon className="w-3.5 h-3.5 text-theme-accent" />
          Teams & Goals
        </h2>
        <span className="text-[9px] text-theme-muted font-semibold tabular-nums">
          Goal: {bookingGoal} bookings
        </span>
      </div>

      <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin">
        {teams.map((team) => {
          const teamBookingsCount = leads.filter(
            (l) =>
              l.status === "booked" &&
              (team.memberIds || []).includes(l.assignedTo ?? "")
          ).length;
          const goalPercent = Math.min(
            100,
            Math.round((teamBookingsCount / bookingGoal) * 100)
          );

          return (
            <div
              key={team.id}
              className="p-2.5 bg-theme-surface border border-theme-border rounded-lg space-y-1.5"
            >
              <div className="flex justify-between items-center gap-2 text-[11px]">
                <div className="min-w-0">
                  <h4 className="font-bold text-theme-text truncate">{team.name}</h4>
                  <span className="text-[9px] text-theme-muted">
                    {(team.memberIds || []).length} members
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-theme-text block tabular-nums">
                    {teamBookingsCount} booked
                  </span>
                  <span className="text-[9px] text-theme-muted font-semibold tabular-nums">
                    {goalPercent}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-theme-card border border-theme-border h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-theme-success h-full rounded-full transition-all duration-500"
                  style={{ width: `${goalPercent}%` }}
                />
              </div>
            </div>
          );
        })}
        {teams.length === 0 && (
          <div className="py-8 text-center text-theme-muted text-[11px]">
            No teams configured yet. Set them up in Admin.
          </div>
        )}
      </div>
    </div>
  );
}
