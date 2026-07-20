import { DollarSign, TrendingUp, PhoneCall, Inbox } from "lucide-react";

interface AdminDashboardKPICardsProps {
  totalRevenue: number;
  targetPercent: number;
  targetRevenue: number;
  conversionRate: string;
  bookedLeadsCount: number;
  totalLeadsCount: number;
  totalCallsTodayCount: number;
  formattedAvgDuration: string;
  hotLeadsCount: number;
  pendingLeavesCount: number;
  pendingDiscountsCount: number;
  formatRevenue: (val: number) => string;
}

const cardShell =
  "rounded-theme border border-theme-border bg-theme-card shadow-elevation-sm p-3 flex flex-col justify-between gap-2.5 min-h-0";

export default function AdminDashboardKPICards({
  totalRevenue,
  targetPercent,
  targetRevenue,
  conversionRate,
  bookedLeadsCount,
  totalLeadsCount,
  totalCallsTodayCount,
  formattedAvgDuration,
  hotLeadsCount,
  pendingLeavesCount,
  pendingDiscountsCount,
  formatRevenue,
}: AdminDashboardKPICardsProps) {
  const clamped = Math.min(100, Math.max(0, targetPercent));
  const pendingTotal = pendingLeavesCount + pendingDiscountsCount;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {/* Revenue */}
      <div className={cardShell}>
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-wider text-theme-muted block">
              Estimated Revenue
            </span>
            <span className="text-xl font-bold text-theme-text mt-0.5 block truncate">
              {formatRevenue(totalRevenue)}
            </span>
          </div>
          <div className="p-1.5 rounded-lg bg-theme-accent-muted shrink-0">
            <DollarSign className="w-3.5 h-3.5 text-theme-accent" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex justify-center shrink-0 w-16 h-10">
            <svg className="w-16 h-10" viewBox="0 0 120 70" aria-hidden>
              <defs>
                <linearGradient id="companyGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--theme-accent)" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="var(--theme-accent)" />
                </linearGradient>
              </defs>
              <path
                d="M 10 60 A 50 50 0 0 1 110 60"
                fill="none"
                stroke="currentColor"
                className="text-theme-border"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M 10 60 A 50 50 0 0 1 110 60"
                fill="none"
                stroke="url(#companyGaugeGradient)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray="157.08"
                strokeDashoffset={157.08 * (1 - clamped / 100)}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-0.5">
              <span className="text-[11px] font-bold text-theme-text leading-none tabular-nums">
                {clamped}%
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0 text-[10px] text-theme-muted space-y-0.5">
            <div className="flex justify-between gap-2">
              <span>Target</span>
              <span className="font-bold text-theme-text truncate">
                {formatRevenue(targetRevenue)}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Current</span>
              <span className="font-bold text-theme-accent truncate">
                {formatRevenue(totalRevenue)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Conversion */}
      <div className={cardShell}>
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-wider text-theme-muted block">
              Lead Conversion
            </span>
            <span className="text-xl font-bold text-theme-text mt-0.5 block tabular-nums">
              {conversionRate}%
            </span>
          </div>
          <div className="p-1.5 rounded-lg bg-theme-success/15 shrink-0">
            <TrendingUp className="w-3.5 h-3.5 text-theme-success" />
          </div>
        </div>
        <div className="flex justify-between text-[10px] font-semibold text-theme-muted">
          <span>
            Booked <strong className="text-theme-text">{bookedLeadsCount}</strong>
          </span>
          <span>
            Total <strong className="text-theme-text">{totalLeadsCount}</strong>
          </span>
        </div>
      </div>

      {/* Calls */}
      <div className={cardShell}>
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-wider text-theme-muted block">
              Today&apos;s Calls
            </span>
            <span className="text-xl font-bold text-theme-text mt-0.5 block tabular-nums">
              {totalCallsTodayCount}
            </span>
          </div>
          <div className="p-1.5 rounded-lg bg-theme-accent-muted shrink-0">
            <PhoneCall className="w-3.5 h-3.5 text-theme-accent" />
          </div>
        </div>
        <div className="flex justify-between text-[10px] font-semibold text-theme-muted">
          <span>
            Avg <strong className="text-theme-text">{formattedAvgDuration}</strong>
          </span>
          <span>
            Hot <strong className="text-theme-warning">{hotLeadsCount}</strong>
          </span>
        </div>
      </div>

      {/* Approvals */}
      <div className={cardShell}>
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-wider text-theme-muted block">
              Pending Approvals
            </span>
            <span className="text-xl font-bold text-theme-text mt-0.5 block tabular-nums">
              {pendingTotal}
            </span>
          </div>
          <div className="p-1.5 rounded-lg bg-theme-warning/15 shrink-0">
            <Inbox className="w-3.5 h-3.5 text-theme-warning" />
          </div>
        </div>
        <div className="flex justify-between text-[10px] font-semibold text-theme-muted">
          <span>
            Leaves <strong className="text-theme-text">{pendingLeavesCount}</strong>
          </span>
          <span>
            Discounts <strong className="text-theme-text">{pendingDiscountsCount}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
