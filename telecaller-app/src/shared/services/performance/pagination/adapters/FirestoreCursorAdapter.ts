// src/shared/services/performance/pagination/adapters/FirestoreCursorAdapter.ts
import { DocumentSnapshot } from "firebase/firestore";
import { CursorToken } from "../contracts/CursorToken";
import { CURSOR_VERSION } from "../contracts/paginationConstants";
import { InvalidCursorError } from "../contracts/PaginationErrors";

interface CursorPayload {
  readonly id: string;
  readonly path: string;
  readonly ver: number;
  readonly dir: "next" | "previous";
}

export class FirestoreCursorAdapter {
  /**
   * Encodes a DocumentSnapshot into a private, opaque CursorToken string.
   */
  public static encode(
    snapshot: DocumentSnapshot,
    direction: "next" | "previous"
  ): CursorToken {
    const payload: CursorPayload = {
      id: snapshot.id,
      path: snapshot.ref.path,
      ver: CURSOR_VERSION,
      dir: direction,
    };

    try {
      const jsonStr = JSON.stringify(payload);
      // Opaque conversion using base64 encoding
      const tokenValue = btoa(jsonStr);
      return tokenValue as CursorToken;
    } catch {
      throw new InvalidCursorError("Failed to serialize DocumentSnapshot.");
    }
  }

  /**
   * Decodes an opaque CursorToken payload.
   */
  public static decode(token: CursorToken): { id: string; path: string; direction: "next" | "previous" } {
    try {
      const rawJson = atob(token as string);
      const payload = JSON.parse(rawJson) as CursorPayload;

      if (payload.ver !== CURSOR_VERSION) {
        throw new InvalidCursorError(`Incompatible cursor version: ${payload.ver}`);
      }

      if (!payload.id || !payload.path) {
        throw new InvalidCursorError("Malformed cursor payload fields.");
      }

      return {
        id: payload.id,
        path: payload.path,
        direction: payload.dir,
      };
    } catch (e) {
      if (e instanceof InvalidCursorError) {
        throw e;
      }
      throw new InvalidCursorError();
    }
  }
}
