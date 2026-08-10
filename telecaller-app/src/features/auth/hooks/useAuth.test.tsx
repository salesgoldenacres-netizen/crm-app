import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { User } from "@/shared/types";

/**
 * Firebase + repository boundaries are mocked so the auth state machine is
 * exercised deterministically (no real Firebase, no network, no timers leak).
 */
const {
  onAuthStateChangedMock,
  subscribeByUidMock,
  getByEmailMock,
  getByUsernameMock,
  logoutMock,
} = vi.hoisted(() => ({
  onAuthStateChangedMock: vi.fn(),
  subscribeByUidMock: vi.fn(),
  getByEmailMock: vi.fn(),
  getByUsernameMock: vi.fn(),
  logoutMock: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (
    ...args: unknown[]
  ) => onAuthStateChangedMock(...args),
}));

vi.mock("@/shared/services/firebase", () => ({
  auth: { __brand: "mock-auth" },
}));

vi.mock("@/shared/services/firebase/repositories", () => ({
  UsersRepository: {
    subscribeByUid: (...args: unknown[]) => subscribeByUidMock(...args),
    getByEmail: (...args: unknown[]) => getByEmailMock(...args),
    getByUsername: (...args: unknown[]) => getByUsernameMock(...args),
  },
}));

vi.mock("@/shared/services/auth", () => ({
  logout: (...args: unknown[]) => logoutMock(...args),
}));

import { useAuth } from "./useAuth";

type AuthCallback = (firebaseUser: unknown) => void | Promise<void>;
type UidCallback = (dbUser: User | null) => void | Promise<void>;
type UidErrorCallback = (err: Error) => void;

// Captured callbacks registered by the hook so tests can drive the machine.
let authCallback: AuthCallback;
let uidCallback: UidCallback;
let uidErrorCallback: UidErrorCallback;
let unsubscribeAuth: ReturnType<typeof vi.fn>;
let unsubscribeUserDoc: ReturnType<typeof vi.fn>;

const dbUser: User = {
  id: "user-1",
  username: "agent1",
  role: "telecaller",
  email: "stored@example.com",
};

beforeEach(() => {
  vi.clearAllMocks();

  unsubscribeAuth = vi.fn();
  unsubscribeUserDoc = vi.fn();

  onAuthStateChangedMock.mockImplementation((_auth: unknown, cb: AuthCallback) => {
    authCallback = cb;
    return unsubscribeAuth;
  });

  subscribeByUidMock.mockImplementation(
    (_uid: string, cb: UidCallback, onErr: UidErrorCallback) => {
      uidCallback = cb;
      uidErrorCallback = onErr;
      return unsubscribeUserDoc;
    }
  );

  getByEmailMock.mockResolvedValue(null);
  getByUsernameMock.mockResolvedValue(null);
  logoutMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useAuth", () => {
  it("starts in a loading state with no user", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it("clears the user and stops loading when signed out", async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await authCallback(null);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(subscribeByUidMock).not.toHaveBeenCalled();
  });

  it("resolves the user via UID subscription and merges auth identity", async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await authCallback({ uid: "fb-uid-1", email: "auth@example.com" });
    });
    await act(async () => {
      await uidCallback(dbUser);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.user).toMatchObject({
      id: "user-1",
      uid: "fb-uid-1",
      email: "auth@example.com",
    });
  });

  it("falls back to email lookup when the UID document is missing", async () => {
    const emailUser: User = { ...dbUser, id: "user-email", username: "byemail" };
    getByEmailMock.mockResolvedValue(emailUser);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await authCallback({ uid: "fb-uid-2", email: "auth@example.com" });
    });
    await act(async () => {
      await uidCallback(null);
    });

    await waitFor(() => expect(result.current.user?.id).toBe("user-email"));
    expect(getByEmailMock).toHaveBeenCalledWith("auth@example.com");
    expect(result.current.user?.uid).toBe("fb-uid-2");
    expect(result.current.loading).toBe(false);
  });

  it("falls back to username lookup for virtual email domains", async () => {
    const usernameUser: User = { ...dbUser, id: "user-uname", username: "johndoe" };
    getByEmailMock.mockResolvedValue(null);
    getByUsernameMock.mockResolvedValue(usernameUser);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await authCallback({ uid: "fb-uid-3", email: "JohnDoe@goldenacres.app" });
    });
    await act(async () => {
      await uidCallback(null);
    });

    await waitFor(() => expect(result.current.user?.id).toBe("user-uname"));
    // Username derived from the local part, lowercased.
    expect(getByUsernameMock).toHaveBeenCalledWith("johndoe");
    expect(result.current.loading).toBe(false);
  });

  it("signs out when the user is authenticated but has no matching record", async () => {
    getByEmailMock.mockResolvedValue(null);
    getByUsernameMock.mockResolvedValue(null);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await authCallback({ uid: "fb-uid-4", email: "ghost@example.com" });
    });
    await act(async () => {
      await uidCallback(null);
    });

    await waitFor(() => expect(logoutMock).toHaveBeenCalledTimes(1));
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("stops loading if the fallback lookups throw", async () => {
    getByEmailMock.mockRejectedValue(new Error("firestore offline"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await authCallback({ uid: "fb-uid-5", email: "err@example.com" });
    });
    await act(async () => {
      await uidCallback(null);
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it("stops loading when the UID subscription errors", async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await authCallback({ uid: "fb-uid-6", email: "x@example.com" });
    });
    act(() => {
      uidErrorCallback(new Error("permission-denied"));
    });

    expect(result.current.loading).toBe(false);
  });

  it("stops loading after the 10s safety timeout when auth never responds", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(result.current.loading).toBe(false);
  });

  it("tears down auth and user-doc subscriptions on unmount", async () => {
    const { unmount } = renderHook(() => useAuth());

    await act(async () => {
      await authCallback({ uid: "fb-uid-7", email: "y@example.com" });
    });

    unmount();
    expect(unsubscribeAuth).toHaveBeenCalledTimes(1);
    expect(unsubscribeUserDoc).toHaveBeenCalledTimes(1);
  });

  it("exposes a logout handler that delegates to the auth service", async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(logoutMock).toHaveBeenCalledTimes(1);
  });
});
