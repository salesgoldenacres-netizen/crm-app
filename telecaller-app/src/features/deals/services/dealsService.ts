import { DealsRepository } from "@/shared/services/firebase/repositories";
import { Deal, CreateDealPayload, DealStage } from "../types";

export async function createDealInDb(payload: CreateDealPayload): Promise<string> {
  return DealsRepository.create(payload);
}

export async function updateDealStageInDb(
  dealId: string,
  newStage: DealStage
): Promise<void> {
  return DealsRepository.updateStage(dealId, newStage);
}

export async function updateDealInDb(
  dealId: string,
  patch: Partial<Deal>
): Promise<void> {
  return DealsRepository.update(dealId, patch);
}

export async function deleteDealFromDb(dealId: string): Promise<void> {
  return DealsRepository.delete(dealId);
}

export function subscribeToDeals(
  options: { projectId?: string; assignedTo?: string },
  onNext: (deals: Deal[]) => void,
  onError?: (err: Error) => void
) {
  return DealsRepository.subscribe(options, onNext, onError);
}
