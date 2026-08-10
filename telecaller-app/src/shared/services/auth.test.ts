import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "firebase/auth";

const {
  signInWithEmailAndPasswordMock,
  signInWithPopupMock,
  GoogleAuthProviderMock,
  sendPasswordResetEmailMock,
  signOutMock,
  createUserWithEmailAndPasswordMock,
  getAuthMock,
  initializeAppMock,
  deleteAppMock,
  getDocsMock,
  linkUserProfileMock,
} = vi.hoisted(() => ({
  signInWithEmailAndPasswordMock: vi.fn(),
  signInWithPopupMock: vi.fn(),
  GoogleAuthProviderMock: vi.fn(),
  sendPasswordResetEmailMock: vi.fn(),
  signOutMock: vi.fn(),
  createUserWithEmailAndPasswordMock: vi.fn(),
  getAuthMock: vi.fn(),
  initializeAppMock: vi.fn(),
  deleteAppMock: vi.fn(),
  getDocsMock: vi.fn(),
  linkUserProfileMock: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: (...args: unknown[]) =>
    signInWithEmailAndPasswordMock(...args),
  signInWithPopup: (...args: unknown[]) => signInWithPopupMock(...args),
  GoogleAuthProvider: GoogleAuthProviderMock,
  sendPasswordResetEmail: (...args: unknown[]) =>
    sendPasswordResetEmailMock(...args),
  signOut: (...args: unknown[]) => signOutMock(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) =>
    createUserWithEmailAndPasswordMock(...args),
  getAuth: (...args: unknown[]) => getAuthMock(...args),
}));

vi.mock("firebase/app", () => ({
  initializeApp: (...args: unknown[]) => initializeAppMock(...args),
  deleteApp: (...args: unknown[]) => deleteAppMock(...args),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => "users-ref"),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn((field: string, op: string, value: unknown) => ({ field, op, value })),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
}));

vi.mock("./firebase", () => ({
  auth: { __brand: "mock-auth" },
  db: { __brand: "mock-db" },
  firebaseConfig: { apiKey: "test" },
}));

vi.mock("./claimsApi", () => ({
  linkUserProfile: (...args: unknown[]) => linkUserProfileMock(...args),
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import {
  getEmailFromUsername,
  loginWithEmailAndPassword,
  loginWithGoogle,
  resetPassword,
  logout,
  createSecondaryUser,
} from "./auth";

const firebaseUser = { uid: "uid-1", email: "agent@goldenacres.app" } as User;

beforeEach(() => {
  vi.clearAllMocks();
  GoogleAuthProviderMock.mockImplementation(function GoogleAuthProvider() {
    return { providerId: "google.com" };
  });
  signOutMock.mockResolvedValue(undefined);
  deleteAppMock.mockResolvedValue(undefined);
});

describe("getEmailFromUsername", () => {
  it("passes through full email addresses (normalized)", () => {
    expect(getEmailFromUsername("Agent@Example.COM")).toBe("agent@example.com");
  });

  it("appends @goldenacres.app for bare usernames", () => {
    expect(getEmailFromUsername(" agent1 ")).toBe("agent1@goldenacres.app");
  });
});

describe("loginWithEmailAndPassword", () => {
  it("signs in with normalized email", async () => {
    signInWithEmailAndPasswordMock.mockResolvedValue({ user: firebaseUser });

    const user = await loginWithEmailAndPassword("agent1", "secret");

    expect(signInWithEmailAndPasswordMock).toHaveBeenCalledWith(
      { __brand: "mock-auth" },
      "agent1@goldenacres.app",
      "secret",
    );
    expect(user).toBe(firebaseUser);
  });
});

describe("loginWithGoogle", () => {
  it("rejects Google accounts with no email", async () => {
    signInWithPopupMock.mockResolvedValue({ user: { email: null } });

    await expect(loginWithGoogle()).rejects.toThrow(
      "No email found in Google account.",
    );
  });

  it("signs out and denies unregistered Google users", async () => {
    signInWithPopupMock.mockResolvedValue({
      user: { email: "unknown@gmail.com" },
    });
    getDocsMock.mockResolvedValue({ empty: true });

    await expect(loginWithGoogle()).rejects.toThrow("Access denied");
    expect(signOutMock).toHaveBeenCalled();
  });

  it("links profile and returns user when registered by email", async () => {
    signInWithPopupMock.mockResolvedValue({
      user: { email: "agent@gmail.com" },
    });
    getDocsMock.mockResolvedValueOnce({ empty: false });
    linkUserProfileMock.mockResolvedValue(undefined);

    const user = await loginWithGoogle();

    expect(linkUserProfileMock).toHaveBeenCalled();
    expect(user.email).toBe("agent@gmail.com");
  });

  it("signs out when linkUserProfile fails", async () => {
    signInWithPopupMock.mockResolvedValue({
      user: { email: "agent@gmail.com" },
    });
    getDocsMock.mockResolvedValueOnce({ empty: false });
    linkUserProfileMock.mockRejectedValue(new Error("link failed"));

    await expect(loginWithGoogle()).rejects.toThrow(
      "Could not link your account",
    );
    expect(signOutMock).toHaveBeenCalled();
  });
});

describe("resetPassword", () => {
  it("sends reset email for username alias", async () => {
    sendPasswordResetEmailMock.mockResolvedValue(undefined);

    await resetPassword("agent1");

    expect(sendPasswordResetEmailMock).toHaveBeenCalledWith(
      { __brand: "mock-auth" },
      "agent1@goldenacres.app",
    );
  });
});

describe("logout", () => {
  it("calls Firebase signOut", async () => {
    await logout();
    expect(signOutMock).toHaveBeenCalledWith({ __brand: "mock-auth" });
  });
});

describe("createSecondaryUser", () => {
  it("creates user on temp app and cleans up", async () => {
    const tempAuth = { __brand: "temp-auth" };
    initializeAppMock.mockReturnValue({ __brand: "temp-app" });
    getAuthMock.mockReturnValue(tempAuth);
    createUserWithEmailAndPasswordMock.mockResolvedValue({ user: firebaseUser });

    const user = await createSecondaryUser("newagent", "pass123");

    expect(initializeAppMock).toHaveBeenCalled();
    expect(createUserWithEmailAndPasswordMock).toHaveBeenCalledWith(
      tempAuth,
      "newagent@goldenacres.app",
      "pass123",
    );
    expect(signOutMock).toHaveBeenCalledWith(tempAuth);
    expect(deleteAppMock).toHaveBeenCalled();
    expect(user).toBe(firebaseUser);
  });

  it("deletes temp app when createUser fails", async () => {
    initializeAppMock.mockReturnValue({ __brand: "temp-app" });
    getAuthMock.mockReturnValue({ __brand: "temp-auth" });
    createUserWithEmailAndPasswordMock.mockRejectedValue(new Error("weak password"));

    await expect(createSecondaryUser("x", "y")).rejects.toThrow("weak password");
    expect(deleteAppMock).toHaveBeenCalled();
  });
});
