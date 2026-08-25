import {
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/shared/services/firebase";
import { dealsRef } from "../converters";
import { COLLECTIONS } from "@/shared/constants";
import { Deal, CreateDealPayload, DealStage } from "@/shared/types";

export const DealsRepository = {
  async create(payload: CreateDealPayload): Promise<string> {
    const now = new Date().toISOString();
    const newDealData: Omit<Deal, "id"> = {
      ...payload,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(dealsRef, newDealData as Deal);
    return docRef.id;
  },

  async updateStage(dealId: string, newStage: DealStage): Promise<void> {
    const dealDoc = doc(db, COLLECTIONS.DEALS, dealId);
    const now = new Date().toISOString();

    const updates: Record<string, unknown> = {
      stage: newStage,
      updatedAt: now,
    };

    if (newStage === "closed_won" || newStage === "closed_lost") {
      updates.closedAt = now;
    }

    await updateDoc(dealDoc, updates);
  },

  async update(dealId: string, patch: Partial<Deal>): Promise<void> {
    const dealDoc = doc(db, COLLECTIONS.DEALS, dealId);
    const now = new Date().toISOString();

    await updateDoc(dealDoc, {
      ...patch,
      updatedAt: now,
    });
  },

  async delete(dealId: string): Promise<void> {
    const dealDoc = doc(db, COLLECTIONS.DEALS, dealId);
    await deleteDoc(dealDoc);
  },

  subscribe(
    options: { projectId?: string; assignedTo?: string },
    onNext: (deals: Deal[]) => void,
    onError?: (err: Error) => void
  ) {
    const constraints = [];

    if (options.projectId && options.projectId !== "all") {
      constraints.push(where("projectId", "==", options.projectId));
    }

    if (options.assignedTo && options.assignedTo !== "all") {
      constraints.push(where("assignedTo", "==", options.assignedTo));
    }

    const q = query(dealsRef, ...constraints);

    return onSnapshot(
      q,
      (snapshot) => {
        const deals = snapshot.docs.map((docSnap) => docSnap.data());
        deals.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        onNext(deals);
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  },
};
