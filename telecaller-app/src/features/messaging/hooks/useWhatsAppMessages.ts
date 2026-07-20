import { useEffect, useState } from "react";
import { WhatsAppMessagesRepository } from "@/shared/services/firebase/repositories";
import type { WhatsAppMessage } from "../types";

function mapDoc(id: string, data: Record<string, unknown>): WhatsAppMessage {
  return {
    id,
    conversationId: String(data.conversationId || ""),
    leadId: String(data.leadId || ""),
    provider: (data.provider as WhatsAppMessage["provider"]) || "evolution",
    providerMessageId: data.providerMessageId as string | undefined,
    direction: data.direction as WhatsAppMessage["direction"],
    type: (data.type as WhatsAppMessage["type"]) || "text",
    text: data.text as string | undefined,
    mediaUrl: data.mediaUrl as string | undefined,
    mediaMimeType: data.mediaMimeType as string | undefined,
    mediaFileName: data.mediaFileName as string | undefined,
    templateId: data.templateId as string | undefined,
    status: (data.status as WhatsAppMessage["status"]) || "sent",
    error: data.error as string | undefined,
    timestamp: String(data.timestamp || ""),
    updatedAt: data.updatedAt as string | undefined,
    agentId: data.agentId as string | undefined,
    agentName: data.agentName as string | undefined,
    legacyNoteTag: data.legacyNoteTag as string | undefined,
  };
}

/**
 * Subscribe to canonical top-level whatsappMessages for a lead.
 * Falls back to legacy leads/{id}/whatsappMessages when no top-level docs exist.
 */
export function useWhatsAppMessages(leadId: string | null | undefined, max = 200) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    if (!leadId) return;

    let cancelled = false;
    let legacyUnsub: (() => void) | null = null;

    // Defer loading flag so the effect body stays free of sync setState
    const loadingTimer = window.setTimeout(() => {
      if (!cancelled) setLoading(true);
    }, 0);

    const primaryUnsub = WhatsAppMessagesRepository.subscribe(
      leadId,
      max,
      (snap) => {
        if (cancelled) return;
        if (!snap.empty) {
          if (legacyUnsub) {
            legacyUnsub();
            legacyUnsub = null;
          }
          const rows = snap.docs.map((d: any) => mapDoc(d.id, d.data()));
          setMessages(rows);
          setConversationId(rows[rows.length - 1]?.conversationId || null);
          setError(null);
          setLoading(false);
          return;
        }

        if (legacyUnsub) return;
        legacyUnsub = WhatsAppMessagesRepository.subscribeLegacy(
          leadId,
          max,
          (legacySnap) => {
            if (cancelled) return;
            const rows = legacySnap.docs.map((d: any) =>
              mapDoc(d.id, { ...d.data(), leadId, conversationId: "" }),
            );
            setMessages(rows);
            setConversationId(null);
            setError(null);
            setLoading(false);
          },
          (err) => {
            if (cancelled) return;
            console.error("legacy whatsappMessages subscribe failed", err);
            setMessages([]);
            setLoading(false);
          },
        );
      },
      (err) => {
        if (cancelled) return;
        console.error("whatsappMessages subscribe failed", err);
        setError(err.message || "Failed to load messages");
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      window.clearTimeout(loadingTimer);
      primaryUnsub();
      if (legacyUnsub) legacyUnsub();
    };
  }, [leadId, max]);

  if (!leadId) {
    return {
      messages: [] as WhatsAppMessage[],
      loading: false,
      error: null,
      conversationId: null,
    };
  }

  return { messages, loading, error, conversationId };
}
