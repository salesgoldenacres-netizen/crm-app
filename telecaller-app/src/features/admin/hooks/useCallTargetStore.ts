import { useState, useEffect } from "react";
import { onSnapshot } from "firebase/firestore";
import { CallTarget } from "@/shared/types";
import { callTargetsRef } from "@/shared/services/firebase/converters";
import { CallTargetsRepository } from "@/shared/services/firebase/repositories";

export interface UseCallTargetStoreOptions {
  /** When false, skip the live listener (Dashboard lazy-subscribe). */
  enabled?: boolean;
}

export function useCallTargetStore(options: UseCallTargetStoreOptions = {}) {
  const { enabled = true } = options;
  const [targets, setTargets] = useState<Record<string, CallTarget>>({});
  const [isLoaded, setIsLoaded] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = onSnapshot(callTargetsRef, (snapshot) => {
      const tgts: Record<string, CallTarget> = {};
      snapshot.forEach((d) => {
        tgts[d.id] = d.data();
      });
      setTargets(tgts);
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [enabled]);

  const updateCallTarget = async (
    userId: string,
    targetCount: number | string,
    bookingTargetCount: number | string,
  ) => {
    const newTarget: CallTarget = {
      userId,
      targetCount: parseInt(targetCount as string) || 50,
      bookingTargetCount: parseInt(bookingTargetCount as string) || 5,
      updatedAt: new Date().toISOString(),
    };
    await CallTargetsRepository.set(userId, newTarget);
  };

  return { targets, isLoaded, updateCallTarget };
}
