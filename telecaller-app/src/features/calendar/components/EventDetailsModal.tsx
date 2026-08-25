import { useState } from "react";
import { X, Calendar as CalendarIcon, Phone, User, Building2, ExternalLink, Clock, DollarSign, Check } from "lucide-react";
import { CalendarEvent, CALENDAR_EVENT_TYPES } from "../types";
import { formatCurrency } from "@/features/deals/components/DealsKanbanBoard";

interface EventDetailsModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onStartCall?: (phone: string, name: string) => void;
  onRescheduleDate?: (leadId: string, newDateYmd: string) => Promise<void>;
  navigate: (path: string) => void;
}

export default function EventDetailsModal({
  event,
  onClose,
  onStartCall,
  onRescheduleDate,
  navigate,
}: EventDetailsModalProps) {
  const [newDateYmd, setNewDateYmd] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDone, setRescheduleDone] = useState(false);

  if (!event) return null;

  const typeConfig = CALENDAR_EVENT_TYPES.find((t) => t.type === event.type);

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDateYmd || !onRescheduleDate) return;

    setIsRescheduling(true);
    try {
      await onRescheduleDate(event.leadId, newDateYmd);
      setRescheduleDone(true);
      setTimeout(() => {
        setIsRescheduling(false);
        setRescheduleDone(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
      setIsRescheduling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop — Full Page Cover with Consistent Blur */}
      <div
        className="fixed inset-0 w-screen h-screen min-h-[100dvh] bg-theme-overlay backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-0 z-10 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-theme-card border border-theme-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[min(90vh,calc(100dvh-2rem))] pointer-events-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme-border shrink-0">
          <div className="flex items-center gap-2.5">
            <span className={`w-3 h-3 rounded-full ${typeConfig?.dotClass || "bg-theme-accent"}`} />
            <div>
              <h3 className="text-base font-extrabold text-theme-text leading-tight">{event.title}</h3>
              <p className="text-xs font-semibold text-theme-muted">{typeConfig?.label}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-theme-muted hover:text-theme-text p-1.5 rounded-lg hover:bg-theme-surface transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs flex-1 min-h-0 overflow-y-auto">
          {/* Lead Details Box */}
          <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-theme-text text-sm">
                <User className="w-4 h-4 text-theme-accent" />
                <span>{event.leadName}</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeConfig?.badgeClass}`}>
                {event.status || "Scheduled"}
              </span>
            </div>

            <div className="flex items-center gap-3 text-theme-muted font-medium pt-1">
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                <span>{event.phone}</span>
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{event.date} at {event.time || "10:00 AM"}</span>
              </span>
            </div>

            {(event.projectName || event.plotNumber) && (
              <div className="flex items-center gap-1.5 text-theme-muted font-medium pt-1">
                <Building2 className="w-3.5 h-3.5 text-theme-accent" />
                <span>{event.projectName || "Project"} {event.plotNumber ? `· Plot ${event.plotNumber}` : ""}</span>
              </div>
            )}

            {event.amount && (
              <div className="flex items-center gap-1 text-theme-accent font-extrabold text-sm pt-1">
                <DollarSign className="w-4 h-4" />
                <span>Deal Value: {formatCurrency(event.amount)}</span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {event.phone && onStartCall && (
              <button
                type="button"
                onClick={() => {
                  onStartCall(event.phone, event.leadName);
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:opacity-95 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Phone className="w-4 h-4" />
                <span>Call Lead Now</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                navigate(`/lead/${event.leadId}`);
                onClose();
              }}
              className="py-2.5 px-4 rounded-xl bg-theme-surface border border-theme-border font-bold text-xs text-theme-text hover:bg-theme-accent hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Dossier</span>
            </button>
          </div>

          {/* Quick Reschedule Section */}
          {onRescheduleDate && (
            <form onSubmit={handleRescheduleSubmit} className="pt-3 border-t border-theme-border space-y-2">
              <label className="block text-xs font-bold text-theme-text flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-theme-accent" />
                <span>Reschedule Follow-up Date</span>
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  required
                  value={newDateYmd}
                  onChange={(e) => setNewDateYmd(e.target.value)}
                  className="flex-1 bg-theme-surface border border-theme-border rounded-lg px-3 py-2 text-xs font-semibold text-theme-text focus:outline-none focus:ring-2 focus:ring-theme-accent"
                />

                <button
                  type="submit"
                  disabled={isRescheduling || !newDateYmd}
                  className="px-4 py-2 rounded-lg bg-theme-accent text-white font-bold text-xs hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1 cursor-pointer"
                >
                  {rescheduleDone ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Updated</span>
                    </>
                  ) : isRescheduling ? (
                    "Saving..."
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
