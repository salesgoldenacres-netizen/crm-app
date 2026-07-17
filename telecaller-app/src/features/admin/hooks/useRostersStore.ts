import { useState, useEffect } from "react";
import { onSnapshot } from "firebase/firestore";
import { Roster } from "@/shared/types";
import { rostersRef } from "@/shared/services/firebase/converters";
import { RostersRepository } from "@/shared/services/firebase/repositories";

export interface UseRostersStoreOptions {
  /** When false, skip the live listener (Dashboard lazy-subscribe). */
  enabled?: boolean;
}

export function useRostersStore(options: UseRostersStoreOptions = {}) {
  const { enabled = true } = options;
  const [rosters, setRosters] = useState<Record<string, Roster>>({});
  const [isLoaded, setIsLoaded] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = onSnapshot(rostersRef, (snapshot) => {
      const rost: Record<string, Roster> = {};
      snapshot.forEach((d) => {
        rost[d.id] = d.data();
      });
      setRosters(rost);
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [enabled]);

  const updateRoster = async (
    weekId: string,
    schedule: Record<string, string>,
  ) => {
    const newRoster: Roster = {
      weekId,
      schedule,
      updatedAt: new Date().toISOString(),
    };
    await RostersRepository.set(weekId, newRoster);
  };

  return { rosters, isLoaded, updateRoster };
}
