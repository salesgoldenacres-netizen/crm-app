import { useEffect, useState } from "react";
import { WhatsAppConversationsRepository } from "@/shared/services/firebase/repositories";
import type { WhatsAppConversation } from "../types";

export function useWhatsAppConversations(max = 100) {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) setLoading(true);
    }, 0);

    const unsub = WhatsAppConversationsRepository.subscribe(
      max,
      (snap) => {
        if (cancelled) return;
        setConversations(
          snap.docs.map((d: any) => {
            const data = d.data();
            return {
              id: d.id,
              leadId: String(data.leadId || ""),
              phoneNumber: String(data.phoneNumber || ""),
              waId: data.waId as string | undefined,
              provider: data.provider || "evolution",
              status: data.status || "open",
              lastMessageAt: data.lastMessageAt as string | undefined,
              lastMessagePreview: data.lastMessagePreview as string | undefined,
              lastMessageDirection: data.lastMessageDirection,
              unreadCount: Number(data.unreadCount || 0),
              assignedTo: data.assignedTo as string | undefined,
              assignedToName: data.assignedToName as string | undefined,
              createdAt: String(data.createdAt || ""),
              updatedAt: String(data.updatedAt || ""),
            } as WhatsAppConversation;
          }),
        );
        setError(null);
        setLoading(false);
      },
      (err) => {
        if (cancelled) return;
        console.error("whatsappConversations subscribe failed", err);
        setError(err.message || "Failed to load conversations");
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      unsub();
    };
  }, [max]);

  return { conversations, loading, error };
}
