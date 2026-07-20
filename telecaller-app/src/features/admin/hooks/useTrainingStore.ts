import { useState, useEffect } from "react";
import { TrainingData } from "@/shared/types";
import { SettingsRepository } from "@/shared/services/firebase/repositories";

export interface UseTrainingStoreOptions {
  /** When false, skip the live listener (Dashboard lazy-subscribe). */
  enabled?: boolean;
}

export function useTrainingStore(options: UseTrainingStoreOptions = {}) {
  const { enabled = true } = options;
  const [trainingData, setTrainingData] = useState<TrainingData>({
    documents: [],
    videos: [],
    objections: [],
  });
  const [isLoaded, setIsLoaded] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = SettingsRepository.subscribeTraining((data) => {
      if (data) {
        setTrainingData(data);
      } else {
        // Initialize default training data if empty
        setTrainingData({
          documents: [
            { id: "1", title: "Golden Acres Project Presentation PDF", url: "https://example.com/docs/presentation.pdf" },
            { id: "2", title: "Sales Objections Playbook", url: "https://example.com/docs/objections.pdf" },
            { id: "3", title: "CRM Operations & Logging Walkthrough", url: "https://example.com/docs/crm-guide.pdf" },
          ],
          videos: [
            { id: "1", title: "How to pitch Golden Acres Phase 1 (12 mins)", url: "https://example.com/videos/pitch-phase1.mp4" },
            { id: "2", title: "Effective Objection Handling & Tone Tuning", url: "https://example.com/videos/objections-handling.mp4" },
          ],
          objections: [
            {
              id: "1",
              title: "Objection: The price is too high/outside my budget",
              content: [
                'Step 1 (Empathize): "I completely understand that budget is a major factor. Buying land is a large milestone."',
                'Step 2 (Validate): "Compared to standard apartments, investing in plots here actually gives you 2x the land ownership for the same capital layout."',
                'Step 3 (Value Prop): "Our plots are 100% RERA approved, meaning your investment is completely secure. We\'re seeing 15% appreciation yearly in this zone."',
                'Step 4 (Call to Action): "Can we schedule a 10-minute site visit this weekend so you can pick the best location before prices revise next month?"',
              ],
            },
            {
              id: "2",
              title: 'Handling the "Not interested right now" Objection',
              content: [
                'Often, "not right now" means "I haven\'t seen the urgency."',
                "I completely understand. Timing is everything. Just to keep you updated, the upcoming Metro Phase 3 is breaking ground just 2km from our site. Even if you aren't buying today, coming down for a quick look will give you a benchmark for future investments.",
              ],
            },
          ],
        });
      }
      setIsLoaded(true);
    });
    return () => unsubscribe();
  }, [enabled]);

  const updateTrainingData = async (newData: TrainingData) => {
    await SettingsRepository.setTrainingData(newData);
  };

  return { trainingData, isLoaded, updateTrainingData };
}
