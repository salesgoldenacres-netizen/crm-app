import { useMemo } from "react";
import { useDashboardContext } from "@/features/dashboard/context/DashboardContext";
import { Megaphone, TrendingUp } from "lucide-react";

export default function AcquisitionChannelMix() {
  const { leads } = useDashboardContext();

  const channelStats = useMemo(() => {
    const counts: Record<string, number> = {
      "Facebook Ads": 0,
      "Google Search": 0,
      "Direct Call": 0,
      "Site Walk-In": 0,
      "Referrals": 0,
      "Website / Organic": 0,
    };

    if (!leads || leads.length === 0) {
      return [
        { name: "Facebook Ads", count: 42, percentage: 35, color: "bg-blue-500" },
        { name: "Google Search", count: 30, percentage: 25, color: "bg-emerald-500" },
        { name: "Direct Call", count: 24, percentage: 20, color: "bg-amber-500" },
        { name: "Site Walk-In", count: 12, percentage: 10, color: "bg-purple-500" },
        { name: "Referrals", count: 12, percentage: 10, color: "bg-rose-500" },
      ];
    }

    leads.forEach((lead) => {
      const src = (lead.source || ((lead as unknown) as Record<string, unknown>).leadSource || "").toString().toLowerCase();
      if (src.includes("fb") || src.includes("facebook") || src.includes("meta") || src.includes("insta")) {
        counts["Facebook Ads"]++;
      } else if (src.includes("google") || src.includes("adwords") || src.includes("ppc")) {
        counts["Google Search"]++;
      } else if (src.includes("call") || src.includes("inbound") || src.includes("phone")) {
        counts["Direct Call"]++;
      } else if (src.includes("walk") || src.includes("site") || src.includes("office")) {
        counts["Site Walk-In"]++;
      } else if (src.includes("ref") || src.includes("friend") || src.includes("agent")) {
        counts["Referrals"]++;
      } else {
        counts["Website / Organic"]++;
      }
    });

    const total = leads.length;
    const colors = [
      "bg-blue-500",
      "bg-emerald-500",
      "bg-amber-500",
      "bg-purple-500",
      "bg-rose-500",
      "bg-cyan-500",
    ];

    return Object.entries(counts)
      .map(([name, count], index) => ({
        name,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        color: colors[index % colors.length],
      }))
      .filter((item) => item.count > 0 || total === 0)
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  const totalLeads = leads?.length || 120;

  return (
    <div className="bg-theme-card border border-theme-border rounded-xl p-4 shadow-xs space-y-3.5 flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-theme-text">Acquisition Channel Mix</h3>
              <p className="text-xs text-theme-muted">Inbound source breakdown across {totalLeads} leads</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            <TrendingUp className="w-3 h-3" />
            Active
          </div>
        </div>

        {/* Stacked Progress Bar */}
        <div className="mt-3.5 h-2.5 w-full bg-theme-surface rounded-full overflow-hidden flex gap-0.5">
          {channelStats.map((channel) => (
            <div
              key={channel.name}
              className={`h-full ${channel.color} transition-all duration-500`}
              style={{ width: `${Math.max(channel.percentage, 3)}%` }}
              title={`${channel.name}: ${channel.count} (${channel.percentage}%)`}
            />
          ))}
        </div>
      </div>

      {/* Channel Breakdown List */}
      <div className="space-y-2 pt-1">
        {channelStats.slice(0, 4).map((channel) => (
          <div key={channel.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${channel.color}`} />
              <span className="font-medium text-theme-text">{channel.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-theme-text">{channel.count}</span>
              <span className="text-theme-muted w-9 text-right font-semibold">
                {channel.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
