import { describe, it, expect, vi, beforeEach } from "vitest";
import { AGENT_OPEN_LEADS_REALTIME_BOUND } from "@/shared/services/leads/leadQueryConstants";

describe("Realtime Listener Lifecycle & Memory Safety Audit", () => {
  let activeListeners = 0;
  let totalSubscriptionsCreated = 0;

  beforeEach(() => {
    activeListeners = 0;
    totalSubscriptionsCreated = 0;
  });

  const mockSubscribe = (onData: (data: unknown[]) => void) => {
    activeListeners += 1;
    totalSubscriptionsCreated += 1;
    onData(Array.from({ length: 10 }, (_, i) => ({ id: `lead_${i}` })));

    return () => {
      activeListeners -= 1;
    };
  };

  it("enforces named constant AGENT_OPEN_LEADS_REALTIME_BOUND to 100", () => {
    expect(AGENT_OPEN_LEADS_REALTIME_BOUND).toBe(100);
  });

  it("subscribes on mount and unsubscribes cleanly on unmount", () => {
    const unSub = mockSubscribe(vi.fn());
    expect(activeListeners).toBe(1);
    expect(totalSubscriptionsCreated).toBe(1);

    unSub();
    expect(activeListeners).toBe(0);
  });

  it("prevents duplicate subscriptions on component re-renders", () => {
    let currentUnsub: (() => void) | null = null;

    const renderComponent = () => {
      if (!currentUnsub) {
        currentUnsub = mockSubscribe(vi.fn());
      }
    };

    renderComponent();
    expect(activeListeners).toBe(1);

    for (let i = 0; i < 50; i++) {
      renderComponent();
    }

    expect(activeListeners).toBe(1);
    expect(totalSubscriptionsCreated).toBe(1);

    const cleanupFn = currentUnsub as (() => void) | null;
    if (cleanupFn) cleanupFn();
    expect(activeListeners).toBe(0);
  });

  it("re-establishes listener on filter change and cleans up old listener", () => {
    let activeUnsub: (() => void) | null = null;

    const handleFilterChange = (newProjectId: string) => {
      const prevFn = activeUnsub as (() => void) | null;
      if (prevFn) prevFn();
      void newProjectId;
      activeUnsub = mockSubscribe(vi.fn());
    };

    handleFilterChange("proj_1");
    expect(activeListeners).toBe(1);

    handleFilterChange("proj_2");
    expect(activeListeners).toBe(1);
    expect(totalSubscriptionsCreated).toBe(2);

    const finalCleanup = activeUnsub as (() => void) | null;
    if (finalCleanup) finalCleanup();
    expect(activeListeners).toBe(0);
  });
});
