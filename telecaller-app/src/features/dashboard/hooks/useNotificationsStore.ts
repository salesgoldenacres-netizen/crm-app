import { useState, useEffect } from "react";

import { logger } from "@/shared/utils/logger";
import { NotificationItem } from "@/shared/types";
import { NotificationsRepository } from "@/shared/services/firebase/repositories";
import {
  publishNotification,
} from "@/shared/contracts";

/**
 * Hook to manage notification items in Firestore.
 * Establishes real-time listeners for user-specific notification logs,
 * enabling indicators to track unread messages, alert popups,
 * and mark single or multiple alerts as read.
 *
 * @param {string} [userId] The unique ID of the currently logged-in user.
 */
export function useNotificationsStore(userId?: string) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = NotificationsRepository.subscribeUserNotifications(
      userId,
      (list) => {
        // Query already orders by createdAt desc; keep stable client sort as fallback
        list.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setNotifications(list);
        setIsLoaded(true);
      },
      (err) =>
        logger.error(
          "NotificationsStore",
          "Error listening to notifications",
          err,
        ),
    );
    return () => unsubscribe();
  }, [userId]);

  const addNotification = async (
    notif: Partial<NotificationItem> & { title?: string; id?: string },
  ): Promise<void> => {
    try {
      await publishNotification({
        userId: notif.userId || userId || "",
        message: notif.message || "",
        type: notif.type || "info",
        leadId: notif.leadId,
        id: notif.id,
        title: notif.title,
      });
    } catch (err) {
      logger.error("NotificationsStore", "Failed to add notification", err);
    }
  };

  const markAsRead = async (id: string): Promise<void> => {
    try {
      await NotificationsRepository.update(id, { read: true });
    } catch (err) {
      logger.error(
        "NotificationsStore",
        `Failed to mark notification ${id} as read`,
        err,
      );
    }
  };

  const markAllAsRead = async (): Promise<void> => {
    try {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length > 0) {
        await NotificationsRepository.markAllAsRead(unreadIds);
      }
    } catch (err) {
      logger.error(
        "NotificationsStore",
        "Failed to mark all notifications as read",
        err,
      );
    }
  };

  return {
    notifications,
    isLoaded,
    addNotification,
    markAsRead,
    markAllAsRead,
  };
}
