import { useState, useEffect, useRef } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { messaging, db } from "@/shared/services/firebase";
import { User } from "@/shared/types";
import { logger } from "@/shared/utils/logger";

export function useDashboardPushConfig(
  user: User | null,
  addNotification?: (payload: { userId?: string; message: string; type: string; createdAt?: string }) => void | Promise<void>
) {
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");

  // 1. Fetch Remote Config on Mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { fetchConfig, getConfigValue } = await import("@/shared/services/remoteConfig");
        await fetchConfig();
        setShowAnnouncement(getConfigValue("show_announcement") as boolean);
        setAnnouncementText(getConfigValue("announcement_text") as string);
      } catch (err) {
        logger.error("DashboardPushConfig", "Failed to load Remote Config:", err);
      }
    };
    loadConfig();
  }, []);

  const fcmInitializedUserRef = useRef<string | null>(null);

  // 2. Setup FCM Push Notifications and Foreground messaging listener
  useEffect(() => {
    if (!user?.id || fcmInitializedUserRef.current === user.id) return;
    fcmInitializedUserRef.current = user.id;

    let unsubscribeFCM: (() => void) | null = null;

    const setupFCM = async () => {
      try {
        if (!messaging) {
          logger.warn("DashboardPushConfig", "Messaging not supported or blocked in this browser.");
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          const vapidKey = import.meta.env.VITE_FCM_VAPID_KEY || undefined;
          const token = await getToken(messaging, { vapidKey });

          if (token) {
            logger.debug("DashboardPushConfig", "Acquired FCM Token");
            await updateDoc(doc(db, "users", user.id), {
              fcmToken: token,
              fcmTokenUpdatedAt: new Date().toISOString(),
            });
          }
        }

        unsubscribeFCM = onMessage(messaging, (payload) => {
          logger.debug("DashboardPushConfig", "Foreground notification received", payload);

          if (Notification.permission === "granted") {
            new Notification(
              payload.notification?.title || "Golden Acres Alert",
              {
                body:
                  payload.notification?.body ||
                  "A new lead or follow-up reminder is available.",
                icon: "/favicon.svg",
              }
            );
          }

          if (addNotification) {
            addNotification({
              userId: user.id,
              message: `${payload.notification?.title || "Notification"}: ${payload.notification?.body || ""}`,
              type: payload.data?.type || "info",
              createdAt: new Date().toISOString(),
            });
          }
        });
      } catch (err) {
        logger.error("DashboardPushConfig", "FCM Push Notification setup failed:", err);
      }
    };

    setupFCM();

    return () => {
      if (unsubscribeFCM) {
        unsubscribeFCM();
      }
    };
  }, [user?.id, addNotification]);

  return {
    showAnnouncement,
    setShowAnnouncement,
    announcementText,
  };
}
