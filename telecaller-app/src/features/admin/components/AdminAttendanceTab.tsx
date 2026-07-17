import { useState } from "react";
import {
  Users,
  Clock,
  FileSpreadsheet,
  Download,
} from "lucide-react";
import { safeFormatDateTime, safeFormatTime } from "@/shared/utils/dateUtils";
import { useAttendanceStore } from "@/features/attendance/hooks/useAttendanceStore";
import { useLeaveRequestsStore } from "@/features/attendance/hooks/useLeaveRequestsStore";
import { useAuditLogsStore } from "@/features/admin/hooks/adminStores";
import { useAgentStatusStore } from "@/features/employees/hooks/useAgentStatusStore";
import { User } from "@/shared/types";
import LeaveRequestsManagement from "./LeaveRequestsManagement";
import DataTable, { ColumnDef } from "@/shared/components/DataTable";
import Badge from "@/shared/components/ui/Badge";

interface AdminAttendanceTabProps {
  user: User;
  users: User[];
  isManagerial: (role: string) => boolean;
}

export default function AdminAttendanceTab({
  user,
  users,
  isManagerial: checkIsManagerial,
}: AdminAttendanceTabProps) {
  const { allAttendance } = useAttendanceStore(user?.id);
  const { leaveRequests, updateLeaveStatus } = useLeaveRequestsStore();
  const { logAuditEvent } = useAuditLogsStore();
  const { agentStatuses } = useAgentStatusStore();

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const statusColumns: ColumnDef<User>[] = [
    {
      key: "username",
      header: "Agent",
      sortable: true,
      render: (tc) => <span className="font-semibold text-theme-text">{tc.username}</span>,
    },
    {
      key: "status",
      header: "Live Status",
      render: (tc) => {
        const statObj = agentStatuses[tc.id];
        if (!statObj) {
          return <Badge variant="default">Offline</Badge>;
        }
        if (statObj.status === "online") {
          return <Badge variant="success">Online</Badge>;
        }
        if (statObj.status === "on-call") {
          return <Badge variant="info">On Call</Badge>;
        }
        if (["break", "lunch"].includes(statObj.status)) {
          return <Badge variant="warning">On Break ({statObj.status})</Badge>;
        }
        return <Badge variant="default">Offline</Badge>;
      },
    },
    {
      key: "checkIn",
      header: "Clock In",
      render: (tc) => {
        const offset = 5.5 * 60 * 60 * 1000;
        const localDateStr = new Date(new Date().getTime() + offset).toISOString().split("T")[0];
        const todayRecord = allAttendance.find((r) => r.userId === tc.id && r.date === localDateStr);
        return todayRecord?.checkIn
          ? safeFormatTime(todayRecord.checkIn, { hour: "2-digit", minute: "2-digit" })
          : "—";
      },
    },
    {
      key: "checkOut",
      header: "Clock Out",
      render: (tc) => {
        const offset = 5.5 * 60 * 60 * 1000;
        const localDateStr = new Date(new Date().getTime() + offset).toISOString().split("T")[0];
        const todayRecord = allAttendance.find((r) => r.userId === tc.id && r.date === localDateStr);
        return todayRecord?.checkOut
          ? safeFormatTime(todayRecord.checkOut, { hour: "2-digit", minute: "2-digit" })
          : "—";
      },
    },
    {
      key: "totalWorkHours",
      header: "Net Work Hours",
      render: (tc) => {
        const offset = 5.5 * 60 * 60 * 1000;
        const localDateStr = new Date(new Date().getTime() + offset).toISOString().split("T")[0];
        const todayRecord = allAttendance.find((r) => r.userId === tc.id && r.date === localDateStr);
        return todayRecord
          ? todayRecord.totalWorkHours
            ? `${todayRecord.totalWorkHours} hrs`
            : "Clocked In"
          : "—";
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn text-sm">
      

      {/* Attendance Analytics Metrics */}
      {(() => {
        const telecallers = users.filter((u) => !checkIsManagerial(u.role));
        const activeAgentStatuses = telecallers.filter((tc) => {
          const statObj = agentStatuses[tc.id];
          return (
            statObj &&
            ["online", "on-call", "break", "lunch"].includes(statObj.status)
          );
        });
        const breakAgentStatuses = telecallers.filter((tc) => {
          const statObj = agentStatuses[tc.id];
          return statObj && ["break", "lunch"].includes(statObj.status);
        });

        // Get local YYYY-MM-DD date string in IST
        const offset = 5.5 * 60 * 60 * 1000;
        const localDateStr = new Date(new Date().getTime() + offset)
          .toISOString()
          .split("T")[0];

        const todayRecords = allAttendance.filter(
          (r) => r.date === localDateStr
        );
        const lateCount = todayRecords.filter(
          (r) => r.status === "late"
        ).length;

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-theme-card p-4 rounded-xl border border-theme-border shadow-sm flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-955/40 text-green-600 dark:text-green-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-theme-muted uppercase tracking-wider block">
                  Active / Online
                </span>
                <span className="text-xl font-bold text-theme-text mt-0.5 block">
                  {activeAgentStatuses.length} / {telecallers.length}
                </span>
              </div>
            </div>

            <div className="bg-theme-card p-4 rounded-xl border border-theme-border shadow-sm flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-yellow-50 dark:bg-yellow-955/40 text-yellow-600 dark:text-yellow-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-theme-muted uppercase tracking-wider block">
                  Late Arrivals
                </span>
                <span className="text-xl font-bold text-theme-text mt-0.5 block">
                  {lateCount}
                </span>
              </div>
            </div>

            <div className="bg-theme-card p-4 rounded-xl border border-theme-border shadow-sm flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/40 text-theme-warning">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-theme-muted uppercase tracking-wider block">
                  On Breaks
                </span>
                <span className="text-xl font-bold text-theme-text mt-0.5 block">
                  {breakAgentStatuses.length}
                </span>
              </div>
            </div>

            <div className="bg-theme-card p-4 rounded-xl border border-theme-border shadow-sm flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/40 text-theme-danger">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-theme-muted uppercase tracking-wider block">
                  Offline / Absent
                </span>
                <span className="text-xl font-bold text-theme-text mt-0.5 block">
                  {Math.max(0, telecallers.length - activeAgentStatuses.length)}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Live Agents Grid */}
      <div className="bg-theme-card rounded-theme shadow-elevation-sm border border-theme-border p-6 space-y-4">
        <h3 className="font-semibold text-theme-text text-base">
          Real-Time Agent Status
        </h3>
        <DataTable
          data={users.filter((u) => !checkIsManagerial(u.role))}
          columns={statusColumns}
          pageSize={10}
        />
      </div>

      {/* Monthly Timesheet & Exporter */}
      <div className="bg-theme-card rounded-theme shadow-elevation-sm border border-theme-border p-6 transition-colors space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-theme-border pb-4">
          <div>
            <h3 className="text-base font-semibold text-theme-text flex items-center">
              <FileSpreadsheet className="w-5 h-5 mr-2 text-theme-accent" />
              Monthly Timesheet Matrix
            </h3>
            <p className="text-xs text-theme-muted mt-1">
              Select a month to view shift metrics and export to payroll CSV.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="text-xs bg-theme-surface text-theme-text border border-theme-border rounded-theme p-2 focus:ring-theme-ring"
            >
              {Array.from({ length: 12 }).map((_, idx) => (
                <option key={idx} value={idx}>
                  {new Date(2020, idx).toLocaleString("default", {
                    month: "long",
                  })}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="text-xs bg-theme-surface text-theme-text border border-theme-border rounded-theme p-2 focus:ring-theme-ring"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                const telecallers = users.filter((u) => !checkIsManagerial(u.role));
                const daysCount = new Date(
                  selectedYear,
                  selectedMonth + 1,
                  0
                ).getDate();
                let csv =
                  "Agent Username,Role," +
                  Array.from({ length: daysCount })
                    .map((_, idx) => `Day ${idx + 1}`)
                    .join(",") +
                  ",Total Present,Total Late,Total Hours\n";

                telecallers.forEach((tc) => {
                  let presentCount = 0;
                  let lateCount = 0;
                  let totalHours = 0;

                  const dailyStatuses = Array.from({ length: daysCount }).map(
                    (_, idx) => {
                      const dayStr = String(idx + 1).padStart(2, "0");
                      const dateKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${dayStr}`;
                      const record = allAttendance.find(
                        (r) => r.userId === tc.id && r.date === dateKey
                      );

                      if (record) {
                        totalHours += record.totalWorkHours || 0;
                        if (record.status === "present") {
                          presentCount++;
                          return "Present";
                        }
                        if (record.status === "late") {
                          lateCount++;
                          return "Late";
                        }
                        return "Present";
                      }
                      return "Absent";
                    }
                  );

                  csv += `${tc.username},${tc.role},${dailyStatuses.join(",")},${presentCount},${lateCount},${totalHours.toFixed(2)}\n`;
                });

                const blob = new Blob([csv], {
                  type: "text/csv;charset=utf-8;",
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute(
                  "download",
                  `Attendance_Report_${selectedYear}_${selectedMonth + 1}.csv`
                );
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-xs font-semibold rounded-lg text-white bg-theme-accent hover:opacity-90 focus:outline-none cursor-pointer border-0"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Matrix Layout Grid */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-theme-border">
            <thead className="bg-theme-surface">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-theme-muted uppercase tracking-wider sticky left-0 bg-theme-surface z-10">
                  Agent
                </th>
                {Array.from({
                  length: new Date(
                    selectedYear,
                    selectedMonth + 1,
                    0
                  ).getDate(),
                }).map((_, idx) => (
                  <th
                    key={idx}
                    className="px-2 py-3 text-center text-xs font-bold text-theme-muted uppercase tracking-wider min-w-[40px]"
                  >
                    {idx + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {users
                .filter((u) => !checkIsManagerial(u.role))
                .map((tc) => {
                  const daysCount = new Date(
                    selectedYear,
                    selectedMonth + 1,
                    0
                  ).getDate();

                  return (
                    <tr
                      key={tc.id}
                      className="hover:bg-theme-surface/60 transition-colors"
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-theme-text sticky left-0 bg-theme-card border-r border-theme-border">
                        {tc.username}{" "}
                        <span className="text-[10px] text-theme-muted font-normal">
                          ({tc.role})
                        </span>
                      </td>
                      {Array.from({ length: daysCount }).map((_, idx) => {
                        const dayStr = String(idx + 1).padStart(2, "0");
                        const dateKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${dayStr}`;
                        const record = allAttendance.find(
                          (r) => r.userId === tc.id && r.date === dateKey
                        );

                        let cellText = "A";
                        let cellColor =
                          "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-955/30 dark:text-rose-400 dark:border-rose-900/50";

                        const dateObj = new Date(
                          selectedYear,
                          selectedMonth,
                          idx + 1
                        );
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const isFuture = dateObj > today;

                        const hasApprovedLeave = leaveRequests.some((lr) => {
                          if (lr.userId !== tc.id || lr.status !== "approved")
                            return false;
                          return (
                            dateKey >= lr.startDate && dateKey <= lr.endDate
                          );
                        });

                        if (isFuture) {
                          cellText = "—";
                          cellColor =
                            "text-theme-muted/40 border-transparent";
                        } else if (record) {
                          if (record.status === "present") {
                            cellText = "P";
                            cellColor =
                              "bg-theme-success/10 text-theme-success border-theme-success/20";
                          } else if (record.status === "late") {
                            cellText = "L";
                            cellColor =
                              "bg-theme-warning/10 text-theme-warning border-theme-warning/20";
                          }
                        } else if (hasApprovedLeave) {
                          cellText = "LV";
                          cellColor =
                            "bg-theme-accent-muted text-theme-accent border-theme-border";
                        }

                        return (
                          <td key={idx} className="px-1 py-3 text-center">
                            <span
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-theme text-xs font-semibold border transition-colors ${cellColor}`}
                            >
                              {cellText}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-4 text-xs font-semibold text-theme-muted pt-2">
          <span className="flex items-center">
            <span className="w-4 h-4 rounded-theme bg-theme-success/10 border border-theme-success/20 mr-1.5 inline-block text-center text-[10px] text-theme-success font-bold">
              P
            </span>{" "}
            Present
          </span>
          <span className="flex items-center">
            <span className="w-4 h-4 rounded-theme bg-theme-warning/10 border border-theme-warning/20 mr-1.5 inline-block text-center text-[10px] text-theme-warning font-bold">
              L
            </span>{" "}
            Late check-in
          </span>
          <span className="flex items-center">
            <span className="w-4 h-4 rounded-theme bg-theme-danger/10 border border-theme-danger/20 mr-1.5 inline-block text-center text-[10px] text-theme-danger font-bold">
              A
            </span>{" "}
            Absent / No Check-in
          </span>
          <span className="flex items-center">
            <span className="w-4 h-4 rounded-theme bg-theme-accent-muted border border-theme-border mr-1.5 inline-block text-center text-[10px] text-theme-accent font-bold">
              LV
            </span>{" "}
            Approved Leave
          </span>
        </div>
      </div>

      {/* Leave Requests Management */}
      <LeaveRequestsManagement
        leaveRequests={leaveRequests}
        users={users}
        updateLeaveStatus={updateLeaveStatus}
        logAuditEvent={logAuditEvent}
        user={user}
        safeFormatDateTime={safeFormatDateTime}
      />
    </div>
  );
}
