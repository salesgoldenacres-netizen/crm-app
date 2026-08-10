import { Activity } from "lucide-react";
import { Lead } from "@/shared/types";

interface LeadAcquisitionAnalyticsProps {
  leads: Lead[];
}

export default function LeadAcquisitionAnalytics({ leads }: LeadAcquisitionAnalyticsProps) {
  const sourceStats = { google: 0, meta: 0, bulk: 0, direct: 0 };
  leads.forEach((l) => {
    const notes = l.notes || "";
    if (notes.includes("Google_Ads_Lead_Form") || notes.includes("google_ads_webhook")) {
      sourceStats.google++;
    } else if (notes.includes("Meta_Lead_Ads") || notes.includes("meta_ads_webhook")) {
      sourceStats.meta++;
    } else if (notes.includes("Bulk imported")) {
      sourceStats.bulk++;
    } else {
      sourceStats.direct++;
    }
  });

  const totalLeadsCount = leads.length || 1;
  const googlePct = Math.round((sourceStats.google / totalLeadsCount) * 100);
  const metaPct = Math.round((sourceStats.meta / totalLeadsCount) * 100);
  const bulkPct = Math.round((sourceStats.bulk / totalLeadsCount) * 100);
  const directPct = Math.round((sourceStats.direct / totalLeadsCount) * 100);

  const items = [
    {
      label: "Google Ads",
      count: sourceStats.google,
      pct: googlePct,
      color: "bg-rose-500",
      indicator: "🔴",
    },
    {
      label: "Meta Ads",
      count: sourceStats.meta,
      pct: metaPct,
      color: "bg-blue-500",
      indicator: "🔵",
    },
    {
      label: "Bulk Import",
      count: sourceStats.bulk,
      pct: bulkPct,
      color: "bg-green-500",
      indicator: "📅",
    },
    {
      label: "Direct / Manual",
      count: sourceStats.direct,
      pct: directPct,
      color: "bg-amber-500",
      indicator: "👤",
    },
  ];

  return (
    <div className="bg-theme-card rounded-theme shadow-sm border border-theme-border p-5 mb-6 text-sm">
      <h3 className="text-sm font-bold text-theme-text uppercase tracking-wider mb-4 flex items-center">
        <Activity className="w-4 h-4 mr-2 text-indigo-500" />
        Lead Source Acquisition Analytics
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 items-center">
        <div className="space-y-3 col-span-1">
          {items.map((item) => (
            <div key={item.label} className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-500">
                {item.indicator} {item.label}:
              </span>
              <span className="font-bold text-theme-text">
                {item.count} ({item.pct}%)
              </span>
            </div>
          ))}
        </div>

        <div className="col-span-3 h-28 bg-gray-50 dark:bg-gray-900/50 rounded-theme border dark:border-gray-800 flex items-end justify-around px-4 pb-2 pt-4">
          {items.map((item) => (
            <div key={item.label} className="flex flex-col items-center w-16 space-y-1.5 group">
              <div className="text-[10px] font-bold text-gray-600 dark:text-gray-400 group-hover:scale-105 transition-transform">
                {item.count}
              </div>
              <div className="w-8 bg-gray-200 dark:bg-gray-700 rounded-t h-16 relative flex items-end">
                <div
                  className={`w-full rounded-t ${item.color} transition-all duration-700`}
                  style={{ height: `${item.pct || 4}%` }}
                ></div>
              </div>
              <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider text-center truncate w-full">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
