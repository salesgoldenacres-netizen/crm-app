import { useState } from "react";
import { Award } from "lucide-react";
import { User, Lead } from "@/shared/types";
import CallAuditRatingModal from "./CallAuditRatingModal";

interface CallQualityTabProps {
  users: User[];
  leads: Lead[];
  isManagerial: (role: string) => boolean;
  rateCallLog: (leadId: string, logIndex: number, score: number, feedback: string) => Promise<void>;
  safeFormatDateTime: (dateStr?: string, showTime?: boolean) => string;
}

export default function CallQualityTab({
  users,
  leads,
  isManagerial,
  rateCallLog,
  safeFormatDateTime,
}: CallQualityTabProps) {
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [ratingTargetLeadId, setRatingTargetLeadId] = useState("");
  const [ratingTargetLogIndex, setRatingTargetLogIndex] = useState(-1);

  return (
    <>
      <div className="space-y-6 animate-fadeIn text-sm">
        <div className="flex justify-between items-center mb-6">
          </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Agent average scoreboard */}
          <div className="md:col-span-1 space-y-4">
            <div className="bg-theme-card rounded-xl p-5 border dark:border-gray-700 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center">
                <Award className="w-4 h-4 mr-1.5 text-amber-500" /> Agent Averages
              </h3>
              <div className="space-y-3.5">
                {users
                  .filter((u) => !isManagerial(u.role))
                  .map((tc) => {
                    let totalScores = 0;
                    let ratedCount = 0;
                    leads.forEach((l) => {
                      (l.callLogs || []).forEach((log) => {
                        if (log.agent === tc.username && log.rating) {
                          totalScores += log.rating;
                          ratedCount++;
                        }
                      });
                    });
                    const average = ratedCount > 0 ? (totalScores / ratedCount).toFixed(1) : "—";

                    return (
                      <div
                        key={tc.id}
                        className="flex justify-between items-center bg-theme-surface p-2.5 rounded-lg border dark:border-gray-800"
                      >
                        <span className="font-bold text-theme-text text-xs">
                          {tc.username}{" "}
                          <span className="text-[10px] text-gray-400 font-normal">({tc.role})</span>
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-amber-500 text-sm font-black">★</span>
                          <span className="font-extrabold text-theme-text">{average}</span>
                          <span className="text-[10px] text-gray-400">({ratedCount} calls)</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Right Column: Recent calls list with rating triggers */}
          <div className="md:col-span-2 bg-theme-card rounded-xl shadow-sm border border-theme-border p-5 overflow-hidden">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Evaluate Call Logs</h3>
            <div className="divide-y divide-theme-border max-h-[500px] overflow-y-auto pr-1">
              {leads
                .flatMap((l) =>
                  (l.callLogs || []).map((log, idx) => ({
                    lead: l,
                    log,
                    index: idx,
                  }))
                )
                .filter(
                  (item) =>
                    item.log.agent !== "system" &&
                    item.log.agent !== "System (Auto)" &&
                    item.log.note &&
                    !item.log.note.includes("Initial import")
                )
                .sort((a, b) => new Date(b.log.date).getTime() - new Date(a.log.date).getTime())
                .map((item) => (
                  <div
                    key={`${item.lead.id}-${item.index}`}
                    className="py-4 first:pt-0 flex justify-between items-start gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-theme-accent">{item.log.agent}</span>
                        <span className="text-[10px] text-gray-400">{safeFormatDateTime(item.log.date)}</span>
                        <span className="text-[10px] bg-gray-100 dark:bg-gray-900 px-1.5 py-0.5 rounded text-gray-500 uppercase tracking-widest">
                          {item.lead.name}
                        </span>
                      </div>
                      <p className="text-xs text-theme-text italic">"{item.log.note}"</p>
                      {item.log.rating && (
                        <div className="flex items-center space-x-2 text-[11px] font-bold text-gray-500 mt-1">
                          <span className="text-amber-500">★ {item.log.rating} / 5</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setRatingTargetLeadId(item.lead.id);
                        setRatingTargetLogIndex(item.index);
                        setIsRatingModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-bold shadow-sm cursor-pointer whitespace-nowrap"
                    >
                      {item.log.rating ? "Re-rate ★" : "Rate Call ★"}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      <CallAuditRatingModal
        isOpen={isRatingModalOpen}
        onClose={() => setIsRatingModalOpen(false)}
        leadId={ratingTargetLeadId}
        logIndex={ratingTargetLogIndex}
        rateCallLog={rateCallLog}
      />
    </>
  );
}
