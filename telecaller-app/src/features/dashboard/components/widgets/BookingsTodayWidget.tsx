import CircularProgressRing from "@/shared/components/CircularProgressRing";

interface BookingsTodayWidgetProps {
  bookingsToday: number;
  bookingTarget: number;
}

/**
 * BookingsTodayWidget (Wave 8 Phase 2C)
 * Decoupled presentation component.
 * Performs zero inline reductions or direct Firestore queries.
 */
export default function BookingsTodayWidget({
  bookingsToday,
  bookingTarget,
}: BookingsTodayWidgetProps) {
  const targetPct =
    bookingTarget > 0
      ? Math.round((bookingsToday / bookingTarget) * 100)
      : 0;
  const remaining = Math.max(0, bookingTarget - bookingsToday);

  return (
    <div className="flex flex-col items-center justify-center gap-widget w-full">
      <CircularProgressRing
        value={bookingsToday}
        max={bookingTarget}
        label="Bookings Completed"
        colorClass="text-theme-success"
        size={96}
        strokeWidth={9}
      />
      <div className="flex flex-col items-center gap-0.5 text-center">
        <p
          className={`type-label text-[11px] ${
            targetPct >= 100 ? "text-theme-success" : "text-theme-muted"
          }`}
        >
          {targetPct >= 100 ? "Target met" : `${remaining} to go · ${targetPct}%`}
        </p>
        <p className="type-secondary text-[10px] text-theme-muted">
          Monthly booking goal
        </p>
      </div>
    </div>
  );
}
