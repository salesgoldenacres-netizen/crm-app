import { useMemo, useState } from "react";
import {
  MessageCircle,
  RefreshCw,
  QrCode,
  Unplug,
  PlugZap,
  Copy,
  CheckCircle2,
  AlertCircle,
  Plus,
  Activity,
} from "lucide-react";
import { useMessagingStatus } from "@/features/messaging";
import type { MessagingConnectionStatus } from "@/features/messaging";
import Input from "@/shared/components/ui/Input";
import Select from "@/shared/components/ui/Select";
import Checkbox from "@/shared/components/ui/Checkbox";
import Button from "@/shared/components/ui/Button";
import { FIELD_CONTROL_CLASS } from "@/shared/components/ui/formField";

interface MessagingIntegrationsPanelProps {
  integrationSettings: Record<string, any>;
  setIntegrationSettings: (next: any) => void;
}

function statusBadge(status: MessagingConnectionStatus | string) {
  const map: Record<string, string> = {
    connected:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    connecting:
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    waiting_qr:
      "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
    qr: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
    disconnected: "bg-theme-surface text-theme-muted border-theme-border",
    disabled: "bg-theme-surface text-theme-muted border-theme-border",
    not_configured: "bg-theme-surface text-theme-muted border-theme-border",
    error: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  };
  return map[status] || map.not_configured;
}

function webhookHealthBadge(health: string) {
  const map: Record<string, string> = {
    healthy:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    stale: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    error: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
    unknown: "bg-theme-surface text-theme-muted border-theme-border",
  };
  return map[health] || map.unknown;
}

/** Admin WhatsApp Business panel — UI is provider-agnostic; Evolution is the V1 plugin. */
export default function EvolutionIntegrationsPanel({
  integrationSettings,
  setIntegrationSettings,
}: MessagingIntegrationsPanelProps) {
  const {
    status,
    loading,
    actionLoading,
    refreshStatus,
    testConnection,
    runInstanceAction,
  } = useMessagingStatus(true);

  const [copied, setCopied] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const webhookUrl = useMemo(
    () =>
      status?.webhookUrl ||
      "https://us-central1-golden-acres-projects.cloudfunctions.net/api/api/webhooks/whatsapp",
    [status?.webhookUrl],
  );

  const connStatus =
    status?.status ||
    integrationSettings.messagingConnectionStatus ||
    integrationSettings.evolutionConnectionStatus ||
    "not_configured";

  const webhookHealth =
    status?.webhookHealth ||
    integrationSettings.messagingWebhookHealth ||
    integrationSettings.evolutionWebhookHealth ||
    "unknown";

  const lastWebhookAt =
    status?.lastWebhookAt ||
    integrationSettings.messagingLastWebhookAt ||
    integrationSettings.evolutionLastWebhookAt ||
    "";

  const supportsCreate =
    status?.supportsCreateInstance !== false;

  const patch = (fields: Record<string, unknown>) => {
    // Mirror messaging* + evolution* keys so V1 storage stays compatible
    const mirrored: Record<string, unknown> = { ...fields };
    if ("evolutionEnabled" in fields) {
      mirrored.messagingEnabled = fields.evolutionEnabled;
    }
    if ("evolutionBaseUrl" in fields) {
      mirrored.messagingBaseUrl = fields.evolutionBaseUrl;
    }
    if ("evolutionInstanceName" in fields) {
      mirrored.messagingInstanceName = fields.evolutionInstanceName;
    }
    setIntegrationSettings({ ...integrationSettings, ...mirrored });
  };

  const onTest = async () => {
    setActionMsg(null);
    try {
      const s = await testConnection();
      setActionMsg(s.message || (s.connected ? "Connected" : "Not connected"));
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : "Test failed");
    }
  };

  const onAction = async (
    action: "qr" | "reconnect" | "disconnect" | "createInstance",
  ) => {
    setActionMsg(null);
    try {
      const s = await runInstanceAction(action);
      if (action === "qr") {
        setActionMsg(
          s.qrBase64
            ? "QR ready — scan with WhatsApp Business linked device."
            : s.message || "QR unavailable (connect provider first).",
        );
      } else if (action === "createInstance") {
        setActionMsg(
          s.qrBase64
            ? "Instance created — scan QR to link WhatsApp."
            : s.message || "Instance create requested.",
        );
      } else {
        setActionMsg(s.message || `${action} completed`);
      }
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : "Action failed");
    }
  };

  const copyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setActionMsg("Could not copy webhook URL");
    }
  };

  return (
    <div className="bg-theme-card rounded-xl shadow-sm border border-theme-border p-5 transition-colors animate-fadeIn">
      <div className="flex items-start justify-between gap-3 border-b border-theme-border pb-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-theme-text flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-theme-success" aria-hidden="true" />
            WhatsApp Business
          </h3>
          <p className="text-[10px] text-theme-muted mt-1 leading-snug max-w-md">
            Messaging runs through a provider abstraction. V1 plugin: Evolution API
            (configure an existing server — CRM never hosts WhatsApp).
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-theme border text-[10px] font-semibold uppercase tracking-wide ${statusBadge(connStatus)}`}
          >
            {String(connStatus).replace(/_/g, " ")}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-theme border text-[9px] font-semibold uppercase tracking-wide ${webhookHealthBadge(String(webhookHealth))}`}
          >
            <Activity className="w-3 h-3" aria-hidden="true" />
            Webhook {String(webhookHealth)}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <Checkbox
          label="Enable Integration"
          checked={!!integrationSettings.evolutionEnabled}
          onChange={(e) => patch({ evolutionEnabled: e.target.checked })}
        />

        <Select
          label="Provider"
          value={integrationSettings.messagingProviderId || "evolution"}
          onChange={(e) => patch({ messagingProviderId: e.target.value })}
        >
          <option value="evolution">Evolution API (V1)</option>
          <option value="meta_cloud" disabled>
            Meta Cloud API (coming soon)
          </option>
          <option value="twilio" disabled>
            Twilio (coming soon)
          </option>
        </Select>

        <Input
          label="Base URL"
          type="url"
          value={integrationSettings.evolutionBaseUrl || ""}
          onChange={(e) => patch({ evolutionBaseUrl: e.target.value })}
          placeholder="https://evolution.your-vps.com"
        />

        <Input
          label="API Key"
          type="password"
          value={integrationSettings.evolutionApiKey || ""}
          onChange={(e) => patch({ evolutionApiKey: e.target.value })}
          placeholder="Provider API key"
          className="font-mono"
        />

        <Input
          label="Instance Name"
          type="text"
          value={integrationSettings.evolutionInstanceName || ""}
          onChange={(e) => patch({ evolutionInstanceName: e.target.value })}
          placeholder="golden-acres"
        />

        <Input
          label="Instance Token (optional)"
          type="password"
          value={integrationSettings.evolutionInstanceToken || ""}
          onChange={(e) => patch({ evolutionInstanceToken: e.target.value })}
          placeholder="Per-instance token if required by provider"
          className="font-mono"
        />

        <Input
          label="Webhook Secret (optional)"
          type="password"
          value={integrationSettings.evolutionWebhookSecret || ""}
          onChange={(e) => patch({ evolutionWebhookSecret: e.target.value })}
          placeholder="Shared secret for provider → CRM webhooks"
          className="font-mono"
        />

        <div>
          <span className="type-label font-semibold text-theme-muted block mb-1.5">
            Webhook URL (CRM-generated)
          </span>
          <div className="flex gap-2">
            <input
              readOnly
              value={webhookUrl}
              aria-label="CRM webhook URL"
              className={`flex-1 ${FIELD_CONTROL_CLASS} text-[10px] font-mono text-theme-muted`}
            />
            <Button type="button" variant="outline" size="sm" onClick={copyWebhook}>
              {copied ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-theme-success mr-1" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
              )}
              Copy
            </Button>
          </div>
          <p className="text-[9px] text-theme-muted mt-1">
            Point the provider instance webhook here after Cloud Functions deploy.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="rounded-theme border border-theme-border bg-theme-surface/50 p-2">
            <div className="type-label text-theme-muted uppercase tracking-wide">
              Connection
            </div>
            <div className="text-theme-text font-semibold mt-0.5 capitalize">
              {String(connStatus).replace(/_/g, " ")}
            </div>
          </div>
          <div className="rounded-theme border border-theme-border bg-theme-surface/50 p-2">
            <div className="type-label text-theme-muted uppercase tracking-wide">
              QR Status
            </div>
            <div className="text-theme-text font-semibold mt-0.5">
              {status?.qrStatus ||
                integrationSettings.evolutionQrStatus ||
                "n/a"}
            </div>
          </div>
          <div className="rounded-theme border border-theme-border bg-theme-surface/50 p-2">
            <div className="type-label text-theme-muted uppercase tracking-wide">
              Phone
            </div>
            <div className="text-theme-text font-semibold mt-0.5 truncate">
              {status?.connectedPhone ||
                integrationSettings.evolutionConnectedPhone ||
                "—"}
            </div>
          </div>
          <div className="rounded-theme border border-theme-border bg-theme-surface/50 p-2">
            <div className="type-label text-theme-muted uppercase tracking-wide">
              Instance
            </div>
            <div className="text-theme-text font-semibold mt-0.5 truncate">
              {status?.instanceStatus ||
                integrationSettings.evolutionInstanceStatus ||
                "—"}
            </div>
          </div>
          <div className="rounded-theme border border-theme-border bg-theme-surface/50 p-2">
            <div className="type-label text-theme-muted uppercase tracking-wide">
              Last Webhook
            </div>
            <div className="text-theme-text font-semibold mt-0.5 truncate">
              {lastWebhookAt || "Never"}
            </div>
          </div>
          <div className="rounded-theme border border-theme-border bg-theme-surface/50 p-2">
            <div className="type-label text-theme-muted uppercase tracking-wide">
              Last Sync
            </div>
            <div className="text-theme-text font-semibold mt-0.5 truncate">
              {status?.lastSyncAt ||
                integrationSettings.evolutionLastSyncAt ||
                "Never"}
            </div>
          </div>
        </div>

        {status?.qrBase64 && (
          <div className="rounded-xl border border-theme-border bg-theme-surface p-3 flex flex-col items-center gap-2">
            <img
              src={
                status.qrBase64.startsWith("data:")
                  ? status.qrBase64
                  : `data:image/png;base64,${status.qrBase64}`
              }
              alt="WhatsApp QR"
              className="w-40 h-40 rounded-theme bg-white"
            />
            <p className="text-[10px] text-theme-muted text-center">
              Scan with WhatsApp Business → Linked Devices
            </p>
          </div>
        )}

        {!status?.connected && !status?.qrBase64 && (
          <div className="rounded-theme border border-dashed border-theme-border bg-theme-surface/40 p-3 flex gap-2 text-[11px] text-theme-muted">
            <AlertCircle className="w-4 h-4 shrink-0 text-theme-warning" aria-hidden="true" />
            <span>
              Not connected. Save settings, deploy Cloud Functions, then Test
              Connection / Generate QR once the provider server is running.
            </span>
          </div>
        )}

        {actionMsg && (
          <p
            role="status"
            className="text-[11px] text-theme-text bg-theme-accent-muted border border-theme-accent/20 rounded-theme px-2.5 py-2"
          >
            {actionMsg}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant="primary"
            disabled={loading || actionLoading}
            onClick={onTest}
          >
            <PlugZap className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            Connection Test
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={actionLoading}
            onClick={() => void refreshStatus()}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Refresh
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={actionLoading || !supportsCreate}
            title={
              supportsCreate
                ? "Create instance on the provider (optional)"
                : "Active provider does not support Create Instance"
            }
            onClick={() => void onAction("createInstance")}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            Create Instance
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={actionLoading}
            onClick={() => void onAction("qr")}
          >
            <QrCode className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            Generate QR
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={actionLoading}
            onClick={() => void onAction("reconnect")}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            Reconnect
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={actionLoading}
            onClick={() => void onAction("disconnect")}
            className="text-theme-danger hover:text-theme-danger"
          >
            <Unplug className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            Disconnect
          </Button>
        </div>
      </div>
    </div>
  );
}
