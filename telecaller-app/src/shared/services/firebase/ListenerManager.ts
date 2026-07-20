/**
 * ListenerManager
 * centralized stateless ref-counting manager for Firestore snapshot subscriptions.
 * Prevents multiple active listeners on identical query scopes or document references.
 */
export class ListenerManager {
  private static listeners = new Map<
    string,
    {
      unsubscribe: () => void;
      refCount: number;
      callbacks: Set<(data: unknown) => void>;
      lastEmitted: unknown | null;
    }
  >();

  /**
   * Subscribes a callback to a shared listener key.
   * If no active listener exists for the key, createListener is invoked to set it up.
   *
   * @param key Unique string identifier for the subscription scope.
   * @param createListener Factory function that starts the underlying listener and returns an unsubscribe function.
   * @param callback Callback function to invoke when new data is emitted.
   */
  public static subscribe<T>(
    key: string,
    createListener: (dispatch: (data: T) => void) => () => void,
    callback: (data: T) => void
  ): () => void {
    let listener = this.listeners.get(key);

    if (!listener) {
      const callbacks = new Set<(data: unknown) => void>();
      callbacks.add(callback as (data: unknown) => void);

      const dispatch = (data: T) => {
        const active = this.listeners.get(key);
        if (active) {
          active.lastEmitted = data;
          // Safeguard: Copy Set to prevent mutation bugs if unsubscribed during dispatch
          const callbackList = Array.from(active.callbacks);
          callbackList.forEach((cb) => {
            try {
              cb(data);
            } catch (err) {
              console.error(`ListenerManager callback error for key: ${key}`, err);
            }
          });
        }
      };

      const unsubscribe = createListener(dispatch);

      listener = {
        unsubscribe,
        refCount: 1,
        callbacks,
        lastEmitted: null,
      };
      this.listeners.set(key, listener);
    } else {
      listener.refCount++;
      listener.callbacks.add(callback as (data: unknown) => void);
      // Replay the last emitted data immediately to new subscribers (similar to BehaviorSubject)
      if (listener.lastEmitted !== null) {
        try {
          callback(listener.lastEmitted as T);
        } catch (err) {
          console.error(`ListenerManager immediate replay error for key: ${key}`, err);
        }
      }
    }

    return () => {
      const active = this.listeners.get(key);
      if (!active) return;

      active.callbacks.delete(callback as (data: unknown) => void);
      active.refCount--;

      if (active.refCount <= 0) {
        try {
          active.unsubscribe();
        } catch (err) {
          console.error(`ListenerManager error during unsubscribe for key: ${key}`, err);
        }
        this.listeners.delete(key);
      }
    };
  }

  /**
   * Retrieves the current active listener counts (for diagnostics/KPI verification).
   */
  public static getActiveCount(): number {
    return this.listeners.size;
  }

  /**
   * Retrieves detail diagnostics of active keys and their ref counts.
   */
  public static getDiagnostics(): Record<string, number> {
    const diag: Record<string, number> = {};
    this.listeners.forEach((val, key) => {
      diag[key] = val.refCount;
    });
    return diag;
  }
}
