import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/shared/services/firebase";

/**
 * Uploads a file to Firebase Storage under `{folder}/{timestamp}_{filename}`
 * and returns the download URL.
 */
export async function uploadFile(folder: string, file: File): Promise<string> {
  const fileRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(fileRef, file);
  return getDownloadURL(snapshot.ref);
}
