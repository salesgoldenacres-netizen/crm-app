import { httpsCallable } from "firebase/functions";
import { functions } from "@/shared/services/firebase";

export async function setManagerialClaim(params: {
  uid: string;
  managerial: boolean;
  role?: string;
}): Promise<{ success: boolean; uid: string; managerial: boolean; role: string | null }> {
  const fn = httpsCallable(functions, "setManagerialClaim");
  const res = await fn(params);
  return res.data as {
    success: boolean;
    uid: string;
    managerial: boolean;
    role: string | null;
  };
}

export async function linkUserProfile(): Promise<{
  success: boolean;
  userId: string;
  uid: string;
  role: string;
}> {
  const fn = httpsCallable(functions, "linkUserProfile");
  const res = await fn({});
  return res.data as {
    success: boolean;
    userId: string;
    uid: string;
    role: string;
  };
}
