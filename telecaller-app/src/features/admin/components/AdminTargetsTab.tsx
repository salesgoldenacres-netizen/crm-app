import { useState, useEffect } from "react";
import { Users, Activity, Globe, Megaphone } from "lucide-react";
import { useCallTargetStore, useGoalsStore, useAuditLogsStore } from "@/features/admin/hooks/adminStores";
import { useNotificationsStore } from "@/features/dashboard/hooks/useNotificationsStore";
import { User } from "@/shared/types";
import Button from "@/shared/components/ui/Button";
import {
  FIELD_CONTROL_CLASS,
  FIELD_LABEL_CLASS,
} from "@/shared/components/ui/formField";
import { useToast } from "@/shared/components/Toast";

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
  const { toast } = useToast();
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
          <div className="bg-theme-card rounded-theme shadow-sm border border-theme-border p-6 transition-colors">
            <h3 className="type-card-title text-theme-text mb-4 pb-2 border-b border-theme-border flex items-center">
              <Users className="w-5 h-5 mr-2 text-theme-accent" aria-hidden="true" />
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
                        <div className="w-8 h-8 rounded-full bg-theme-accent-muted border border-theme-border flex items-center justify-center font-semibold text-theme-accent uppercase text-xs">
                          {tc.username[0]}
                        </div>
                        <div>
                          <span className="font-semibold text-theme-text block text-sm">
                            {tc.username}{" "}
                            <span className="text-[10px] text-theme-muted font-normal">
                              ({tc.role})
                            </span>
                          </span>
                          <span className="text-[10px] text-theme-muted tabular-nums" title={tc.id}>
                            Agent account
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
                              toast(
                                `Successfully updated targets for ${tc.username}!`,
                                "success"
                              );
                            } catch (err: any) {
                              console.error(err);
                              toast(
                                "Failed to update targets: " + err.message,
                                "error"
                              );
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
                <p className="text-center py-6 text-theme-muted text-xs">
                  No agent accounts exist to configure targets.
                </p>
              )}
            </div>
          </div>

          {/* Team Goals Card */}
          <div className="bg-theme-card rounded-theme shadow-sm border border-theme-border p-6 transition-colors">
            <h3 className="type-card-title text-theme-text mb-4 pb-2 border-b border-theme-border flex items-center">
              <Activity className="w-5 h-5 mr-2 text-theme-accent" aria-hidden="true" />
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
                  toast("Team goals updated successfully!", "success");
                } catch (err: any) {
                  console.error(err);
                  toast(
                    "Failed to update team goals: " + err.message,
                    "error"
                  );
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
                    className="mt-1 block w-full border-theme-border dark:bg-theme-surface dark:text-theme-text rounded-md text-xs p-2 border font-semibold"
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
                    className="mt-1 block w-full border-theme-border dark:bg-theme-surface dark:text-theme-text rounded-md text-xs p-2 border font-semibold"
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
                    className="mt-1 block w-full border-theme-border dark:bg-theme-surface dark:text-theme-text rounded-md text-xs p-2 border font-semibold"
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
                  className="mt-1 block w-full border-theme-border dark:bg-theme-surface dark:text-theme-text rounded-md text-xs p-2 border"
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
          <div className="bg-theme-card rounded-theme shadow-sm border border-theme-border p-6 transition-colors space-y-4">
            <h3 className="text-base font-bold text-theme-text mb-2 pb-2 border-b border-theme-border flex items-center">
              <Globe className="w-5 h-5 mr-2 text-theme-accent" aria-hidden="true" />
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
                  toast("Please type a message first.", "warning");
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

                  toast(
                    "Announcement broadcasted successfully to all users!",
                    "success"
                  );
                  setAnnouncementForm({ message: "", type: "info" });
                } catch (err: any) {
                  console.error(err);
                  toast(
                    "Failed to broadcast announcement: " + err.message,
                    "error"
                  );
                }
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="announcement-type" className={FIELD_LABEL_CLASS}>
                  Notification Type
                </label>
                <select
                  id="announcement-type"
                  value={announcementForm.type}
                  onChange={(e) =>
                    setAnnouncementForm({
                      ...announcementForm,
                      type: e.target.value,
                    })
                  }
                  className={`mt-1 ${FIELD_CONTROL_CLASS}`}
                >
                  <option value="info">Information (Blue)</option>
                  <option value="success">Success (Green)</option>
                  <option value="warning">Warning (Amber)</option>
                  <option value="important">
                    Critical / Action Required (Red)
                  </option>
                </select>
              </div>

              <div>
                <label htmlFor="announcement-message" className={FIELD_LABEL_CLASS}>
                  Announcement Message
                </label>
                <textarea
                  id="announcement-message"
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
                  className={`mt-1 ${FIELD_CONTROL_CLASS}`}
                />
              </div>
              <Button type="submit" variant="primary" className="w-full gap-1.5">
                <Megaphone className="w-4 h-4" aria-hidden="true" />
                Broadcast Announcement
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
