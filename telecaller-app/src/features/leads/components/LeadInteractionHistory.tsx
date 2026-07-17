import { useState, useMemo } from "react";
import {
  FileText,
  Search,
  Phone,
  MessageCircle,
  Mail,
  AlertCircle,
  User,
  Calendar,
  Check,
  Star,
  Plus,
  StickyNote,
  MapPin,
  Tag,
  GitMerge,
} from "lucide-react";
import { safeFormatDateTime } from "@/shared/utils/dateUtils";
import { getLeadStatusColor } from "@/features/leads/utils/leadColors";
import CallRecordingPlayer from "@/shared/components/CallRecordingPlayer";
import { Lead } from "@/shared/types";
import { useTimelineEvents } from "@/features/messaging";
import type { TimelineEvent } from "@/features/messaging";

interface LeadInteractionHistoryProps {
  activeLead: Lead;
}

function TimelineIcon({ event }: { event: TimelineEvent }) {
  const cls = "w-2.5 h-2.5 text-white";
  const key = event.icon || event.type;
  switch (key) {
    case "message":
      return <MessageCircle className={cls} />;
    case "phone":
      return <Phone className={cls} />;
    case "user":
      return <User className={cls} />;
    case "calendar":
      return <Calendar className={cls} />;
    case "check":
      return <Check className={cls} />;
    case "star":
      return <Star className={cls} />;
    case "plus":
      return <Plus className={cls} />;
    case "note":
      return <StickyNote className={cls} />;
    case "status":
      return <AlertCircle className={cls} />;
    case "map":
      return <MapPin className={cls} />;
    case "tag":
      return <Tag className={cls} />;
    case "merge":
      return <GitMerge className={cls} />;
    default:
      return <FileText className={cls} />;
  }
}

function iconBg(event: TimelineEvent): string {
  if (event.type.startsWith("whatsapp")) return "bg-green-500";
  if (event.type === "call_completed") return "bg-theme-accent";
  if (event.type.includes("assign")) return "bg-violet-500";
  if (event.type.includes("followup")) return "bg-amber-500";
  if (event.type.startsWith("site_visit")) return "bg-teal-600";
  if (event.type.startsWith("discount")) return "bg-orange-500";
  if (event.type === "lead_merged") return "bg-indigo-500";
  if (event.type.includes("book") || event.type.includes("convert"))
    return "bg-emerald-600";
  if (event.type === "note_added") return "bg-sky-500";
  return "bg-slate-500";
}

function isSystemTimelineEvent(ev: TimelineEvent): boolean {
  return (
    ev.source === "system" ||
    ev.source === "site_visit" ||
    ev.source === "discount" ||
    ev.type === "lead_status_changed" ||
    ev.type === "lead_assigned" ||
    ev.type === "lead_reassigned" ||
    ev.type === "lead_created" ||
    ev.type === "lead_booked" ||
    ev.type === "lead_merged" ||
    ev.type.startsWith("site_visit_") ||
    ev.type.startsWith("discount_")
  );
}

export default function LeadInteractionHistory({
  activeLead,
}: LeadInteractionHistoryProps) {
  const [notesSearch, setNotesSearch] = useState("");
  const [timelineFilter, setTimelineFilter] = useState("all");
  /** null = derive from timeline presence (collapse when activity stream has events). */
  const [legacyOverride, setLegacyOverride] = useState<boolean | null>(null);

  const { events, loading } = useTimelineEvents(activeLead.id, 150);
  const showLegacy = legacyOverride ?? events.length === 0;

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (notesSearch.trim()) {
        if (!ev.summary?.toLowerCase().includes(notesSearch.toLowerCase())) {
          return false;
        }
      }
      if (timelineFilter === "calls") {
        return ev.type === "call_completed";
      }
      if (timelineFilter === "whatsapp") {
        return ev.type.startsWith("whatsapp");
      }
      if (timelineFilter === "system") {
        return isSystemTimelineEvent(ev);
      }
      return true;
    });
  }, [events, notesSearch, timelineFilter]);

  const filteredLogs = useMemo(() => {
    if (!activeLead.callLogs) return [];
    return [...activeLead.callLogs]
      .reverse()
      .filter((log) => {
        if (notesSearch.trim()) {
          const matchesSearch = log.note
            ?.toLowerCase()
            .includes(notesSearch.toLowerCase());
          if (!matchesSearch) return false;
        }

        if (timelineFilter === "calls") {
          const isCall = log.note && log.note.includes("[Call Log - Duration:");
          const isWA = log.note && log.note.includes("[WhatsApp Sent]");
          const isSMS = log.note && log.note.includes("[SMS Sent]");
          const isEmail = log.note && log.note.includes("[Email Sent]");
          const isSystem =
            log.note &&
            (log.note.includes("[System") ||
              log.note.includes("[Pipeline") ||
              log.note.includes("[Discount"));

          if (isWA || isSMS || isEmail || isSystem) return false;
          return isCall || (!isWA && !isSMS && !isEmail && !isSystem);
        }
        if (timelineFilter === "whatsapp") {
          return (
            log.note &&
            (log.note.includes("[WhatsApp Sent]") ||
              log.note.includes("[WhatsApp Received]"))
          );
        }
        if (timelineFilter === "system") {
          return (
            log.note &&
            (log.note.includes("[System") ||
              log.note.includes("[Pipeline") ||
              log.note.includes("[Discount") ||
              log.note.includes("[Call Log - Duration: NaN:NaN]"))
          );
        }

        return true;
      });
  }, [activeLead.callLogs, notesSearch, timelineFilter]);

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-theme-border">
        <h4 className="text-xs font-black text-theme-muted uppercase tracking-wider flex items-center">
          <FileText className="w-3.5 h-3.5 mr-1.5 text-theme-accent" />
          Lead Timeline
        </h4>

        <div className="flex items-center space-x-1 bg-theme-surface p-0.5 rounded-xl border border-theme-border text-[10px]">
          {[
            { id: "all", label: "All" },
            { id: "calls", label: "Calls" },
            { id: "whatsapp", label: "WhatsApp" },
            { id: "system", label: "System" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTimelineFilter(tab.id)}
              className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                timelineFilter === tab.id
                  ? "bg-brand-gradient text-white shadow-md border border-transparent"
                  : "text-theme-muted hover:text-theme-text hover:bg-theme-card"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-40">
          <input
            type="text"
            placeholder="Filter..."
            value={notesSearch}
            onChange={(e) => setNotesSearch(e.target.value)}
            className="w-full text-[10px] py-1.5 pl-8 pr-3 bg-theme-card border border-slate-200 dark:border-slate-850 rounded-xl focus:ring-2 focus:ring-theme-ring/20 focus:border-theme-accent text-slate-700 dark:text-slate-200 outline-none transition-all font-semibold"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
        </div>
      </div>

      {/* Primary: timelineEvents */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-theme-muted mb-2">
          Activity stream
        </p>
        <div className="relative border-l border-theme-border pl-6 ml-3 space-y-4 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
          {loading && (
            <p className="text-xs text-slate-400 italic">Loading timeline…</p>
          )}
          {!loading && filteredEvents.length === 0 && (
            <p className="text-xs text-slate-400 italic">
              No timeline events yet — new CRM activity appears here.
            </p>
          )}
          {filteredEvents.map((ev) => (
            <div key={ev.id} className="relative group/item transition-all">
              <span
                className={`absolute -left-[28px] top-1.5 ${iconBg(ev)} w-5.5 h-5.5 flex items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900 transition-transform group-hover/item:scale-110 shadow-sm`}
              >
                <TimelineIcon event={ev} />
              </span>
              <div className="text-[10px] text-theme-muted flex items-center space-x-2 font-bold uppercase tracking-wider">
                <span>{safeFormatDateTime(ev.timestamp)}</span>
                {ev.actorName && (
                  <>
                    <span>•</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      By {ev.actorName}
                    </span>
                  </>
                )}
                <span>•</span>
                <span className="px-2 py-0.5 rounded-full font-black border border-theme-border text-theme-muted">
                  {ev.type.replace(/_/g, " ")}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200 bg-slate-50/40 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 whitespace-pre-line leading-relaxed shadow-sm">
                {ev.summary}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Legacy: callLogs (read-only compatibility) */}
      <div className="pt-2 border-t border-theme-border">
        <button
          type="button"
          onClick={() => setLegacyOverride((v) => !(v ?? events.length === 0))}
          className="text-[10px] font-bold uppercase tracking-wider text-theme-muted mb-2 cursor-pointer hover:text-theme-text"
        >
          Legacy history (call logs) {showLegacy ? "▾" : "▸"}
        </button>
        {showLegacy && (
          <div className="relative border-l border-theme-border pl-6 ml-3 space-y-4 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin opacity-90">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log, idx) => {
                const isWA =
                  log.note &&
                  (log.note.includes("[WhatsApp Sent]") ||
                    log.note.includes("[WhatsApp Received]"));
                const isSMS = log.note && log.note.includes("[SMS Sent]");
                const isEmail = log.note && log.note.includes("[Email Sent]");
                const isSystem = log.note && log.note.includes("[System]");

                let icon = <Phone className="w-2.5 h-2.5 text-white" />;
                let bgColor = "bg-theme-accent";

                if (isWA) {
                  icon = <MessageCircle className="w-2.5 h-2.5 text-white" />;
                  bgColor = "bg-green-500";
                } else if (isSMS) {
                  icon = <MessageCircle className="w-2.5 h-2.5 text-white" />;
                  bgColor = "bg-amber-500";
                } else if (isEmail) {
                  icon = <Mail className="w-2.5 h-2.5 text-white" />;
                  bgColor = "bg-blue-500";
                } else if (isSystem) {
                  icon = <AlertCircle className="w-2.5 h-2.5 text-white" />;
                  bgColor = "bg-slate-500";
                }

                return (
                  <div key={idx} className="relative group/item transition-all">
                    <span
                      className={`absolute -left-[28px] top-1.5 ${bgColor} w-5.5 h-5.5 flex items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900 transition-transform group-hover/item:scale-110 shadow-sm`}
                    >
                      {icon}
                    </span>
                    <div className="text-[10px] text-theme-muted flex items-center space-x-2 font-bold uppercase tracking-wider">
                      <span>{safeFormatDateTime(log.date)}</span>
                      <span>•</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        By {log.agent}
                      </span>
                      <span>•</span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-black border ${getLeadStatusColor(log.status)}`}
                      >
                        {log.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200 bg-slate-50/40 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 whitespace-pre-line leading-relaxed shadow-sm hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                      {log.note || "No notes logged"}
                    </p>

                    {(() => {
                      const durationMatch = log.note?.match(
                        /\[Call Log - Duration:\s*([0-9:]+)\]/,
                      );
                      if (durationMatch) {
                        return (
                          <CallRecordingPlayer duration={durationMatch[1]} />
                        );
                      }
                      return null;
                    })()}
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 italic">
                No matching legacy logs
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
