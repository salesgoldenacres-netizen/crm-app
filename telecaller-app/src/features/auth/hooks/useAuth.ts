import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/shared/services/firebase";
import { UsersRepository } from "@/shared/services/firebase/repositories";
import { logout as apiLogout } from "@/shared/services/auth";
import { User } from "@/shared/types";
import { logger } from "@/shared/utils/logger";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety timeout: if auth doesn't respond in 10 seconds, stop loading
    const timer = setTimeout(() => {
      setLoading((curr) => {
        if (curr) {
          logger.warn("useAuth", "Auth initialization timed out.");
          return false;
        }
        return curr;
      });
    }, 10000);

    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous user document subscription if any
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Query user doc by UID first
      unsubscribeUserDoc = UsersRepository.subscribeByUid(
        firebaseUser.uid,
        async (dbUser) => {
          if (dbUser) {
            setUser({
              ...dbUser,
              uid: firebaseUser.uid,
              email: firebaseUser.email || dbUser.email || "",
            });
            setLoading(false);
          } else {
            // Fallback 1: Query by email (for Google sign-in or JIT migration in progress)
            try {
              if (firebaseUser.email) {
                const emailUser = await UsersRepository.getByEmail(firebaseUser.email);
                if (emailUser) {
                  setUser({
                    ...emailUser,
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                  });
                  setLoading(false);
                  return;
                }

                // Fallback 2: Query by username (handles @goldenacres.app virtual email domain)
                const usernameFromEmail = firebaseUser.email
                  .split("@")[0]
                  .toLowerCase();
                const usernameUser = await UsersRepository.getByUsername(usernameFromEmail);
                if (usernameUser) {
                  setUser({
                    ...usernameUser,
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                  });
                  setLoading(false);
                  return;
                }
              }

              // Truly not found — sign out
              logger.warn(
                "useAuth",
                "User authenticated but not found in users collection. Signing out."
              );
              apiLogout();
              setLoading(false);
            } catch (err) {
              logger.error(
                "useAuth",
                "Error fetching user by email/username fallback:",
                err
              );
              setLoading(false);
            }
          }
        },
        (err) => {
          logger.error("useAuth", "Error fetching user by UID snapshot:", err);
          setLoading(false);
        }
      );
    });

    return () => {
      clearTimeout(timer);
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch (err) {
      logger.error("useAuth", "Logout failed:", err);
    }
  };

  return { user, loading, logout: handleLogout };
}
