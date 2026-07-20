import { useEffect, useState } from "react";
import { TimelineEventsRepository } from "@/shared/services/firebase/repositories";
import type { TimelineEvent } from "../timelineTypes";

export function useTimelineEvents(leadId: string | null | undefined, max = 100) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!leadId) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) setLoading(true);
    }, 0);

    const unsub = TimelineEventsRepository.subscribe(
      leadId,
      max,
      (list) => {
        if (cancelled) return;
        setEvents(list);
        setError(null);
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      unsub();
    };
  }, [leadId, max]);

  if (!leadId) {
    return { events: [] as TimelineEvent[], loading: false, error: null };
  }

  return { events, loading, error };
}
