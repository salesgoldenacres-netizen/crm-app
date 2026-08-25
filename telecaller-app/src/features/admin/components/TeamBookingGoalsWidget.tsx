import { useDashboardContext } from "@/features/dashboard/context/DashboardContext";
import { Target, Trophy, Award } from "lucide-react";

export default function TeamBookingGoalsWidget() {
  const { bookedCount, goals } = useDashboardContext();

  const targetBookings = goals?.monthlyBookingGoal || 20;
  const targetRevenue = goals?.targetRevenue || 50000000;
  const currentBookings = bookedCount || 0;
  const avgDealValue = targetBookings > 0 ? targetRevenue / targetBookings : 2500000;
  const currentRevenue = currentBookings * avgDealValue;

  const bookingAchievedPct = Math.min(Math.round((currentBookings / targetBookings) * 100), 100);
  const revenueAchievedPct = Math.min(Math.round((currentRevenue / targetRevenue) * 100), 100);

  const formatRupees = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  return (
    <div className="bg-theme-card border border-theme-border rounded-xl p-4 shadow-xs space-y-3.5 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-theme-text">Team Booking Goals</h3>
              <p className="text-xs text-theme-muted">Monthly sales targets vs closed plots</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
            <Trophy className="w-3.5 h-3.5" />
            {bookingAchievedPct}% Goal
          </div>
        </div>

        {/* Goal 1: Plot Bookings */}
        <div className="space-y-3 mt-3.5">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-theme-text font-semibold">Plot Bookings Target</span>
              <span className="font-extrabold text-theme-text">
                {currentBookings} / {targetBookings} Plots
              </span>
            </div>
            <div className="h-2.5 w-full bg-theme-surface rounded-full overflow-hidden flex">
              <div
                className="h-full bg-amber-500 transition-all duration-500 rounded-full"
                style={{ width: `${Math.max(bookingAchievedPct, 5)}%` }}
              />
            </div>
          </div>

          {/* Goal 2: Revenue Target */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-theme-text font-semibold">Revenue Pipeline Target</span>
              <span className="font-extrabold text-theme-text">
                {formatRupees(currentRevenue)} / {formatRupees(targetRevenue)}
              </span>
            </div>
            <div className="h-2.5 w-full bg-theme-surface rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                style={{ width: `${Math.max(revenueAchievedPct, 5)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="bg-theme-surface/60 border border-theme-border rounded-lg p-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-theme-muted">
          <Award className="w-4 h-4 text-amber-500" />
          <span>Status</span>
        </div>
        <span className="font-bold text-emerald-500">
          {bookingAchievedPct >= 80 ? "On Track for Target" : "Active Target Period"}
        </span>
      </div>
    </div>
  );
}
