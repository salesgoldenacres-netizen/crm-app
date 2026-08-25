import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Deal,
  CreateDealPayload,
  DealStage,
  DealMetrics,
  DEAL_STAGES,
} from "../types";
import {
  subscribeToDeals,
  createDealInDb,
  updateDealStageInDb,
  updateDealInDb,
  deleteDealFromDb,
} from "../services/dealsService";
import { useToast } from "@/shared/components/Toast";

interface UseDealsOptions {
  projectId?: string;
  assignedTo?: string;
}

export function useDeals(options: UseDealsOptions = {}) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const currentKey = `${options.projectId || "all"}:${options.assignedTo || "all"}`;
  const isLoading = loadedKey !== currentKey && error === null;

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = subscribeToDeals(
      { projectId: options.projectId, assignedTo: options.assignedTo },
      (fetchedDeals) => {
        if (isMounted) {
          setDeals(fetchedDeals);
          setLoadedKey(currentKey);
          setError(null);
        }
      },
      (err) => {
        if (isMounted) {
          console.error("Error fetching deals:", err);
          setError("Failed to load deals data.");
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [options.projectId, options.assignedTo, currentKey]);

  const metrics: DealMetrics = useMemo(() => {
    let totalPipelineValue = 0;
    let weightedPipelineValue = 0;
    let closedWonValue = 0;
    let closedWonCount = 0;
    let closedLostCount = 0;

    deals.forEach((deal) => {
      const stageConfig = DEAL_STAGES.find((s) => s.id === deal.stage);
      const prob = stageConfig ? stageConfig.probability / 100 : 0;
      const amount = deal.amount || 0;

      if (deal.stage !== "closed_lost") {
        totalPipelineValue += amount;
        weightedPipelineValue += amount * prob;
      }

      if (deal.stage === "closed_won") {
        closedWonValue += amount;
        closedWonCount += 1;
      }

      if (deal.stage === "closed_lost") {
        closedLostCount += 1;
      }
    });

    const finishedCount = closedWonCount + closedLostCount;
    const winRate = finishedCount > 0 ? Math.round((closedWonCount / finishedCount) * 100) : 0;

    return {
      totalDeals: deals.length,
      totalPipelineValue,
      weightedPipelineValue,
      closedWonValue,
      closedWonCount,
      winRate,
    };
  }, [deals]);

  const createDeal = useCallback(
    async (payload: CreateDealPayload) => {
      try {
        const id = await createDealInDb(payload);
        toast(`Deal "${payload.title}" created successfully!`, "success");
        return id;
      } catch (err) {
        console.error("Failed to create deal:", err);
        toast("Failed to create deal. Please try again.", "error");
        throw err;
      }
    },
    [toast]
  );

  const updateDealStage = useCallback(
    async (dealId: string, newStage: DealStage) => {
      try {
        await updateDealStageInDb(dealId, newStage);
        const stageName = DEAL_STAGES.find((s) => s.id === newStage)?.name || newStage;
        toast(`Deal moved to ${stageName}`, "info");
      } catch (err) {
        console.error("Failed to update deal stage:", err);
        toast("Failed to move deal. Please try again.", "error");
      }
    },
    [toast]
  );

  const updateDeal = useCallback(
    async (dealId: string, patch: Partial<Deal>) => {
      try {
        await updateDealInDb(dealId, patch);
        toast("Deal updated successfully.", "success");
      } catch (err) {
        console.error("Failed to update deal:", err);
        toast("Failed to update deal details.", "error");
      }
    },
    [toast]
  );

  const deleteDeal = useCallback(
    async (dealId: string) => {
      try {
        await deleteDealFromDb(dealId);
        toast("Deal deleted successfully.", "info");
      } catch (err) {
        console.error("Failed to delete deal:", err);
        toast("Failed to delete deal.", "error");
      }
    },
    [toast]
  );

  return {
    deals,
    metrics,
    isLoading,
    error,
    createDeal,
    updateDealStage,
    updateDeal,
    deleteDeal,
  };
}
