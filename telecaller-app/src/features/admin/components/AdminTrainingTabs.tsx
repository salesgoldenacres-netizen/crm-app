import { useState } from "react";
import {
  Lightbulb,
  Gift,
  Cake,
  Trash2,
  BookOpen,
  FileText,
  Download,
  Globe,
  MessageCircle,
} from "lucide-react";
import { useCoachingTipStore, useEventsStore, useTrainingStore, useAuditLogsStore } from "@/features/admin/hooks/adminStores";
import { User } from "@/shared/types";
import { useToast } from "@/shared/components/Toast";
import Dialog from "@/shared/components/ui/Dialog";

interface AdminTrainingTabsProps {
  tab: "coaching" | "events" | "training";
  user: User;
}

export default function AdminTrainingTabs({
  tab,
  user,
}: AdminTrainingTabsProps) {
  const { coachingTip, updateCoachingTip } = useCoachingTipStore();
  const { events: calendarEvents, addEvent, deleteEvent } = useEventsStore();
  const { trainingData, updateTrainingData } = useTrainingStore();
  const { logAuditEvent } = useAuditLogsStore();
  const { toast } = useToast();
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [deleteEventName, setDeleteEventName] = useState("");
  const [coachingTipDraft, setCoachingTipDraft] = useState(coachingTip || "");
  const [newEventForm, setNewEventForm] = useState({
    name: "",
    date: "",
    type: "birthday",
  });
  const [newDocForm, setNewDocForm] = useState({ title: "", url: "" });
  const [newVideoForm, setNewVideoForm] = useState({ title: "", url: "" });
  const [newObjectionForm, setNewObjectionForm] = useState({
    title: "",
    content: "",
  });

  const [prevCoachingTip, setPrevCoachingTip] = useState(coachingTip);
  if (coachingTip !== prevCoachingTip) {
    setPrevCoachingTip(coachingTip);
    setCoachingTipDraft(coachingTip || "");
  }

  if (tab === "coaching") {
    return (
      <div className="space-y-3 animate-fadeIn text-sm">

      <div className="max-w-2xl bg-theme-card rounded-theme border border-theme-border p-4 shadow-sm space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-theme-muted border-b border-theme-border pb-2">
            Daily Coaching Tip (Shown to Telecallers)
          </h3>
          <p className="text-xs text-theme-muted">
            This tip appears as an amber banner at the top of the telecaller
            dashboard. Update it regularly to keep the team motivated.
          </p>
          <div>
            <textarea
              rows={4}
              value={coachingTipDraft}
              onChange={(e) => setCoachingTipDraft(e.target.value)}
              placeholder="e.g. Keep pushing for site visits today team! Consistency is key."
              className="w-full border border-theme-border dark:bg-theme-surface dark:text-theme-text rounded-lg text-sm p-3 focus:ring-theme-ring focus:border-theme-accent"
            />
          </div>
          <div className="flex justify-between items-center gap-4">
            <div className="bg-theme-warning/10 border border-theme-warning/30 rounded-theme p-3 flex-1">
              <p className="text-xs font-semibold text-theme-warning flex items-center">
                <Lightbulb className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                Preview: &quot;
                {coachingTipDraft || "Your tip will appear here..."}&quot;
              </p>
            </div>
            <button
              onClick={async () => {
                if (!coachingTipDraft.trim()) {
                  toast("Please enter a tip text.", "error");
                  return;
                }
                await updateCoachingTip(coachingTipDraft.trim());
                await logAuditEvent({
                  action: "Update Coaching Tip",
                  details: coachingTipDraft.trim(),
                  user: user.username,
                });
                toast("Coaching tip updated!", "success");
              }}
              className="px-4 py-2 bg-theme-warning hover:opacity-90 text-white rounded-theme text-xs font-semibold shadow cursor-pointer whitespace-nowrap"
            >
              Save Tip
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (tab === "events") {
    return (
    <>
      <div className="space-y-6 animate-fadeIn text-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-theme-card rounded-theme border border-theme-border p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-theme-muted border-b border-theme-border pb-2">
              Add Birthday / Anniversary
            </h3>
            <p className="text-xs text-theme-muted">
              Events appear in the telecaller dashboard on the matching day,
              prompting them to call.
            </p>
            <div>
              <label className="block text-xs font-semibold text-theme-muted uppercase mb-1">
                Client Name *
              </label>
              <input
                type="text"
                value={newEventForm.name}
                onChange={(e) =>
                  setNewEventForm({ ...newEventForm, name: e.target.value })
                }
                placeholder="e.g. Arjun Mehta (Lead #102)"
                className="w-full border border-theme-border dark:bg-theme-surface dark:text-theme-text rounded-lg text-xs p-2.5"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-theme-muted uppercase mb-1">
                Date (MM-DD) *
              </label>
              <input
                type="text"
                value={newEventForm.date}
                onChange={(e) =>
                  setNewEventForm({ ...newEventForm, date: e.target.value })
                }
                placeholder="e.g. 06-04"
                maxLength={5}
                className="w-full border border-theme-border dark:bg-theme-surface dark:text-theme-text rounded-lg text-xs p-2.5 font-mono"
              />
              <p className="text-[10px] text-theme-muted mt-1">
                Format: MM-DD (e.g. 06-04 for June 4th)
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-theme-muted uppercase mb-1">
                Type
              </label>
              <div className="flex space-x-3">
                {[
                  { val: "birthday", label: "Birthday" },
                  { val: "anniversary", label: "Anniversary" },
                ].map((t) => (
                  <button
                    key={t.val}
                    onClick={() =>
                      setNewEventForm({ ...newEventForm, type: t.val })
                    }
                    className={`px-3 py-1.5 rounded-theme text-xs font-semibold border cursor-pointer transition-colors ${newEventForm.type === t.val ? "bg-theme-danger/15 text-theme-danger border-theme-danger/30" : "bg-theme-surface text-theme-muted border-theme-border hover:bg-theme-card"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={async () => {
                if (!newEventForm.name.trim() || !newEventForm.date.trim()) {
                  toast("Name and Date are required.", "error");
                  return;
                }
                if (!/^\d{2}-\d{2}$/.test(newEventForm.date)) {
                  toast("Date must be MM-DD format.", "error");
                  return;
                }
                await addEvent(newEventForm);
                await logAuditEvent({
                  action: "Add Client Event",
                  details: `${newEventForm.type} for ${newEventForm.name} on ${newEventForm.date}`,
                  user: user.username,
                });
                setNewEventForm({ name: "", date: "", type: "birthday" });
                toast("Event added!", "success");
              }}
              className="w-full py-2 bg-theme-danger hover:opacity-90 text-white rounded-theme text-xs font-semibold shadow cursor-pointer"
            >
              + Add Event Reminder
            </button>
          </div>

          <div className="bg-theme-card rounded-theme border border-theme-border p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-theme-muted border-b border-theme-border pb-2">
              Saved Events ({calendarEvents.length})
            </h3>
            {calendarEvents.length === 0 ? (
              <div className="py-8 text-center text-theme-muted italic text-xs">
                No events saved yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {calendarEvents
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between p-3 bg-theme-surface rounded-lg border border-theme-border"
                    >
                      <div className="flex items-center space-x-3">
                        {ev.type === "birthday" ? (
                          <Cake className="w-4 h-4 text-pink-500 flex-shrink-0" />
                        ) : (
                          <Gift className="w-4 h-4 text-theme-danger flex-shrink-0" aria-hidden="true" />
                        )}
                        <div>
                          <p className="text-xs font-semibold text-theme-text">
                            {ev.name}
                          </p>
                          <p className="text-[10px] text-theme-muted capitalize">
                            {ev.type} — {ev.date}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteEventId(ev.id);
                          setDeleteEventName(ev.name ?? ev.title ?? "");
                        }}
                        className="text-theme-danger hover:text-theme-danger/80 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Dialog
        isOpen={!!deleteEventId}
        onClose={() => {
          setDeleteEventId(null);
          setDeleteEventName("");
        }}
        title="Delete event"
        description={`Delete event for ${deleteEventName}?`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={async () => {
          if (!deleteEventId) return;
          await deleteEvent(deleteEventId);
          await logAuditEvent({
            action: "Delete Client Event",
            details: `Deleted event for ${deleteEventName}`,
            user: user.username,
          });
          setDeleteEventId(null);
          setDeleteEventName("");
          toast("Event deleted.", "success");
        }}
      />
    </>
    );
  }

  if (tab === "training") {
    return (
      <div className="bg-theme-card rounded-theme shadow-sm border border-theme-border overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-theme-border bg-theme-surface flex justify-between items-center">
          <h2 className="text-lg font-bold text-theme-text flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-theme-accent" />
            Training Content Management
          </h2>
        </div>

        <div className="p-6 space-y-8">
          {/* Quick Reference Docs */}
          <div className="space-y-4">
            <h3 className="text-md font-bold text-theme-text flex items-center border-b border-theme-border pb-2">
              <FileText className="w-4 h-4 mr-2 text-theme-accent" aria-hidden="true" />
              Quick Reference Docs
            </h3>

            <div className="bg-theme-surface p-4 rounded-lg border border-theme-border flex flex-col md:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-theme-muted mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  value={newDocForm.title}
                  onChange={(e) =>
                    setNewDocForm({ ...newDocForm, title: e.target.value })
                  }
                  placeholder="e.g. Project Brochure PDF"
                  className="w-full text-sm border border-theme-border bg-theme-surface text-theme-text rounded-theme p-2"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-theme-muted mb-1">
                  URL / Link
                </label>
                <input
                  type="text"
                  value={newDocForm.url}
                  onChange={(e) =>
                    setNewDocForm({ ...newDocForm, url: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full text-sm border-theme-border dark:bg-theme-surface rounded-md p-2"
                />
              </div>
              <button
                onClick={() => {
                  if (newDocForm.title && newDocForm.url) {
                    updateTrainingData({
                      ...trainingData,
                      documents: [
                        ...(trainingData.documents || []),
                        { id: Date.now().toString(), ...newDocForm },
                      ],
                    });
                    setNewDocForm({ title: "", url: "" });
                  }
                }}
                disabled={!newDocForm.title || !newDocForm.url}
                className="px-4 py-2 bg-theme-accent hover:opacity-90 text-white rounded-md text-sm font-semibold disabled:opacity-50"
              >
                Add Document
              </button>
            </div>

            <div className="space-y-2">
              {(trainingData?.documents || []).map((doc: any) => (
                <div
                  key={doc.id}
                  className="flex justify-between items-center bg-theme-card p-3 rounded border border-theme-border"
                >
                  <div className="flex items-center text-sm">
                    <Download className="w-4 h-4 mr-2 text-theme-accent" aria-hidden="true" />
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-theme-accent hover:underline"
                    >
                      {doc.title}
                    </a>
                  </div>
                  <button
                    onClick={() =>
                      updateTrainingData({
                        ...trainingData,
                        documents: trainingData.documents.filter(
                          (d: any) => d.id !== doc.id
                        ),
                      })
                    }
                    className="text-theme-danger hover:text-theme-danger/80 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Video Modules */}
          <div className="space-y-4">
            <h3 className="text-md font-bold text-theme-text flex items-center border-b border-theme-border pb-2">
              <Globe className="w-4 h-4 mr-2 text-theme-accent" aria-hidden="true" />
              Training Videos
            </h3>

            <div className="bg-theme-surface p-4 rounded-lg border border-theme-border flex flex-col md:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-theme-muted mb-1">
                  Video Title
                </label>
                <input
                  type="text"
                  value={newVideoForm.title}
                  onChange={(e) =>
                    setNewVideoForm({ ...newVideoForm, title: e.target.value })
                  }
                  placeholder="e.g. How to Close on Site Visits"
                  className="w-full text-sm border-theme-border dark:bg-theme-surface rounded-md p-2"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-theme-muted mb-1">
                  Video URL (YouTube/Drive)
                </label>
                <input
                  type="text"
                  value={newVideoForm.url}
                  onChange={(e) =>
                    setNewVideoForm({ ...newVideoForm, url: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full text-sm border-theme-border dark:bg-theme-surface rounded-md p-2"
                />
              </div>
              <button
                onClick={() => {
                  if (newVideoForm.title && newVideoForm.url) {
                    updateTrainingData({
                      ...trainingData,
                      videos: [
                        ...(trainingData.videos || []),
                        { id: Date.now().toString(), ...newVideoForm },
                      ],
                    });
                    setNewVideoForm({ title: "", url: "" });
                  }
                }}
                disabled={!newVideoForm.title || !newVideoForm.url}
                className="px-4 py-2 bg-theme-accent hover:opacity-90 text-white rounded-md text-sm font-semibold disabled:opacity-50"
              >
                Add Video
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(trainingData?.videos || []).map((video: any) => (
                <div
                  key={video.id}
                  className="relative bg-theme-card p-4 rounded border border-theme-border text-center"
                >
                  <button
                    onClick={() =>
                      updateTrainingData({
                        ...trainingData,
                        videos: trainingData.videos.filter(
                          (v: any) => v.id !== video.id
                        ),
                      })
                    }
                    className="absolute top-2 right-2 text-theme-danger hover:text-theme-danger/80 p-1 bg-theme-card rounded-full shadow cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="h-24 bg-theme-surface rounded flex items-center justify-center mb-3">
                    <Globe className="w-8 h-8 text-theme-muted" />
                  </div>
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-theme-accent hover:underline block truncate"
                  >
                    {video.title}
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Objections & Pitches */}
          <div className="space-y-4">
            <h3 className="text-md font-bold text-theme-text flex items-center border-b border-theme-border pb-2">
              <MessageCircle className="w-4 h-4 mr-2 text-theme-accent" aria-hidden="true" />
              Pitches & Objections
            </h3>

            <div className="bg-theme-surface p-4 rounded-lg border border-theme-border flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-theme-muted mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newObjectionForm.title}
                  onChange={(e) =>
                    setNewObjectionForm({
                      ...newObjectionForm,
                      title: e.target.value,
                    })
                  }
                  placeholder="e.g. Handling 'Not interested right now'"
                  className="w-full text-sm border-theme-border dark:bg-theme-surface rounded-md p-2"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-theme-muted mb-1">
                  Content (Use empty lines for paragraphs)
                </label>
                <textarea
                  value={newObjectionForm.content}
                  onChange={(e) =>
                    setNewObjectionForm({
                      ...newObjectionForm,
                      content: e.target.value,
                    })
                  }
                  placeholder="Paragraph 1...\n\nParagraph 2..."
                  rows={4}
                  className="w-full text-sm border border-theme-border bg-theme-surface text-theme-text rounded-theme p-2 font-mono"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    if (newObjectionForm.title && newObjectionForm.content) {
                      const paragraphs = newObjectionForm.content
                        .split("\n")
                        .filter((p) => p.trim() !== "");
                      updateTrainingData({
                        ...trainingData,
                        objections: [
                          ...(trainingData.objections || []),
                          {
                            id: Date.now().toString(),
                            title: newObjectionForm.title,
                            content: paragraphs,
                          },
                        ],
                      });
                      setNewObjectionForm({ title: "", content: "" });
                    }
                  }}
                  disabled={
                    !newObjectionForm.title || !newObjectionForm.content
                  }
                  className="px-4 py-2 bg-theme-accent hover:opacity-90 text-white rounded-md text-sm font-semibold disabled:opacity-50"
                >
                  Add Pitch / Objection
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {(trainingData?.objections || []).map((obj: any) => (
                <div
                  key={obj.id}
                  className="bg-theme-card rounded-theme shadow-sm border border-theme-border overflow-hidden relative"
                >
                  <button
                    onClick={() =>
                      updateTrainingData({
                        ...trainingData,
                        objections: trainingData.objections.filter(
                          (o: any) => o.id !== obj.id
                        ),
                      })
                    }
                    className="absolute top-4 right-4 text-theme-danger hover:text-theme-danger/80 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="px-6 py-4 border-b border-theme-border bg-theme-surface pr-12">
                    <h4 className="font-bold text-theme-text">
                      {obj.title}
                    </h4>
                  </div>
                  <div className="p-6 text-sm text-theme-text leading-relaxed space-y-4">
                    {Array.isArray(obj.content) ? (
                      obj.content.map((p: string, i: number) => (
                        <p
                          key={i}
                          className={
                            p.startsWith("Often")
                              ? ""
                              : p.startsWith("Step")
                                ? "font-medium"
                                : "italic bg-theme-danger/10 p-3 rounded-theme border border-theme-danger/20"
                          }
                        >
                          {p}
                        </p>
                      ))
                    ) : (
                      <p>{obj.content}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
