import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ListOrdered } from "lucide-react";
import Badge from "@/shared/components/ui/Badge";
import type { Lead, User } from "@/shared/types";
import { rankDailyPriorities } from "@/features/leads/intelligence";
import { useAuthorization } from "@/shared/services/AuthorizationContext";

interface DailyPrioritiesStripProps {
  leads: Lead[];
  user: User;
  todayYmd: string;
  limit?: number;
}

function healthVariant(
  health: "healthy" | "watch" | "critical",
): "success" | "warning" | "danger" {
  if (health === "critical") return "danger";
  if (health === "watch") return "warning";
  return "success";
}

export default function DailyPrioritiesStrip({
  leads,
  user,
  todayYmd,
  limit = 8,
}: DailyPrioritiesStripProps) {
  const { canAssignLead } = useAuthorization();
  const managerial = canAssignLead();

  const ranked = useMemo(() => {
    const scoped = managerial
      ? leads
      : leads.filter((l) => l.assignedTo === user.id);
    return rankDailyPriorities(scoped, {
      todayYmd,
      limit,
      isManagerial: managerial,
      allLeadsForDupScan: leads,
    });
  }, [leads, user.id, managerial, todayYmd, limit]);

  const leadById = useMemo(() => {
    const map = new Map<string, Lead>();
    leads.forEach((l) => map.set(l.id, l));
    return map;
  }, [leads]);

  if (ranked.length === 0) return null;

  return (
    <section
      className="rounded-theme border border-theme-border bg-theme-surface px-3 py-2.5 space-y-2"
      aria-label="Today's priorities"
    >
      <div className="flex items-center gap-2">
        <ListOrdered className="w-3.5 h-3.5 text-theme-accent" aria-hidden />
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-theme-muted">
          Today&apos;s priorities
        </h3>
        <span className="text-[10px] font-semibold text-theme-muted tabular-nums">
          top {ranked.length}
        </span>
      </div>
      <ol className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
        {ranked.map((item, index) => {
          const lead = leadById.get(item.leadId);
          if (!lead) return null;
          return (
            <li key={item.leadId} className="shrink-0">
              <Link
                to={`/lead/${item.leadId}`}
                className="block min-w-[9.5rem] max-w-[11rem] rounded-theme border border-theme-border bg-theme-card px-2.5 py-2 hover:border-theme-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-bold text-theme-muted tabular-nums">
                    #{index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <Badge variant={healthVariant(item.intelligence.health)}>
                      {item.intelligence.health}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs font-semibold text-theme-text truncate">
                  {lead.name || "Unnamed"}
                </p>
                <p className="text-[10px] text-theme-muted mt-0.5 truncate">
                  {item.intelligence.score} ·{" "}
                  {item.intelligence.nextAction.type.replace(/_/g, " ")}
                </p>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
