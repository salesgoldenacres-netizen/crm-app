import { useState } from "react";
import { useRostersStore, useAuditLogsStore } from "@/features/admin/hooks/adminStores";
import { User } from "@/shared/types";
import DataTable, { ColumnDef } from "@/shared/components/DataTable";
import { useToast } from "@/shared/components/Toast";

interface AdminRosterTabProps {
  users: User[];
  isManagerial: (role: string) => boolean;
  user: User;
}

export default function AdminRosterTab({
  users,
  isManagerial: checkIsManagerial,
  user,
}: AdminRosterTabProps) {
  const { rosters, updateRoster } = useRostersStore();
  const { logAuditEvent } = useAuditLogsStore();
  const { toast } = useToast();

  const [selectedRosterWeek, setSelectedRosterWeek] = useState("2026-W23");
  const [rosterEdits, setRosterEdits] = useState<Record<string, Record<string, string>>>({});

  const columns: ColumnDef<User>[] = [
    {
      key: "username",
      header: "Agent",
      sortable: true,
      render: (tc) => (
        <div className="text-sm font-semibold text-theme-text">
          {tc.username}{" "}
          <span className="text-[10px] text-theme-muted font-normal">
            ({tc.role})
          </span>
        </div>
      ),
    },
    ...["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
      key: day,
      header: day,
      className: "text-center",
      headerClassName: "text-center",
      render: (tc: User) => {
        const weekSched = (rosters[selectedRosterWeek]?.schedule || {}) as unknown as Record<string, Record<string, string>>;
        const tcSched = weekSched[tc.id] || {};
        const currentShift =
          rosterEdits[tc.id]?.[day] !== undefined
            ? rosterEdits[tc.id][day]
            : tcSched[day] || "morning_shift";

        return (
          <select
            value={currentShift}
            onChange={(e) => {
              const shift = e.target.value;
              setRosterEdits((prev) => ({
                ...prev,
                [tc.id]: {
                  ...(prev[tc.id] || tcSched),
                  [day]: shift,
                },
              }));
            }}
            className="text-xs bg-theme-surface text-theme-text border border-theme-border rounded-theme p-1.5 focus:ring-1 focus:ring-theme-ring"
          >
            <option value="morning_shift">Morning (9am-5pm)</option>
            <option value="evening_shift">Evening (1pm-9pm)</option>
            <option value="night_shift">Night (9pm-5am)</option>
            <option value="off">Weekly Off</option>
          </select>
        );
      },
    })),
  ];

  return (
    <div className="space-y-3 animate-fadeIn text-sm">
      <div className="flex justify-end mb-3 gap-2 flex-wrap">
        <select
          value={selectedRosterWeek}
          onChange={(e) => {
            setSelectedRosterWeek(e.target.value);
            setRosterEdits({});
          }}
          className="bg-theme-card text-theme-text border border-theme-border rounded-theme px-2 h-8 text-[11px] cursor-pointer"
        >
          <option value="2026-W22">Week 22 (May 25 - May 31, 2026)</option>
          <option value="2026-W23">Week 23 (Jun 01 - Jun 07, 2026)</option>
          <option value="2026-W24">Week 24 (Jun 08 - Jun 14, 2026)</option>
          <option value="2026-W25">Week 25 (Jun 15 - Jun 21, 2026)</option>
        </select>
        <button
          type="button"
          onClick={async () => {
            const currentWeekData =
              rosters[selectedRosterWeek]?.schedule || {};
            const mergedSchedule = { ...currentWeekData, ...rosterEdits };
            await updateRoster(selectedRosterWeek, mergedSchedule as any);
            await logAuditEvent({
              action: "Update Shift Roster",
              details: `Updated weekly shifts roster for week: ${selectedRosterWeek}`,
              user: user.username,
            });
            setRosterEdits({});
            toast("Roster saved successfully!", "success");
          }}
          className="px-2.5 h-8 bg-theme-accent hover:opacity-90 text-theme-accent-fg rounded-theme text-[11px] font-bold cursor-pointer border-0"
        >
          Save Roster
        </button>
      </div>

      <DataTable
        data={users.filter((u) => !checkIsManagerial(u.role))}
        columns={columns}
        getRowKey={(u) => u.id}
        pageSize={15}
      />
    </div>
  );
}
