import { useMemo } from "react";
import { MessageCircle, ExternalLink, Image, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { Lead } from "@/shared/types";
import {
  useMessagingStatus,
  useWhatsAppMessages,
} from "@/features/messaging";
import { safeFormatDateTime } from "@/shared/utils/dateUtils";

interface LeadWhatsAppPanelProps {
  lead: Lead;
  onOpenInbox?: () => void;
}

/** Lead-page WhatsApp summary — no embedded message history on the Lead doc. */
export default function LeadWhatsAppPanel({
  lead,
  onOpenInbox,
}: LeadWhatsAppPanelProps) {
  const { isConnected } = useMessagingStatus(false);
  const { messages, conversationId } = useWhatsAppMessages(lead.id, 50);

  const last = messages[messages.length - 1];
  const unread = useMemo(
    () =>
      messages.filter((m) => m.direction === "inbound" && m.status !== "read")
        .length,
    [messages],
  );

  const mediaSummary = useMemo(() => {
    let images = 0;
    let docs = 0;
    for (const m of messages) {
      if (m.type === "image") images += 1;
      if (m.type === "document") docs += 1;
    }
    return { images, docs };
  }, [messages]);

  return (
    <div className="card-premium p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-theme-text uppercase tracking-wider flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5 text-green-500" />
          WhatsApp
        </h3>
        <span
          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
            isConnected
              ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
              : "bg-theme-surface text-theme-muted border-theme-border"
          }`}
        >
          {isConnected ? "Connected" : "Offline"}
        </span>
      </div>

      <div className="space-y-2 text-[11px]">
        <div className="flex justify-between gap-2">
          <span className="text-theme-muted">Last message</span>
          <span className="text-theme-text font-medium text-right truncate max-w-[60%]">
            {last
              ? (last.text || `[${last.type}]`).slice(0, 48)
              : "No messages yet"}
          </span>
        </div>
        {last?.timestamp && (
          <div className="flex justify-between gap-2">
            <span className="text-theme-muted">When</span>
            <span className="text-theme-text">
              {safeFormatDateTime(last.timestamp)}
            </span>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <span className="text-theme-muted">Unread</span>
          <span className="text-theme-text font-bold">{unread}</span>
        </div>
        <div className="flex items-center gap-3 text-theme-muted">
          <span className="inline-flex items-center gap-1">
            <Image className="w-3 h-3" /> {mediaSummary.images}
          </span>
          <span className="inline-flex items-center gap-1">
            <FileText className="w-3 h-3" /> {mediaSummary.docs}
          </span>
          {conversationId && (
            <span className="text-[9px] truncate">#{conversationId.slice(0, 8)}</span>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          to={`/calls?tab=whatsapp&lead=${lead.id}`}
          onClick={onOpenInbox}
          className="flex-1 inline-flex items-center justify-center gap-1 h-8 rounded-lg bg-green-600 text-white text-[11px] font-bold"
        >
          <ExternalLink className="w-3 h-3" />
          Open Conversation
        </Link>
      </div>
    </div>
  );
}
