import { useMemo, useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  ArrowLeft,
  Paperclip,
  Send,
  Search,
  Check,
  CheckCheck,
  AlertCircle,
  Link2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Lead, User, Project } from "@/shared/types";
import { safeFormatDateTime, safeFormatTime } from "@/shared/utils/dateUtils";
import {
  WHATSAPP_TEMPLATES,
  WHATSAPP_ATTACHMENTS,
} from "@/shared/constants/whatsappTemplates";
import {
  messagingSend,
  useMessagingStatus,
  useWhatsAppMessages,
  useWhatsAppConversations,
  type WhatsAppMessage,
} from "@/features/messaging";
import { getLeadStatusColor } from "@/features/leads/utils/leadColors";

interface WhatsAppInboxViewProps {
  user: User;
  leads: Lead[];
  projects: Record<string, Project>;
  chatThreads: { lead: Lead; lastWaLog: any }[];
  simulatedWaLeadId: string;
  setSimulatedWaLeadId: (id: string) => void;
  logCall: (leadId: string, callData: any) => Promise<any>;
  addNotification: (notificationData: any) => Promise<any>;
}

function StatusTicks({ status }: { status?: string }) {
  if (status === "read") {
    return <CheckCheck className="w-3 h-3 text-sky-400 inline ml-1" />;
  }
  if (status === "delivered" || status === "sent") {
    return <CheckCheck className="w-3 h-3 text-theme-muted/70 inline ml-1" />;
  }
  if (status === "pending") {
    return <Check className="w-3 h-3 text-theme-muted/50 inline ml-1" />;
  }
  if (status === "failed") {
    return <AlertCircle className="w-3 h-3 text-theme-danger inline ml-1" />;
  }
  return null;
}

function legacyLogsToMessages(lead: Lead): WhatsAppMessage[] {
  const logs = (lead.callLogs || []).filter(
    (l) => l.note && String(l.note).includes("[WhatsApp"),
  );
  return logs.map((log, idx) => {
    const inbound =
      log.agent === "Customer" ||
      String(log.note).includes("[WhatsApp Received]");
    return {
      id: `legacy-${lead.id}-${idx}`,
      conversationId: "",
      leadId: lead.id,
      provider: "evolution" as const,
      direction: inbound ? ("inbound" as const) : ("outbound" as const),
      type: "text" as const,
      text: String(log.note)
        .replace(/^\[WhatsApp (Sent|Received)\]\s*/i, "")
        .trim(),
      status: "delivered" as const,
      timestamp: log.timestamp || log.date || "",
      agentName: log.agent,
      legacyNoteTag: "callLog",
    };
  });
}

export default function WhatsAppInboxView({
  user,
  leads,
  projects,
  chatThreads,
  simulatedWaLeadId,
  setSimulatedWaLeadId,
  logCall: _logCall,
  addNotification: _addNotification,
}: WhatsAppInboxViewProps) {
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { isConnected, publicConfig, status } = useMessagingStatus(true);
  const { conversations } = useWhatsAppConversations(150);
  const selectedLead =
    leads.find((l) => l.id === simulatedWaLeadId) || null;

  const { messages: liveMessages, loading: msgsLoading } = useWhatsAppMessages(
    selectedLead?.id,
  );

  const mergedMessages = useMemo(() => {
    if (!selectedLead) return [];
    const legacy = legacyLogsToMessages(selectedLead);
    if (liveMessages.length === 0) return legacy;
    const liveTs = new Set(liveMessages.map((m) => m.timestamp + (m.text || "")));
    const extra = legacy.filter(
      (m) => !liveTs.has(m.timestamp + (m.text || "")),
    );
    return [...extra, ...liveMessages].sort((a, b) =>
      String(a.timestamp).localeCompare(String(b.timestamp)),
    );
  }, [selectedLead, liveMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mergedMessages.length, simulatedWaLeadId]);

  const conversationThreads = useMemo(() => {
    const byLead = new Map<
      string,
      { lead: Lead; preview: string; at: string; unread: number }
    >();

    for (const c of conversations) {
      const lead = leads.find((l) => l.id === c.leadId);
      if (!lead) continue;
      byLead.set(c.leadId, {
        lead,
        preview: c.lastMessagePreview || "",
        at: c.lastMessageAt || "",
        unread: c.unreadCount || 0,
      });
    }

    for (const { lead, lastWaLog } of chatThreads) {
      if (byLead.has(lead.id)) continue;
      byLead.set(lead.id, {
        lead,
        preview: String(lastWaLog?.note || "")
          .replace(/^\[WhatsApp (Sent|Received)\]\s*/i, "")
          .slice(0, 80),
        at: lastWaLog?.timestamp || lastWaLog?.date || "",
        unread: 0,
      });
    }

    const rows = Array.from(byLead.values());
    const q = search.trim().toLowerCase();
    const filtered = q
      ? rows.filter(({ lead, preview }) =>
          `${lead.name} ${lead.phone} ${preview}`.toLowerCase().includes(q),
        )
      : rows;
    filtered.sort((a, b) => String(b.at).localeCompare(String(a.at)));
    return filtered;
  }, [conversations, leads, chatThreads, search]);

  const projectName =
    (selectedLead?.projectId && projects[selectedLead.projectId]?.name) ||
    "Golden Acres";

  const handleSend = async (opts?: {
    text?: string;
    type?: "text" | "image" | "document" | "audio" | "template";
    mediaUrl?: string;
    mediaMimeType?: string;
    mediaFileName?: string;
    templateId?: string;
  }) => {
    if (!selectedLead) return;
    const text = (opts?.text ?? draft).trim();
    const type = opts?.type || "text";
    if (type === "text" && !text) return;
    if (type === "audio") {
      setSendError("Voice notes coming soon.");
      return;
    }

    setSending(true);
    setSendError(null);
    try {
      const res = await messagingSend({
        leadId: selectedLead.id,
        type,
        text,
        mediaUrl: opts?.mediaUrl,
        mediaMimeType: opts?.mediaMimeType,
        mediaFileName: opts?.mediaFileName,
        templateId: opts?.templateId,
      });
      if (!res.ok) {
        setSendError(
          res.error ||
            "Message queued as failed — connect Evolution in Integrations.",
        );
      }
      setDraft("");
      setTemplatesOpen(false);
      setAttachmentsOpen(false);
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-theme border border-theme-border bg-theme-card px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2.5 justify-between">
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-theme-text tracking-tight leading-tight flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-theme-success" aria-hidden="true" />
            WhatsApp Inbox
          </h1>
          <p className="text-[10px] text-theme-muted mt-0.5 leading-snug">
            Conversations · Chat · Lead — provider-agnostic messaging.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
              isConnected
                ? "bg-theme-success/15 text-theme-success border-theme-success/30"
                : "bg-theme-surface text-theme-muted border-theme-border"
            }`}
          >
            {isConnected
              ? "Connected"
              : publicConfig.messagingEnabled || publicConfig.evolutionEnabled
                ? "Not Connected"
                : "Not Configured"}
          </span>
          {!isConnected && (
            <Link
              to="/admin?tab=integrations"
              className="inline-flex items-center gap-1 text-[10px] font-bold text-theme-accent hover:opacity-80"
            >
              <Link2 className="w-3 h-3" />
              Integrations
            </Link>
          )}
        </div>
      </div>

      <div className="bg-theme-card rounded-theme shadow-elevation-sm border border-theme-border h-[600px] flex overflow-hidden">
        {/* Panel 1: Conversations */}
        <div
          className={`w-full md:w-[28%] border-r border-theme-border flex flex-col bg-theme-surface/50 ${
            simulatedWaLeadId ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="p-2.5 border-b border-theme-border space-y-2">
            <span className="text-[10px] font-bold text-theme-muted uppercase tracking-wider block">
              Conversations
            </span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-theme-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, message…"
                className="w-full h-8 pl-8 pr-2 rounded-theme border border-theme-border bg-theme-card text-[11px] text-theme-text outline-none focus:border-theme-accent focus-visible:ring-2 focus-visible:ring-theme-ring"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-theme-border">
            {conversationThreads.length === 0 ? (
              <div className="p-6 text-center text-[11px] text-theme-muted">
                No WhatsApp threads yet. Send a message from a lead to start.
              </div>
            ) : (
              conversationThreads.map(({ lead, preview, at, unread }) => {
                const selected = simulatedWaLeadId === lead.id;
                return (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => {
                      setSimulatedWaLeadId(lead.id);
                      setDraft("");
                      setSendError(null);
                    }}
                    className={`w-full text-left p-3 cursor-pointer transition-colors border-0 ${
                      selected
                        ? "bg-theme-accent-muted border-l-4 border-l-theme-accent"
                        : "bg-transparent hover:bg-theme-surface border-l-4 border-l-transparent"
                    }`}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="text-xs font-bold text-theme-text truncate">
                        {lead.name}
                      </span>
                      <span className="text-[9px] text-theme-muted shrink-0">
                        {at ? safeFormatTime(at) : ""}
                      </span>
                    </div>
                    <p className="text-[10px] text-theme-muted truncate mt-0.5">
                      {lead.phone}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <p className="text-[10px] text-theme-muted/80 truncate flex-1">
                        {preview.slice(0, 80)}
                      </p>
                      {unread > 0 && (
                        <span className="shrink-0 min-w-4 h-4 px-1 rounded-full bg-green-600 text-white text-[9px] font-bold flex items-center justify-center">
                          {unread}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Panel 2: Chat */}
        <div
          className={`flex-1 flex flex-col min-w-0 border-r border-theme-border ${
            simulatedWaLeadId ? "flex" : "hidden md:flex"
          }`}
        >
          {!selectedLead ? (
            <div className="flex-1 flex items-center justify-center text-theme-muted text-xs p-6 text-center">
              Select a conversation to view messages.
            </div>
          ) : (
            <>
              <div className="px-3 py-2.5 bg-theme-card border-b border-theme-border flex items-center gap-2">
                <button
                  type="button"
                  className="md:hidden p-1.5 rounded-lg border border-theme-border cursor-pointer bg-theme-surface"
                  onClick={() => setSimulatedWaLeadId("")}
                >
                  <ArrowLeft className="w-4 h-4 text-theme-muted" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-theme-text truncate">
                    {selectedLead.name}
                  </p>
                  <p className="text-[10px] text-theme-muted truncate">
                    {selectedLead.phone} · {projectName}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-theme-surface/30">
                {msgsLoading && mergedMessages.length === 0 && (
                  <p className="text-[11px] text-theme-muted text-center py-8">
                    Loading messages…
                  </p>
                )}
                {mergedMessages.map((m) => {
                  const mine = m.direction === "outbound";
                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-theme px-3 py-2 text-[12px] leading-snug shadow-sm ${
                          mine
                            ? "bg-theme-accent text-theme-accent-fg rounded-br-md"
                            : "bg-theme-card text-theme-text border border-theme-border rounded-bl-md"
                        }`}
                      >
                        {m.type === "image" && m.mediaUrl && (
                          <img
                            src={m.mediaUrl}
                            alt=""
                            className="rounded-lg mb-1.5 max-h-40 object-cover"
                          />
                        )}
                        {m.type === "document" && (
                          <a
                            href={m.mediaUrl || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className={`underline text-[11px] block mb-1 ${
                              mine ? "text-theme-accent-fg/90" : "text-theme-accent"
                            }`}
                          >
                            {m.mediaFileName || "Document"}
                          </a>
                        )}
                        {m.type === "audio" && (
                          <p className="italic text-[11px] opacity-80 mb-1">
                            Voice note (playback coming soon)
                          </p>
                        )}
                        {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                        <div
                          className={`mt-1 flex items-center justify-end gap-0.5 text-[9px] ${
                            mine ? "text-theme-accent-fg/70" : "text-theme-muted"
                          }`}
                        >
                          <span>
                            {m.timestamp
                              ? safeFormatDateTime(m.timestamp, false)
                              : ""}
                          </span>
                          {mine && <StatusTicks status={m.status} />}
                        </div>
                        {m.status === "failed" && m.error && (
                          <p className="text-[9px] mt-1 opacity-80">{m.error}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {!isConnected && (
                <div className="px-3 py-2 border-t border-theme-border bg-amber-500/10 text-[10px] text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    Messaging provider is {status?.status || "not connected"}. You
                    can still compose; sends will be marked failed until connected.{" "}
                    <Link to="/admin?tab=integrations" className="font-bold underline">
                      Open Integrations
                    </Link>
                  </span>
                </div>
              )}

              {sendError && (
                <div className="px-3 py-1.5 text-[10px] text-theme-danger border-t border-theme-border">
                  {sendError}
                </div>
              )}

              <div className="relative border-t border-theme-border p-2.5 bg-theme-card space-y-2">
                {templatesOpen && (
                  <div className="absolute bottom-full left-2 right-2 mb-1 rounded-theme border border-theme-border bg-theme-card shadow-lg p-2 z-10 max-h-48 overflow-y-auto">
                    {WHATSAPP_TEMPLATES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] hover:bg-theme-surface text-theme-text cursor-pointer border-0 bg-transparent"
                        onClick={() => {
                          const text = t.text({
                            name: selectedLead.name,
                            project: projectName,
                            agent: user.username,
                            plot: selectedLead.plotId || "",
                          });
                          setDraft(text);
                          setTemplatesOpen(false);
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
                {attachmentsOpen && (
                  <div className="absolute bottom-full left-2 right-2 mb-1 rounded-theme border border-theme-border bg-theme-card shadow-lg p-2 z-10">
                    {WHATSAPP_ATTACHMENTS.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] hover:bg-theme-surface text-theme-text cursor-pointer border-0 bg-transparent"
                        onClick={() =>
                          void handleSend({
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
                    <button
                      type="button"
                      className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] text-theme-muted cursor-pointer border-0 bg-transparent"
                      onClick={() => setSendError("Voice notes coming soon.")}
                    >
                      Voice note (coming soon)
                    </button>
                  </div>
                )}

                <div className="flex items-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAttachmentsOpen((v) => !v);
                      setTemplatesOpen(false);
                    }}
                    className="size-8 inline-flex items-center justify-center rounded-lg border border-theme-border text-theme-muted hover:text-theme-text cursor-pointer bg-theme-surface"
                    title="Attachments"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTemplatesOpen((v) => !v);
                      setAttachmentsOpen(false);
                    }}
                    className="h-8 px-2 rounded-lg border border-theme-border text-[10px] font-bold text-theme-muted hover:text-theme-text cursor-pointer bg-theme-surface"
                  >
                    Templates
                  </button>
                  <textarea
                    rows={1}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                    placeholder="Type a WhatsApp message…"
                    className="flex-1 min-h-8 max-h-24 resize-y rounded-lg border border-theme-border bg-theme-surface text-theme-text text-[12px] px-2.5 py-1.5 outline-none focus:border-theme-accent"
                  />
                  <button
                    type="button"
                    disabled={sending || !draft.trim()}
                    onClick={() => void handleSend()}
                    className="size-8 inline-flex items-center justify-center rounded-lg bg-green-600 text-white cursor-pointer disabled:opacity-50 border-0"
                    title="Send"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Panel 3: Lead info */}
        <div
          className={`w-[240px] shrink-0 flex-col bg-theme-surface/40 ${
            selectedLead ? "hidden lg:flex" : "hidden lg:flex"
          }`}
        >
          <div className="p-2.5 border-b border-theme-border">
            <span className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">
              Lead
            </span>
          </div>
          {!selectedLead ? (
            <div className="p-4 text-[11px] text-theme-muted">
              Select a conversation to see lead details.
            </div>
          ) : (
            <div className="p-3 space-y-3 overflow-y-auto">
              <div>
                <p className="text-sm font-bold text-theme-text">{selectedLead.name}</p>
                <p className="text-[11px] text-theme-muted mt-0.5">
                  {selectedLead.phone}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase text-theme-muted">
                  Status
                </p>
                <span
                  className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${getLeadStatusColor(selectedLead.status)}`}
                >
                  {selectedLead.status}
                </span>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase text-theme-muted">
                  Assigned
                </p>
                <p className="text-[11px] text-theme-text mt-0.5">
                  {selectedLead.assignedToName || "Unassigned"}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase text-theme-muted">
                  Project
                </p>
                <p className="text-[11px] text-theme-text mt-0.5">{projectName}</p>
              </div>
              <Link
                to={`/lead/${selectedLead.id}`}
                className="inline-flex items-center justify-center w-full h-8 rounded-lg bg-theme-accent text-theme-accent-fg text-[11px] font-bold"
              >
                Open Lead
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
