import { useMemo, useState } from "react";
import {
  MessageCircle,
  ChevronUp,
  ChevronDown,
  Send,
  Paperclip,
  X,
} from "lucide-react";
import { Lead, Project, User } from "@/shared/types";
import {
  WHATSAPP_TEMPLATES,
  WHATSAPP_ATTACHMENTS,
} from "@/shared/constants/whatsappTemplates";
import {
  messagingSend,
  useMessagingStatus,
  useWhatsAppMessages,
} from "@/features/messaging";

interface InCallWhatsAppBarProps {
  lead: Lead;
  user: User;
  projects: Record<string, Project>;
  onClose?: () => void;
}

export default function InCallWhatsAppBar({
  lead,
  user,
  projects,
  onClose,
}: InCallWhatsAppBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAttach, setShowAttach] = useState(false);

  const { isConnected } = useMessagingStatus(false);
  const { messages } = useWhatsAppMessages(lead.id, 40);

  const projectName =
    (lead.projectId && projects[lead.projectId]?.name) || "Golden Acres";

  const lastPreview = useMemo(() => {
    const last = messages[messages.length - 1];
    if (!last) return "No messages yet — send a quick reply";
    return (last.text || `[${last.type}]`).slice(0, 60);
  }, [messages]);

  const quickReplies = [
    `Hi ${lead.name}, I'm on a call with you right now from Golden Acres.`,
    `Sharing the brochure for ${projectName} on WhatsApp.`,
    `Thank you — I'll follow up with plot details shortly.`,
  ];

  const send = async (opts?: {
    text?: string;
    type?: "text" | "image" | "document";
    mediaUrl?: string;
    mediaMimeType?: string;
    mediaFileName?: string;
  }) => {
    const text = (opts?.text ?? draft).trim();
    const type = opts?.type || "text";
    if (type === "text" && !text) return;
    setSending(true);
    setError(null);
    try {
      const res = await messagingSend({
        leadId: lead.id,
        type,
        text,
        mediaUrl: opts?.mediaUrl,
        mediaMimeType: opts?.mediaMimeType,
        mediaFileName: opts?.mediaFileName,
      });
      if (!res.ok) {
        setError(res.error || "Not connected — message marked failed");
      }
      setDraft("");
      setShowTemplates(false);
      setShowAttach(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed top-16 bottom-20 md:bottom-4 right-2 md:right-4 w-[min(100%-1rem,360px)] z-50 animate-fadeIn flex flex-col pointer-events-none">
      <div className="pointer-events-auto mt-auto md:mt-0 md:h-full max-h-[min(70vh,640px)] md:max-h-none rounded-2xl border border-green-500/30 bg-theme-card/95 backdrop-blur-md shadow-xl overflow-hidden flex flex-col">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center gap-2 px-3 py-2.5 cursor-pointer border-0 bg-green-600/10 hover:bg-green-600/15 text-left"
        >
          <span className="size-8 rounded-lg bg-green-600 text-white inline-flex items-center justify-center shrink-0">
            <MessageCircle className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black text-theme-text truncate">
                WhatsApp · {lead.name}
              </span>
              <span
                className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${
                  isConnected
                    ? "border-emerald-500/40 text-emerald-600"
                    : "border-theme-border text-theme-muted"
                }`}
              >
                {isConnected ? "Live" : "Offline"}
              </span>
            </div>
            <p className="text-[10px] text-theme-muted truncate">{lastPreview}</p>
          </div>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-theme-muted shrink-0" />
          ) : (
            <ChevronUp className="w-4 h-4 text-theme-muted shrink-0" />
          )}
          {onClose && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") onClose();
              }}
              className="p-1 rounded-md hover:bg-theme-surface text-theme-muted cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
        </button>

        {expanded && (
          <div className="border-t border-theme-border flex-1 flex flex-col min-h-0">
            <div className="flex-1 min-h-0 max-h-48 md:max-h-none overflow-y-auto px-2.5 py-2 space-y-1.5 bg-theme-surface/40">
              {messages.slice(-8).map((m) => (
                <div
                  key={m.id}
                  className={`text-[11px] px-2 py-1 rounded-lg max-w-[90%] ${
                    m.direction === "outbound"
                      ? "ml-auto bg-theme-accent text-theme-accent-fg"
                      : "bg-theme-card border border-theme-border text-theme-text"
                  }`}
                >
                  {(m.text || `[${m.type}]`).slice(0, 140)}
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-[10px] text-theme-muted text-center py-3">
                  Start the WhatsApp thread without leaving the call.
                </p>
              )}
            </div>

            <div className="px-2.5 pt-2 flex flex-wrap gap-1">
              {quickReplies.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void send({ text: q })}
                  className="text-[9px] font-semibold px-2 py-1 rounded-full border border-theme-border bg-theme-card text-theme-muted hover:text-theme-text cursor-pointer"
                >
                  {q.slice(0, 28)}…
                </button>
              ))}
            </div>

            {(showTemplates || showAttach) && (
              <div className="mx-2.5 mt-2 rounded-lg border border-theme-border bg-theme-card p-1.5 max-h-28 overflow-y-auto">
                {showTemplates &&
                  WHATSAPP_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="w-full text-left text-[10px] px-2 py-1.5 rounded-md hover:bg-theme-surface text-theme-text cursor-pointer border-0 bg-transparent"
                      onClick={() => {
                        setDraft(
                          t.text({
                            name: lead.name,
                            project: projectName,
                            agent: user.username,
                            plot: lead.plotId || "",
                          }),
                        );
                        setShowTemplates(false);
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                {showAttach &&
                  WHATSAPP_ATTACHMENTS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className="w-full text-left text-[10px] px-2 py-1.5 rounded-md hover:bg-theme-surface text-theme-text cursor-pointer border-0 bg-transparent"
                      onClick={() =>
                        void send({
                          type: a.type,
                          text: a.caption,
                          mediaUrl: a.mediaUrl,
                          mediaMimeType: a.mediaMimeType,
                          mediaFileName: a.mediaFileName,
                        })
                      }
                    >
                      {a.label}
                    </button>
                  ))}
              </div>
            )}

            {error && (
              <p className="px-2.5 pt-1 text-[9px] text-rose-500">{error}</p>
            )}

            <div className="p-2.5 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setShowAttach((v) => !v);
                  setShowTemplates(false);
                }}
                className="size-8 rounded-lg border border-theme-border bg-theme-surface text-theme-muted cursor-pointer inline-flex items-center justify-center"
                title="Brochure / attachments"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowTemplates((v) => !v);
                  setShowAttach(false);
                }}
                className="h-8 px-2 rounded-lg border border-theme-border bg-theme-surface text-[9px] font-bold text-theme-muted cursor-pointer"
              >
                Templates
              </button>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Quick WhatsApp reply…"
                className="flex-1 h-8 rounded-lg border border-theme-border bg-theme-surface text-theme-text text-[11px] px-2 outline-none focus:border-theme-accent"
              />
              <button
                type="button"
                disabled={sending || !draft.trim()}
                onClick={() => void send()}
                className="size-8 rounded-lg bg-green-600 text-white inline-flex items-center justify-center cursor-pointer disabled:opacity-50 border-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
