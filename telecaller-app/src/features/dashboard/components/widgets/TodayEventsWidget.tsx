import { Cake, Gift } from "lucide-react";
import EmptyState from "@/shared/components/ui/EmptyState";

interface TodayEvent {
  id: string;
  type: "birthday" | string;
  name: string;
}

interface TodayEventsWidgetProps {
  todaysEvents?: TodayEvent[] | null;
}

export default function TodayEventsWidget({ todaysEvents }: TodayEventsWidgetProps) {
  if (!todaysEvents || todaysEvents.length === 0) {
    return (
      <EmptyState
        variant="compact"
        hideIcon
        title="No events today"
        description="Birthdays and celebrations will appear here."
        className="border-0 bg-transparent py-6"
      />
    );
  }

  return (
    <div className="flex w-full flex-col gap-widget-tight">
      {todaysEvents.map((ev) => (
        <div
          key={ev.id}
          className="flex items-center rounded-theme border border-theme-border bg-theme-surface/60 p-2"
        >
          {ev.type === "birthday" ? (
            <Cake className="mr-2 h-4 w-4 shrink-0 text-theme-accent" aria-hidden />
          ) : (
            <Gift className="mr-2 h-4 w-4 shrink-0 text-theme-warning" aria-hidden />
          )}
          <div className="min-w-0 text-xs">
            <p className="type-card-title truncate font-semibold text-theme-text">
              {ev.name}
            </p>
            <p className="type-secondary text-[10px] capitalize text-theme-muted">
              {ev.type} today — consider a quick call
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
