import { Award, Flame } from "lucide-react";
import { User } from "@/shared/types";
import DataTable, { ColumnDef } from "@/shared/components/DataTable";
import Badge from "@/shared/components/ui/Badge";

interface AgentLeaderboardTabProps {
  users: User[];
  isManagerial: (role: string) => boolean;
  getAgentPointsLocal: (telecaller: User) => any;
}

const RANK_STYLES = [
  "bg-theme-warning/15 text-theme-warning border-theme-warning/30",
  "bg-theme-muted/15 text-theme-muted border-theme-border",
  "bg-theme-accent-muted text-theme-accent border-theme-accent/25",
];

export default function AgentLeaderboardTab({
  users,
  isManagerial,
  getAgentPointsLocal,
}: AgentLeaderboardTabProps) {
  // Pre-calculate ranks and point metrics
  const rankedUsers = users
    .filter((u) => !isManagerial(u.role))
    .map((tc) => ({ ...tc, ...getAgentPointsLocal(tc) }))
    .sort((a, b) => b.points - a.points)
    .map((tc, idx) => ({
      ...tc,
      rank: idx + 1,
      rowBg:
        idx === 0
          ? "bg-theme-warning/10 border-theme-warning/20"
          : idx === 1
            ? "bg-theme-surface/60"
            : idx === 2
              ? "bg-theme-accent-muted/30 border-theme-accent/15"
              : "",
    }));

  const columns: ColumnDef<any>[] = [
    {
      key: "rank",
      header: "Rank",
      sortable: true,
      className: "text-center w-16",
      headerClassName: "w-16",
      render: (row) => (
        <span
          className={`inline-flex h-6 w-6 mx-auto items-center justify-center rounded-theme border text-[11px] font-bold tabular-nums ${
            RANK_STYLES[row.rank - 1] || "bg-theme-surface text-theme-muted border-theme-border"
          }`}
        >
          {row.rank}
        </span>
      ),
    },
    {
      key: "username",
      header: "Agent",
      sortable: true,
      render: (tc) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-theme-accent-muted flex items-center justify-center text-sm font-semibold text-theme-accent border border-theme-border">
            {tc.username.charAt(0).toUpperCase()}
          </div>
          <span className="font-semibold text-theme-text">{tc.username}</span>
        </div>
      ),
    },
    {
      key: "callsCount",
      header: "Calls",
      sortable: true,
      headerClassName: "text-center",
      className: "text-center font-semibold text-theme-text",
    },
    {
      key: "interestedCount",
      header: "Interested",
      sortable: true,
      headerClassName: "text-center",
      className: "text-center font-semibold text-theme-warning",
    },
    {
      key: "bookingsCount",
      header: "Bookings",
      sortable: true,
      headerClassName: "text-center",
      className: "text-center font-semibold text-theme-success",
    },
    {
      key: "points",
      header: "Total Points",
      sortable: true,
      headerClassName: "text-center",
      className: "text-center",
      render: (tc) => (
        <span className="inline-flex items-center px-3 py-1 rounded-theme text-sm font-semibold bg-theme-accent-muted text-theme-accent border border-theme-border">
          {tc.points}
        </span>
      ),
    },
    {
      key: "badges",
      header: "Badges",
      render: (tc) => (
        <div className="flex flex-wrap gap-1.5">
          {tc.badges.length > 0 ? (
            tc.badges.map((b: string, bIdx: number) => (
              <Badge key={bIdx} variant="warning">
                {b}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-theme-muted italic">No badges yet</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn text-sm">
      <div className="bg-theme-surface border border-theme-border rounded-theme p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-theme bg-theme-warning/15 text-theme-warning border border-theme-warning/30">
            <Flame className="w-4 h-4" />
          </span>
          <div>
            <h4 className="font-semibold text-theme-text text-sm">Gamified Agent Rewards Active</h4>
            <p className="text-xs text-theme-muted mt-0.5">
              Earn points dynamically for logging calls and converting leads.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-[10px] font-semibold uppercase tracking-wider text-theme-muted">
          <span>
            Call log <strong className="text-theme-text">+1 pt</strong>
          </span>
          <span>
            Interested <strong className="text-theme-text">+10 pts</strong>
          </span>
          <span>
            Booking / Reserved <strong className="text-theme-text">+50 pts</strong>
          </span>
        </div>
      </div>

      {/* Leaderboard Table Container */}
      <div className="p-4 bg-theme-card rounded-theme shadow-elevation-sm border border-theme-border">
        <DataTable
          columns={columns}
          data={rankedUsers}
          pageSize={10}
          emptyMessage="No agents registered yet."
          rowClassName={(row) => row.rowBg}
        />
      </div>

      {/* Milestone Progress */}
      <div className="bg-theme-card rounded-theme shadow-elevation-sm border border-theme-border p-6 space-y-4">
        <h3 className="font-semibold text-theme-text flex items-center">
          <Award className="w-5 h-5 mr-2 text-theme-accent" />
          Achievement Milestones
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: "First Booking",
              desc: "Close at least 1 booking",
              check: (tc: User) => getAgentPointsLocal(tc).bookingsCount >= 1,
            },
            {
              label: "Active Agent",
              desc: "Log 50+ calls",
              check: (tc: User) => getAgentPointsLocal(tc).callsCount >= 50,
            },
            {
              label: "High Performer",
              desc: "5+ bookings this month",
              check: (tc: User) => getAgentPointsLocal(tc).bookingsCount >= 5,
            },
          ].map((milestone) => {
            const earners = users.filter((u) => !isManagerial(u.role) && milestone.check(u));
            return (
              <div
                key={milestone.label}
                className="bg-theme-surface rounded-theme p-4 border border-theme-border space-y-2"
              >
                <div className="text-sm font-semibold text-theme-text">{milestone.label}</div>
                <div className="text-[10px] text-theme-muted uppercase">{milestone.desc}</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {earners.length > 0 ? (
                    earners.map((e) => (
                      <Badge key={e.id} variant="success">
                        {e.username}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-[10px] text-theme-muted italic">No one yet</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
