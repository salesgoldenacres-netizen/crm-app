import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  Unsubscribe,
} from "firebase/firestore";
import { auth, db } from "@/shared/services/firebase";
import { logout as apiLogout } from "@/shared/services/auth";
import { User } from "@/shared/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety timeout: if auth doesn't respond in 10 seconds, stop loading
    const timer = setTimeout(() => {
      setLoading((curr) => {
        if (curr) {
          console.warn("Auth initialization timed out.");
          return false;
        }
        return curr;
      });
    }, 10000);

    let unsubscribeUserDoc: Unsubscribe | null = null;

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
      const usersRef = collection(db, "users");
      const qUid = query(usersRef, where("uid", "==", firebaseUser.uid));

      // Let's set up a listener on the matching user document
      unsubscribeUserDoc = onSnapshot(
        qUid,
        async (snapshot) => {
          if (!snapshot.empty) {
            const docSnap = snapshot.docs[0];
            setUser({
              id: docSnap.id, // Critical: preserve original doc ID (e.g., '1', '2') for lead assignments
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              ...(docSnap.data() as Omit<User, "id" | "uid" | "email">),
            });
            setLoading(false);
          } else {
            // Fallback 1: Query by email (for Google sign-in or JIT migration in progress)
            try {
              if (firebaseUser.email) {
                const qEmail = query(
                  usersRef,
                  where("email", "==", firebaseUser.email.toLowerCase())
                );
                const emailSnapshot = await getDocs(qEmail);

                if (!emailSnapshot.empty) {
                  const docSnap = emailSnapshot.docs[0];
                  setUser({
                    id: docSnap.id,
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    ...(docSnap.data() as Omit<User, "id" | "uid" | "email">),
                  });
                  setLoading(false);
                  return;
                }

                // Fallback 2: Query by username (handles @goldenacres.app virtual email domain)
                const usernameFromEmail = firebaseUser.email
                  .split("@")[0]
                  .toLowerCase();
                const qUsername = query(
                  usersRef,
                  where("username", "==", usernameFromEmail)
                );
                const usernameSnapshot = await getDocs(qUsername);

                if (!usernameSnapshot.empty) {
                  const docSnap = usernameSnapshot.docs[0];
                  setUser({
                    id: docSnap.id,
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    ...(docSnap.data() as Omit<User, "id" | "uid" | "email">),
                  });
                  setLoading(false);
                  return;
                }
              }

              // Truly not found — sign out
              console.warn(
                "User authenticated but not found in users collection. Signing out."
              );
              apiLogout();
              setLoading(false);
            } catch (err) {
              console.error(
                "Error fetching user by email/username fallback:",
                err
              );
              setLoading(false);
            }
          }
        },
        (err) => {
          console.error("Error fetching user by UID snapshot:", err);
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
      console.error("Logout failed:", err);
    }
  };

  return { user, loading, logout: handleLogout };
}
