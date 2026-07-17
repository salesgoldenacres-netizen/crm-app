import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  limit as fsLimit,
} from "firebase/firestore";
import { db } from "@/shared/services/firebase";
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

    const q = query(
      collection(db, "timelineEvents"),
      where("leadId", "==", leadId),
      orderBy("timestamp", "desc"),
      fsLimit(max),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (cancelled) return;
        setEvents(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              leadId: String(data.leadId || leadId),
              type: data.type,
              source: data.source || "system",
              sourceId: data.sourceId,
              conversationId: data.conversationId,
              messageId: data.messageId,
              summary: String(data.summary || ""),
              icon: data.icon || "note",
              actorId: data.actorId,
              actorName: data.actorName,
              metadata: data.metadata,
              timestamp: String(data.timestamp || data.createdAt || ""),
              createdAt: String(data.createdAt || data.timestamp || ""),
            } as TimelineEvent;
          }),
        );
        setError(null);
        setLoading(false);
      },
      (err) => {
        if (cancelled) return;
        console.error("timelineEvents subscribe failed", err);
        setError(err.message || "Failed to load timeline");
        setLoading(false);
      },
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
