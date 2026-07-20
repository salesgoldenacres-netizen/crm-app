import { useState, useEffect } from "react";
import { EventLog } from "@/shared/types";
import { SettingsRepository } from "@/shared/services/firebase/repositories";

export interface UseEventsStoreOptions {
  /** When false, skip the live listener (Dashboard lazy-subscribe). */
  enabled?: boolean;
}

export function useEventsStore(options: UseEventsStoreOptions = {}) {
  const { enabled = true } = options;
  const [events, setEvents] = useState<EventLog[]>([]);
  const [isLoaded, setIsLoaded] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = SettingsRepository.subscribeEvents((list) => {
      setEvents(list);
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [enabled]);

  const saveEvents = async (list: EventLog[]) => {
    await SettingsRepository.setEvents(list);
  };

  const addEvent = async (event: Omit<EventLog, "id">) => {
    const newId = Date.now().toString();
    await saveEvents([...events, { ...event, id: newId }]);
  };

  const deleteEvent = async (id: string) => {
    await saveEvents(events.filter((e) => e.id !== id));
  };

  return { events, isLoaded, addEvent, deleteEvent, saveEvents };
}
