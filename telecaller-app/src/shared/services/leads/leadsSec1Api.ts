import { httpsCallable } from "firebase/functions";
import { functions } from "@/shared/services/firebase";
import type { Lead } from "@/shared/types";

export interface LeadPipelineCounts {
  newCount: number;
  contactedCount: number;
  interestedCount: number;
  bookedCount: number;
  reservedCount: number;
  totalCount: number;
  callsLoggedToday: number;
}

export async function fetchLeadPipelineCounts(options?: {
  projectId?: string;
  assignedToUsername?: string;
}): Promise<LeadPipelineCounts> {
  const fn = httpsCallable(functions, "getLeadPipelineCounts");
  const res = await fn({
    projectId: options?.projectId,
    assignedToUsername: options?.assignedToUsername,
  });
  return res.data as LeadPipelineCounts;
}

export async function fetchLeadsByPhone(
  phone: string,
  max = 10,
): Promise<Lead[]> {
  if (!phone) return [];
  const fn = httpsCallable(functions, "findLeadsByPhone");
  const res = await fn({ phone, max });
  const payload = res.data as { leads?: Lead[] };
  return (payload.leads || []).map((row) => ({
    ...row,
    id: row.id,
  })) as Lead[];
}

export async function logAuditEventViaCallable(event: {
  action: string;
  details?: string;
  user?: string;
  changes?: Record<string, unknown> | null;
}): Promise<{ id: string }> {
  const fn = httpsCallable(functions, "logAuditEventCallable");
  const res = await fn(event);
  return res.data as { id: string };
}
