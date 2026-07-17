import { useState } from "react";
import { Activity } from "lucide-react";
import { User, Lead } from "@/shared/types";

interface AgentReportCardTabProps {
  users: User[];
  leads: Lead[];
  isManagerial: (role: string) => boolean;
  allAttendance: any[];
  safeFormatDateTime: (dateStr?: string, showTime?: boolean) => string;
}

export default function AgentReportCardTab({
  users,
  leads,
  isManagerial,
  allAttendance,
  safeFormatDateTime,
}: AgentReportCardTabProps) {
  const [selectedPerfUserId, setSelectedPerfUserId] = useState("");

  return (
    <div className="space-y-6 animate-fadeIn text-sm">
      <div className="flex justify-end mb-3 gap-2 flex-wrap"><div className="flex items-center space-x-3">
          <select
            value={selectedPerfUserId}
            onChange={(e) => setSelectedPerfUserId(e.target.value)}
            className="bg-theme-card dark:text-white border border-theme-border rounded-lg p-2 text-xs"
          >
            <option value="">— Select Agent —</option>
            {users
              .filter((u) => !isManagerial(u.role))
              .map((tc) => (
                <option key={tc.id} value={tc.id}>
                  {tc.username} ({tc.role})
                </option>
              ))}
          </select>
          {selectedPerfUserId && (
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-theme-accent hover:opacity-90 text-white rounded-lg text-xs font-semibold shadow cursor-pointer flex items-center"
            >
              🖨️ Print Report
            </button>
          )}
        </div>
      </div>

      {!selectedPerfUserId ? (
        <div className="bg-theme-card rounded-xl shadow-sm border border-theme-border p-12 text-center text-gray-400 italic">
          Select an agent above to view their performance report card.
        </div>
      ) : (
        (() => {
          const perfUser = users.find((u) => u.id === selectedPerfUserId);
          if (!perfUser) return null;
          const agentLeads = leads.filter((l) => l.assignedTo === selectedPerfUserId);
          const totalCalls = agentLeads.reduce((acc, l) => {
            return (
              acc + (l.callLogs || []).filter((log) => log.agent === perfUser.username).length
            );
          }, 0);
          const interestedLeads = agentLeads.filter((l) => l.status === "interested");
          const bookings = agentLeads.filter((l) => l.status === "booked" || l.status === "reserved");
          const conversionRate = agentLeads.length > 0 ? Math.round((bookings.length / agentLeads.length) * 100) : 0;

          // Attendance stats
          const agentAttendance = allAttendance.filter((r) => r.userId === selectedPerfUserId);
          const presentDays = agentAttendance.filter((r) => r.status === "present" || r.status === "late").length;
          const lateDays = agentAttendance.filter((r) => r.status === "late").length;
          const totalHours = agentAttendance.reduce((acc, r) => acc + (r.totalWorkHours || 0), 0);

          return (
            <div className="bg-theme-card rounded-xl border dark:border-gray-700 shadow-sm p-6 space-y-6">
              {/* Profile Overview */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b dark:border-gray-700 pb-4 gap-4">
                <div>
                  <h2 className="text-xl font-bold text-theme-text">{perfUser.username}</h2>
                  <p className="text-xs text-theme-muted mt-0.5">
                    Account: {perfUser.email} &bull; Role: {perfUser.role}
                  </p>
                </div>
                <div className="bg-theme-accent-muted text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/60 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  Scorecard Generated
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-55 dark:bg-gray-900/50 rounded-xl border dark:border-gray-800">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Total Assigned Leads
                  </span>
                  <span className="text-2xl font-black text-theme-text mt-1 block">
                    {agentLeads.length}
                  </span>
                </div>
                <div className="p-4 bg-gray-55 dark:bg-gray-900/50 rounded-xl border dark:border-gray-800">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Calls Attempted
                  </span>
                  <span className="text-2xl font-black text-theme-text mt-1 block">{totalCalls}</span>
                </div>
                <div className="p-4 bg-gray-55 dark:bg-gray-900/50 rounded-xl border dark:border-gray-800">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Conversion Rate
                  </span>
                  <span className="text-2xl font-black text-theme-accent mt-1 block">
                    {conversionRate}%
                  </span>
                </div>
                <div className="p-4 bg-gray-55 dark:bg-gray-900/50 rounded-xl border dark:border-gray-800">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Lead Bookings
                  </span>
                  <span className="text-2xl font-black text-theme-success mt-1 block">
                    {bookings.length}
                  </span>
                </div>
              </div>

              {/* Attendance & Engagement Reports */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-bold text-theme-text flex items-center border-b dark:border-gray-700 pb-2">
                    <Activity className="w-4 h-4 mr-1.5 text-indigo-500" />
                    Attendance Summary
                  </h3>
                  <div className="space-y-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                    <div className="flex justify-between">
                      <span>Days Logged Present</span>
                      <span className="text-theme-text font-bold">{presentDays} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Late Check-in Count</span>
                      <span className="text-theme-warning font-bold">{lateDays} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Work Talktime (Hours)</span>
                      <span className="text-theme-text font-bold">{totalHours.toFixed(1)} hrs</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-theme-text flex items-center border-b dark:border-gray-700 pb-2">
                    <Activity className="w-4 h-4 mr-1.5 text-indigo-500" />
                    Pipeline Funnel
                  </h3>
                  <div className="space-y-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                    <div className="flex justify-between">
                      <span>Interested Leads Pool</span>
                      <span className="text-yellow-600 dark:text-yellow-400 font-bold">
                        {interestedLeads.length} leads
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Booked Deals closed</span>
                      <span className="text-theme-success font-bold">
                        {bookings.length} deals
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Evaluation History log */}
              <div className="space-y-4 border-t dark:border-gray-700 pt-4">
                <h3 className="font-bold text-theme-text">Call Evaluation Logs</h3>
                <div className="border border-theme-border rounded-xl overflow-hidden">
                  <table className="min-w-full divide-y divide-theme-border">
                    <thead className="bg-theme-surface">
                      <tr>
                        <th className="px-6 py-2.5 text-left text-[11px] font-bold text-theme-muted uppercase tracking-wider">
                          Call Date
                        </th>
                        <th className="px-6 py-2.5 text-left text-[11px] font-bold text-theme-muted uppercase tracking-wider">
                          Lead
                        </th>
                        <th className="px-6 py-2.5 text-left text-[11px] font-bold text-theme-muted uppercase tracking-wider">
                          Note / Recording
                        </th>
                        <th className="px-6 py-2.5 text-center text-[11px] font-bold text-theme-muted uppercase tracking-wider">
                          Score
                        </th>
                        <th className="px-6 py-2.5 text-left text-[11px] font-bold text-theme-muted uppercase tracking-wider">
                          Manager Feedback
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-border text-xs">
                      {leads
                        .flatMap((l) =>
                          (l.callLogs || []).map((log, idx) => ({
                            lead: l,
                            log,
                            index: idx,
                          }))
                        )
                        .filter((item) => item.log.agent === perfUser.username && item.log.rating)
                        .sort((a, b) => new Date(b.log.date).getTime() - new Date(a.log.date).getTime())
                        .map((item) => (
                          <tr key={`${item.lead.id}-${item.index}`}>
                            <td className="px-6 py-3 whitespace-nowrap text-theme-muted">
                              {safeFormatDateTime(item.log.date)}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap font-bold text-theme-text">
                              {item.lead.name}
                            </td>
                            <td className="px-6 py-3 text-gray-600 dark:text-gray-300">
                              "{item.log.note || "—"}"
                            </td>
                            <td className="px-6 py-3 text-center whitespace-nowrap font-black text-amber-500">
                              ★ {item.log.rating} / 5
                            </td>
                            <td className="px-6 py-3 text-theme-muted italic">
                              {item.log.feedback || "No feedback left."}
                            </td>
                          </tr>
                        ))}
                      {leads.flatMap((l) =>
                        (l.callLogs || []).filter((log) => log.agent === perfUser.username && log.rating)
                      ).length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">
                            No rated calls logged for this agent.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
