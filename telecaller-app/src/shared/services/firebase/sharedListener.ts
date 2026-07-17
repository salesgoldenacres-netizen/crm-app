/**
 * Ref-counted shared Firestore listeners.
 * Multiple hooks can subscribe to the same query key; only one onSnapshot is mounted.
 */

type ListenerState<T> = {
  refCount: number;
  data: T;
  loaded: boolean;
  subscribers: Set<() => void>;
  unsubscribeFs: (() => void) | null;
};

const registry = new Map<string, ListenerState<unknown>>();

export type SharedSnapshotResult<T> = {
  data: T;
  isLoaded: boolean;
};

/**
 * Subscribe to a shared listener keyed by `key`.
 * `attach` is called once when the first subscriber mounts; it must return an unsubscribe.
 * Call `emit(next)` from the Firestore callback to fan out updates.
 */
export function subscribeSharedListener<T>(
  key: string,
  initial: T,
  attach: (emit: (next: T, loaded?: boolean) => void) => () => void,
  onChange: (result: SharedSnapshotResult<T>) => void,
): () => void {
  let state = registry.get(key) as ListenerState<T> | undefined;

  if (!state) {
    state = {
      refCount: 0,
      data: initial,
      loaded: false,
      subscribers: new Set(),
      unsubscribeFs: null,
    };
    registry.set(key, state as ListenerState<unknown>);
  }

  const notify = () => {
    const snapshot: SharedSnapshotResult<T> = {
      data: state!.data,
      isLoaded: state!.loaded,
    };
    onChange(snapshot);
  };

  // Immediate sync with current cache (avoids flash when remounting)
  notify();

  const subscriber = () => notify();
  state.subscribers.add(subscriber);
  state.refCount += 1;

  if (state.refCount === 1) {
    const emit = (next: T, loaded = true) => {
      const current = registry.get(key) as ListenerState<T> | undefined;
      if (!current) return;
      current.data = next;
      current.loaded = loaded;
      current.subscribers.forEach((fn) => fn());
    };
    state.unsubscribeFs = attach(emit);
  }

  return () => {
    const current = registry.get(key) as ListenerState<T> | undefined;
    if (!current) return;
    current.subscribers.delete(subscriber);
    current.refCount -= 1;
    if (current.refCount <= 0) {
      current.unsubscribeFs?.();
      registry.delete(key);
    }
  };
}

/** Test/helper: clear all shared listeners (not for production UI). */
export function __resetSharedListenersForTests(): void {
  registry.forEach((state) => state.unsubscribeFs?.());
  registry.clear();
}
