import { useCallback, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/shared/services/firebase";
import {
  DEFAULT_MESSAGING_PUBLIC,
  normalizeConnectionStatus,
  type MessagingConnectionStatus,
  type MessagingIntegrationPublic,
  type MessagingProviderStatus,
} from "../types";
import {
  fetchMessagingStatus,
  messagingInstanceAction,
  testMessagingConnection,
} from "../services/messagingApi";

function mapPublicConfig(d: Record<string, unknown>): MessagingIntegrationPublic {
  const enabled =
    d.messagingEnabled !== undefined
      ? !!d.messagingEnabled
      : !!d.evolutionEnabled;
  const connectionStatus = normalizeConnectionStatus(
    String(
      d.messagingConnectionStatus || d.evolutionConnectionStatus || "not_configured",
    ),
  );

  return {
    messagingProviderId: String(d.messagingProviderId || "evolution"),
    messagingEnabled: enabled,
    messagingBaseUrl: String(d.messagingBaseUrl || d.evolutionBaseUrl || ""),
    messagingInstanceName: String(
      d.messagingInstanceName || d.evolutionInstanceName || "",
    ),
    messagingConnectionStatus: connectionStatus,
    messagingQrStatus: String(d.messagingQrStatus || d.evolutionQrStatus || "n/a"),
    messagingConnectedPhone: String(
      d.messagingConnectedPhone || d.evolutionConnectedPhone || "",
    ),
    messagingInstanceStatus: String(
      d.messagingInstanceStatus || d.evolutionInstanceStatus || "not_configured",
    ),
    messagingLastSyncAt: String(
      d.messagingLastSyncAt || d.evolutionLastSyncAt || "",
    ),
    messagingLastError: String(
      d.messagingLastError || d.evolutionLastError || "",
    ),
    messagingLastWebhookAt: String(
      d.messagingLastWebhookAt || d.evolutionLastWebhookAt || "",
    ),
    messagingWebhookHealth: (d.messagingWebhookHealth ||
      d.evolutionWebhookHealth ||
      "unknown") as MessagingIntegrationPublic["messagingWebhookHealth"],
    evolutionEnabled: enabled,
    evolutionBaseUrl: String(d.evolutionBaseUrl || d.messagingBaseUrl || ""),
    evolutionInstanceName: String(
      d.evolutionInstanceName || d.messagingInstanceName || "",
    ),
    evolutionConnectionStatus:
      connectionStatus === "waiting_qr" ? "qr" : connectionStatus,
    evolutionQrStatus: String(d.evolutionQrStatus || d.messagingQrStatus || "n/a"),
    evolutionConnectedPhone: String(
      d.evolutionConnectedPhone || d.messagingConnectedPhone || "",
    ),
    evolutionInstanceStatus: String(
      d.evolutionInstanceStatus || d.messagingInstanceStatus || "not_configured",
    ),
    evolutionLastSyncAt: String(
      d.evolutionLastSyncAt || d.messagingLastSyncAt || "",
    ),
    evolutionLastError: String(
      d.evolutionLastError || d.messagingLastError || "",
    ),
    evolutionLastWebhookAt: String(
      d.evolutionLastWebhookAt || d.messagingLastWebhookAt || "",
    ),
    evolutionWebhookHealth: (d.evolutionWebhookHealth ||
      d.messagingWebhookHealth ||
      "unknown") as MessagingIntegrationPublic["evolutionWebhookHealth"],
  };
}

export function useMessagingStatus(pollOnMount = true) {
  const [publicConfig, setPublicConfig] = useState<MessagingIntegrationPublic>(
    DEFAULT_MESSAGING_PUBLIC,
  );
  const [status, setStatus] = useState<MessagingProviderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "integrations"), (snap) => {
      if (!snap.exists()) {
        setPublicConfig(DEFAULT_MESSAGING_PUBLIC);
        return;
      }
      setPublicConfig(mapPublicConfig(snap.data() as Record<string, unknown>));
    });
    return () => unsub();
  }, []);

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchMessagingStatus();
      setStatus({
        ...s,
        status: normalizeConnectionStatus(s.status),
      });
      return s;
    } catch (err) {
      console.error("messagingStatus failed", err);
      const fallback: MessagingProviderStatus = {
        provider: publicConfig.messagingProviderId || "evolution",
        connected: false,
        status: publicConfig.messagingEnabled
          ? "disconnected"
          : "not_configured",
        webhookUrl: "",
        message:
          err instanceof Error
            ? err.message
            : "Messaging backend unavailable (deploy functions to enable).",
      };
      setStatus(fallback);
      return fallback;
    } finally {
      setLoading(false);
    }
  }, [publicConfig.messagingEnabled, publicConfig.messagingProviderId]);

  useEffect(() => {
    if (!pollOnMount) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) void refreshStatus();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pollOnMount, refreshStatus]);

  const testConnection = useCallback(async () => {
    setActionLoading(true);
    try {
      const s = await testMessagingConnection();
      const normalized = {
        ...s,
        status: normalizeConnectionStatus(s.status) as MessagingConnectionStatus,
      };
      setStatus(normalized);
      return normalized;
    } finally {
      setActionLoading(false);
    }
  }, []);

  const runInstanceAction = useCallback(
    async (action: "qr" | "reconnect" | "disconnect" | "createInstance") => {
      setActionLoading(true);
      try {
        const s = await messagingInstanceAction(action);
        const normalized = {
          ...s,
          status: normalizeConnectionStatus(s.status) as MessagingConnectionStatus,
        };
        setStatus(normalized);
        return normalized;
      } finally {
        setActionLoading(false);
      }
    },
    [],
  );

  const isConnected =
    status?.connected === true ||
    publicConfig.messagingConnectionStatus === "connected";

  return {
    publicConfig,
    status,
    loading,
    actionLoading,
    isConnected,
    refreshStatus,
    testConnection,
    runInstanceAction,
  };
}
