import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/shared/services/firebase";
import { Goals } from "@/shared/types";
import { SettingsRepository } from "@/shared/services/firebase/repositories";

export interface UseGoalsStoreOptions {
  /** When false, skip the live listener (Dashboard lazy-subscribe). */
  enabled?: boolean;
}

export function useGoalsStore(options: UseGoalsStoreOptions = {}) {
  const { enabled = true } = options;
  const [goals, setGoals] = useState<Goals>({
    monthlyCallGoal: 1000,
    monthlyBookingGoal: 20,
    customGoalText: "Aim to close 15 plots in Golden Acres this month!",
    targetRevenue: 5000000,
  });
  const [isLoaded, setIsLoaded] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = onSnapshot(doc(db, "settings", "goals"), (docSnap) => {
      if (docSnap.exists()) setGoals(docSnap.data() as Goals);
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [enabled]);

  const updateGoals = async (updatedGoals: Partial<Goals>) => {
    const finalGoals: Goals = {
      monthlyCallGoal: updatedGoals.monthlyCallGoal !== undefined ? updatedGoals.monthlyCallGoal : goals.monthlyCallGoal,
      monthlyBookingGoal: updatedGoals.monthlyBookingGoal !== undefined ? updatedGoals.monthlyBookingGoal : goals.monthlyBookingGoal,
      customGoalText: updatedGoals.customGoalText !== undefined ? updatedGoals.customGoalText : goals.customGoalText,
      targetRevenue: updatedGoals.targetRevenue !== undefined ? updatedGoals.targetRevenue : goals.targetRevenue,
      updatedAt: new Date().toISOString(),
    };
    await SettingsRepository.setGoals(finalGoals);
  };

  return { goals, isLoaded, updateGoals };
}
