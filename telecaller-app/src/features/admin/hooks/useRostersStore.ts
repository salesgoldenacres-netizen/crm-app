import { useState, useEffect } from "react";
import { Roster } from "@/shared/types";
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

    const unsubscribe = RostersRepository.subscribe((rost) => {
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
