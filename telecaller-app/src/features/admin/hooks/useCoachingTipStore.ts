import { useState, useEffect } from "react";
import { SettingsRepository } from "@/shared/services/firebase/repositories";

export interface UseCoachingTipStoreOptions {
  /** When false, skip the live listener (Dashboard lazy-subscribe). */
  enabled?: boolean;
}

export function useCoachingTipStore(options: UseCoachingTipStoreOptions = {}) {
  const { enabled = true } = options;
  const [coachingTip, setCoachingTip] = useState(
    'Try asking open-ended questions like "What features are you looking for in an investment plot?"'
  );
  const [isLoaded, setIsLoaded] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = SettingsRepository.subscribeCoachingTip((text) => {
      setCoachingTip(text);
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [enabled]);

  const updateCoachingTip = async (text: string) => {
    await SettingsRepository.setCoachingTip(text);
  };

  return { coachingTip, isLoaded, updateCoachingTip };
}
