import { useState, useEffect } from "react";
import { Users, Activity, Globe } from "lucide-react";
import { useCallTargetStore, useGoalsStore, useAuditLogsStore } from "@/features/admin/hooks/adminStores";
import { useNotificationsStore } from "@/features/dashboard/hooks/useNotificationsStore";
import { User } from "@/shared/types";

interface AdminTargetsTabProps {
  user: User;
  users: User[];
  isManagerial: (role: string) => boolean;
}

export default function AdminTargetsTab({
  user,
  users,
  isManagerial: checkIsManagerial,
}: AdminTargetsTabProps) {
  const { targets, updateCallTarget } = useCallTargetStore();
  const { goals, updateGoals } = useGoalsStore();
  const { logAuditEvent } = useAuditLogsStore();
  const { addNotification } = useNotificationsStore(user.id);

  const [goalsForm, setGoalsForm] = useState({
    monthlyCallGoal: 1000,
    monthlyBookingGoal: 20,
    customGoalText: "",
    targetRevenue: 5000000,
  });

  const [announcementForm, setAnnouncementForm] = useState({
    message: "",
    type: "info",
  });

  useEffect(() => {
    if (goals) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setGoalsForm({
        monthlyCallGoal: goals.monthlyCallGoal || 1000,
        monthlyBookingGoal: goals.monthlyBookingGoal || 20,
        customGoalText: goals.customGoalText || "",
        targetRevenue: goals.targetRevenue || 5000000,
      });
    }
  }, [goals]);

  return (
    <div className="space-y-6 animate-fadeIn text-sm">
      

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Telecaller Targets Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-theme-card rounded-xl shadow-sm border border-theme-border p-6 transition-colors">
            <h3 className="text-base font-bold text-theme-text mb-4 pb-2 border-b dark:border-gray-700 flex items-center">
              <Users className="w-5 h-5 mr-2 text-indigo-500" />
              Agent Target Settings
            </h3>
            <p className="text-xs text-theme-muted mb-4">
              Configure individual daily call targets and monthly booking
              targets for each active agent.
            </p>

            <div className="divide-y divide-theme-border">
              {users
                .filter((u) => !checkIsManagerial(u.role))
                .map((tc) => {
                  const callTarget = targets[tc.id]?.targetCount || 50;
                  const bookingTarget = targets[tc.id]?.bookingTargetCount || 5;

                  return (
                    <div
                      key={tc.id}
                      className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center font-bold text-theme-accent uppercase text-xs">
                          {tc.username[0]}
                        </div>
                        <div>
                          <span className="font-bold text-gray-800 dark:text-white block text-sm">
                            {tc.username}{" "}
                            <span className="text-[10px] text-gray-400 font-normal">
                              ({tc.role})
                            </span>
                          </span>
                          <span className="text-[10px] text-gray-400">
                            ID: {tc.id}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <label className="text-xs text-theme-muted font-medium">
                            Daily Calls:
                          </label>
                          <input
                            type="number"
                            className="w-16 bg-theme-surface dark:text-white border border-theme-border rounded p-1 text-xs text-center font-bold"
                            defaultValue={callTarget}
                            id={`call-target-${tc.id}`}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <label className="text-xs text-theme-muted font-medium">
                            Monthly Bookings:
                          </label>
                          <input
                            type="number"
                            className="w-16 bg-theme-surface dark:text-white border border-theme-border rounded p-1 text-xs text-center font-bold"
                            defaultValue={bookingTarget}
                            id={`booking-target-${tc.id}`}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            const callInput = document.getElementById(
                              `call-target-${tc.id}`
                            ) as HTMLInputElement | null;
                            const bookingInput = document.getElementById(
                              `booking-target-${tc.id}`
                            ) as HTMLInputElement | null;
                            if (!callInput || !bookingInput) return;
                            const cVal = parseInt(callInput.value) || 50;
                            const bVal = parseInt(bookingInput.value) || 5;

                            try {
                              await updateCallTarget(tc.id, cVal, bVal);
                              await logAuditEvent({
                                action: "Update Agent Targets",
                                details: `Updated ${tc.username}'s Daily Call Target to ${cVal} and Monthly Booking Target to ${bVal}.`,
                                user: user.username,
                              });
                              alert(
                                `Successfully updated targets for ${tc.username}!`
                              );
                            } catch (err: any) {
                              console.error(err);
                              alert("Failed to update targets: " + err.message);
                            }
                          }}
                          className="px-3 py-1 bg-theme-accent hover:opacity-90 text-white rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer border-0"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  );
                })}

              {users.filter((u) => !checkIsManagerial(u.role)).length === 0 && (
                <p className="text-center py-6 text-gray-400 italic text-xs">
                  No agent accounts exist to configure targets.
                </p>
              )}
            </div>
          </div>

          {/* Team Goals Card */}
          <div className="bg-theme-card rounded-xl shadow-sm border border-theme-border p-6 transition-colors">
            <h3 className="text-base font-bold text-theme-text mb-4 pb-2 border-b dark:border-gray-700 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-indigo-500" />
              Team Monthly Goal Setting
            </h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await updateGoals(goalsForm);
                  await logAuditEvent({
                    action: "Update Team Goals",
                    details: `Updated team monthly goals: Calls=${goalsForm.monthlyCallGoal}, Bookings=${goalsForm.monthlyBookingGoal}, Revenue=${goalsForm.targetRevenue}.`,
                    user: user.username,
                  });
                  alert("Team goals updated successfully!");
                } catch (err: any) {
                  console.error(err);
                  alert("Failed to update team goals: " + err.message);
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-theme-muted uppercase">
                    Monthly Call Target
                  </label>
                  <input
                    type="number"
                    value={goalsForm.monthlyCallGoal}
                    onChange={(e) =>
                      setGoalsForm({
                        ...goalsForm,
                        monthlyCallGoal: parseInt(e.target.value) || 0,
                      })
                    }
                    className="mt-1 block w-full border-theme-border dark:bg-gray-900 dark:text-white rounded-md text-xs p-2 border font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-theme-muted uppercase">
                    Monthly Booking Target
                  </label>
                  <input
                    type="number"
                    value={goalsForm.monthlyBookingGoal}
                    onChange={(e) =>
                      setGoalsForm({
                        ...goalsForm,
                        monthlyBookingGoal: parseInt(e.target.value) || 0,
                      })
                    }
                    className="mt-1 block w-full border-theme-border dark:bg-gray-900 dark:text-white rounded-md text-xs p-2 border font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-theme-muted uppercase">
                    Monthly Target Revenue (₹)
                  </label>
                  <input
                    type="number"
                    value={goalsForm.targetRevenue}
                    onChange={(e) =>
                      setGoalsForm({
                        ...goalsForm,
                        targetRevenue: parseInt(e.target.value) || 0,
                      })
                    }
                    className="mt-1 block w-full border-theme-border dark:bg-gray-900 dark:text-white rounded-md text-xs p-2 border font-semibold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-theme-muted uppercase">
                  Custom Goal Message
                </label>
                <textarea
                  rows={2}
                  value={goalsForm.customGoalText}
                  onChange={(e) =>
                    setGoalsForm({
                      ...goalsForm,
                      customGoalText: e.target.value,
                    })
                  }
                  placeholder="e.g. Focus on converting Sri Balaji Nagar warm leads this week!"
                  className="mt-1 block w-full border-theme-border dark:bg-gray-900 dark:text-white rounded-md text-xs p-2 border"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-theme-accent hover:opacity-90 text-white rounded-md shadow-sm font-semibold text-xs transition-colors cursor-pointer border-0"
                >
                  Update Team Goals
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Broadcast Announcements Column */}
        <div className="lg:col-span-1">
          <div className="bg-theme-card rounded-xl shadow-sm border border-theme-border p-6 transition-colors space-y-4">
            <h3 className="text-base font-bold text-theme-text mb-2 pb-2 border-b dark:border-gray-700 flex items-center">
              <Globe className="w-5 h-5 mr-2 text-indigo-500" />
              Broadcast Announcement
            </h3>
            <p className="text-xs text-theme-muted leading-relaxed">
              Publish an announcement notification visible to all telecallers on
              their dashboard.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!announcementForm.message.trim()) {
                  alert("Please type a message first.");
                  return;
                }

                try {
                  await addNotification({
                    userId: "", // global broadcast
                    message: announcementForm.message,
                    type: announcementForm.type,
                  });

                  await logAuditEvent({
                    action: "Broadcast Announcement",
                    details: `Broadcasted "${announcementForm.type}" announcement: "${announcementForm.message}"`,
                    user: user.username,
                  });

                  alert("Announcement broadcasted successfully to all users!");
                  setAnnouncementForm({ message: "", type: "info" });
                } catch (err: any) {
                  console.error(err);
                  alert("Failed to broadcast announcement: " + err.message);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-theme-muted uppercase">
                  Notification Type
                </label>
                <select
                  value={announcementForm.type}
                  onChange={(e) =>
                    setAnnouncementForm({
                      ...announcementForm,
                      type: e.target.value,
                    })
                  }
                  className="mt-1 block w-full border-theme-border dark:bg-gray-900 dark:text-white rounded-md text-xs p-2 border"
                >
                  <option value="info">💡 Information (Blue)</option>
                  <option value="success">🎉 Success (Green)</option>
                  <option value="warning">⚠️ Warning (Amber)</option>
                  <option value="important">
                    🔥 Critical / Action Required (Red)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-theme-muted uppercase">
                  Announcement Message
                </label>
                <textarea
                  rows={4}
                  value={announcementForm.message}
                  onChange={(e) =>
                    setAnnouncementForm({
                      ...announcementForm,
                      message: e.target.value,
                    })
                  }
                  placeholder="Type announcement here..."
                  required
                  className="mt-1 block w-full border-theme-border dark:bg-gray-900 dark:text-white rounded-md text-xs p-2 border"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-md shadow-md font-bold text-xs transition-all transform active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-1 border-0"
              >
                <span>📢</span> <span>Broadcast Announcement</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
