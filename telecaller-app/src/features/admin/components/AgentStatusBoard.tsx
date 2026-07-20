import { Users } from "lucide-react";
import { User, Lead } from "@/shared/types";
import { Card, CardBody, CardHeader } from "@/shared/components/ui/Card";
import Badge from "@/shared/components/ui/Badge";
import EmptyState from "@/shared/components/ui/EmptyState";

interface AgentStatusBoardProps {
  users: User[];
  leads: Lead[];
  targets: Record<string, any>;
  agentStatuses: Record<string, any>;
  checkIsManagerial: (role: string) => boolean;
  /** When true, skip lead-derived counts (Tier 2 — no empty-store math). */
  aggregatesUnavailable?: boolean;
}

function statusBadgeVariant(
  status: string
): "success" | "info" | "warning" | "default" {
  if (status === "available") return "success";
  if (status === "on-call") return "info";
  if (status === "break") return "warning";
  return "default";
}

export default function AgentStatusBoard({
  users,
  leads,
  targets,
  agentStatuses,
  checkIsManagerial,
  aggregatesUnavailable = false,
}: AgentStatusBoardProps) {
  const agents = users.filter((u) => !checkIsManagerial(u.role));
  const leadSource = aggregatesUnavailable ? [] : leads;

  return (
    <Card>
      <CardHeader>
        <h3 className="type-label text-theme-text uppercase tracking-wider flex items-center">
          <Users className="w-4 h-4 mr-2 text-theme-accent" aria-hidden="true" />
          Agent Real-time Status Board
        </h3>
      </CardHeader>
      <CardBody className="pt-4">
        {agents.length === 0 ? (
          <EmptyState
            title="No agents configured"
            description="Add telecaller accounts to see live status here."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
            {agents.map((tc) => {
              const statusData = agentStatuses[tc.id] || { status: "offline" };
              const status = statusData.status || "offline";

              const target = targets[tc.id]?.targetCount || 50;
              const agentCallsCount = aggregatesUnavailable
                ? 0
                : leadSource
                    .filter((l) => l.assignedTo === tc.id)
                    .reduce((acc, lead) => {
                      const agentLogs = (lead.callLogs || []).filter(
                        (log: { agent?: string }) => log.agent === tc.username
                      );
                      return acc + agentLogs.length;
                    }, 0);

              return (
                <div
                  key={tc.id}
                  className="bg-theme-surface rounded-theme p-3 border border-theme-border flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-theme-text text-xs min-w-0 truncate">
                      {tc.username}{" "}
                      <span className="text-[10px] text-theme-muted font-normal">
                        ({tc.role})
                      </span>
                    </span>
                    <Badge variant={statusBadgeVariant(status)} className="shrink-0">
                      {status}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] text-theme-muted font-semibold uppercase">
                      <span>Call Target</span>
                      <span className="tabular-nums text-theme-text">
                        {aggregatesUnavailable ? "— / " : `${agentCallsCount} / `}
                        {target}
                      </span>
                    </div>
                    <div className="w-full bg-theme-border/60 h-1.5 rounded-full mt-1 overflow-hidden">
                      <div
                        className="bg-theme-accent h-full transition-all duration-500"
                        style={{
                          width: `${Math.min((agentCallsCount / target) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
