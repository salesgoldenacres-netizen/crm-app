import { useState } from "react";
import { Calendar } from "lucide-react";
import { Lead } from "@/shared/types";

interface CustomDateRangeReportsProps {
  leads: Lead[];
}

export default function CustomDateRangeReports({
  leads,
}: CustomDateRangeReportsProps) {
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const filteredLeads = leads.filter((l) => {
    if (!l.createdAt) return true;
    const leadDate = l.createdAt.split("T")[0];
    if (dateRange.start && leadDate < dateRange.start) return false;
    if (dateRange.end && leadDate > dateRange.end) return false;
    return true;
  });

  let totalCalls = 0;
  const callsByOutcome: Record<string, number> = {
    interested: 0,
    ringing: 0,
    "no-answer": 0,
    contacted: 0,
    "not-interested": 0,
    booked: 0,
    other: 0,
  };

  filteredLeads.forEach((l) => {
    const logs = l.callLogs || [];
    logs.forEach((log: any) => {
      if (!log.date) return;
      const logDate = log.date.split("T")[0];
      if (dateRange.start && logDate < dateRange.start) return;
      if (dateRange.end && logDate > dateRange.end) return;

      totalCalls++;
      const outcome = (log.status || "other").toLowerCase();
      if (callsByOutcome[outcome] !== undefined) {
        callsByOutcome[outcome]++;
      } else if (outcome.includes("ring")) {
        callsByOutcome["ringing"]++;
      } else if (outcome.includes("answer")) {
        callsByOutcome["no-answer"]++;
      } else {
        callsByOutcome["other"]++;
      }
    });
  });

  const newLeadsCount = filteredLeads.length;
  const bookedLeadsCount = filteredLeads.filter((l) => l.status === "booked").length;
  const conversionRate = newLeadsCount > 0 ? Math.round((bookedLeadsCount / newLeadsCount) * 100) : 0;

  return (
    <>
      {/* Custom Date Range Picker */}
      <div className="bg-theme-card rounded-xl shadow-sm border border-theme-border p-5">
        <h3 className="text-sm font-bold text-theme-text uppercase tracking-wider mb-4 flex items-center">
          <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
          Custom Date Range Reports
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-theme-muted uppercase">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="mt-1 block w-full border-theme-border dark:bg-gray-900 dark:text-white rounded-md text-xs p-2 border"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-theme-muted uppercase">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="mt-1 block w-full border-theme-border dark:bg-gray-900 dark:text-white rounded-md text-xs p-2 border"
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setDateRange({ start: "", end: "" })}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded text-xs font-medium cursor-pointer border-0"
            >
              Clear Filter
            </button>
          </div>
        </div>
      </div>

      {/* Metrics cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-theme-card rounded-xl p-5 border dark:border-gray-700 shadow-sm">
          <div className="text-xs font-semibold text-gray-500 uppercase">Leads Ingested</div>
          <div className="text-2xl font-bold mt-1 text-theme-text">{newLeadsCount}</div>
        </div>

        <div className="bg-theme-card rounded-xl p-5 border dark:border-gray-700 shadow-sm">
          <div className="text-xs font-semibold text-gray-500 uppercase">Booked Deals</div>
          <div className="text-2xl font-bold mt-1 text-theme-text">{bookedLeadsCount}</div>
        </div>

        <div className="bg-theme-card rounded-xl p-5 border dark:border-gray-700 shadow-sm">
          <div className="text-xs font-semibold text-gray-500 uppercase">Conversion Rate</div>
          <div className="text-2xl font-bold mt-1 text-theme-accent">{conversionRate}%</div>
        </div>

        <div className="bg-theme-card rounded-xl p-5 border dark:border-gray-700 shadow-sm">
          <div className="text-xs font-semibold text-gray-500 uppercase">Calls Logged</div>
          <div className="text-2xl font-bold mt-1 text-theme-text">{totalCalls}</div>
        </div>
      </div>

      {/* Double Column Call Outcome Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-theme-card rounded-xl shadow-sm border border-theme-border p-5 transition-colors flex flex-col justify-between">
          <h3 className="text-sm font-bold text-theme-text uppercase tracking-wider mb-4">
            Call Outcome Metrics
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { id: "interested", label: "Interested Leads ⭐", color: "bg-indigo-500" },
              { id: "ringing", label: "Ringing / Callback ⏰", color: "bg-amber-500" },
              { id: "no-answer", label: "No Answer / Unreachable 📴", color: "bg-rose-500" },
              { id: "contacted", label: "Contacted / Follow-up 📞", color: "bg-blue-500" },
              { id: "not-interested", label: "Not Interested ❌", color: "bg-slate-400" },
              { id: "booked", label: "Booked Deals 🏠", color: "bg-emerald-500" },
            ].map((item) => {
              const count = callsByOutcome[item.id] || 0;
              const percent = totalCalls > 0 ? Math.round((count / totalCalls) * 100) : 0;
              return (
                <div key={item.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-theme-text">
                    <span>{item.label}</span>
                    <span>
                      {count} ({percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                    <div className={`${item.color} h-full`} style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Circular SVG Donut Chart */}
        <div className="bg-theme-card rounded-xl shadow-sm border border-theme-border p-5 transition-colors flex flex-col justify-between items-center">
          <h3 className="text-sm font-bold text-theme-text uppercase tracking-wider mb-2 self-start">
            Outcome Share
          </h3>
          <div className="relative flex items-center justify-center w-40 h-40">
            <svg className="w-40 h-40 transform -rotate-90">
              {(() => {
                let accumulatedPercent = 0;
                return [
                  { outcome: "interested", color: "#6366f1" },
                  { outcome: "ringing", color: "#f59e0b" },
                  { outcome: "no-answer", color: "#ef4444" },
                  { outcome: "contacted", color: "#3b82f6" },
                  { outcome: "not-interested", color: "#94a3b8" },
                  { outcome: "booked", color: "#10b981" },
                  { outcome: "other", color: "#8b5cf6" },
                ].map(({ outcome, color }) => {
                  const count = callsByOutcome[outcome] || 0;
                  const percent = totalCalls > 0 ? count / totalCalls : 0;
                  const strokeOffset = 2 * Math.PI * 50 * (1 - accumulatedPercent);
                  const strokeDash = 2 * Math.PI * 50 * percent;
                  accumulatedPercent += percent;

                  return (
                    <circle
                      key={outcome}
                      cx="80"
                      cy="80"
                      r="50"
                      fill="transparent"
                      stroke={color}
                      strokeWidth="18"
                      strokeDasharray={`${strokeDash} ${2 * Math.PI * 50}`}
                      strokeDashoffset={strokeOffset}
                      className="transition-all duration-555"
                    />
                  );
                });
              })()}
              <circle cx="80" cy="80" r="40" className="fill-white dark:fill-gray-800 transition-colors" />
            </svg>
            <div className="absolute text-center">
              <div className="text-xl font-black text-theme-text">{totalCalls}</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Calls</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
