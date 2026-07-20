import { useState } from "react";
import { Award, Star } from "lucide-react";
import { User, Lead } from "@/shared/types";
import CallAuditRatingModal from "./CallAuditRatingModal";
import AggregateUnavailable from "./AggregateUnavailable";
import { Card, CardBody, CardHeader } from "@/shared/components/ui/Card";
import Badge from "@/shared/components/ui/Badge";
import Button from "@/shared/components/ui/Button";

interface CallQualityTabProps {
  users: User[];
  leads: Lead[];
  isManagerial: (role: string) => boolean;
  rateCallLog: (
    leadId: string,
    logIndex: number,
    score: number,
    feedback: string
  ) => Promise<void>;
  safeFormatDateTime: (dateStr?: string, showTime?: boolean) => string;
  aggregatesUnavailable?: boolean;
}

export default function CallQualityTab({
  users,
  leads,
  isManagerial,
  rateCallLog,
  safeFormatDateTime,
  aggregatesUnavailable = false,
}: CallQualityTabProps) {
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [ratingTargetLeadId, setRatingTargetLeadId] = useState("");
  const [ratingTargetLogIndex, setRatingTargetLogIndex] = useState(-1);

  if (aggregatesUnavailable) {
    return (
      <AggregateUnavailable
        title="Call quality lead scan unavailable"
        detail="Quality averages require callLogs queries / Reports — not a global leads array."
      />
    );
  }

  return (
    <>
      <div className="space-y-6 animate-fadeIn text-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <h3 className="type-label text-theme-muted uppercase tracking-wider flex items-center">
                  <Award
                    className="w-4 h-4 mr-1.5 text-theme-warning"
                    aria-hidden="true"
                  />
                  Agent Averages
                </h3>
              </CardHeader>
              <CardBody className="space-y-3.5 pt-4">
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
                    const average =
                      ratedCount > 0
                        ? (totalScores / ratedCount).toFixed(1)
                        : "—";

                    return (
                      <div
                        key={tc.id}
                        className="flex justify-between items-center bg-theme-surface p-2.5 rounded-theme border border-theme-border"
                      >
                        <span className="font-semibold text-theme-text text-xs">
                          {tc.username}{" "}
                          <span className="text-[10px] text-theme-muted font-normal">
                            ({tc.role})
                          </span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Star
                            className="w-3.5 h-3.5 text-theme-warning fill-theme-warning"
                            aria-hidden="true"
                          />
                          <span className="font-bold text-theme-text tabular-nums">
                            {average}
                          </span>
                          <span className="text-[10px] text-theme-muted">
                            ({ratedCount} calls)
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </CardBody>
            </Card>
          </div>

          <Card className="md:col-span-2">
            <CardHeader>
              <h3 className="type-label text-theme-muted uppercase tracking-wider">
                Evaluate Call Logs
              </h3>
            </CardHeader>
            <CardBody className="pt-2">
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
                  .sort(
                    (a, b) =>
                      new Date(b.log.date).getTime() -
                      new Date(a.log.date).getTime()
                  )
                  .map((item) => (
                    <div
                      key={`${item.lead.id}-${item.index}`}
                      className="py-4 first:pt-0 flex justify-between items-start gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-theme-accent">
                            {item.log.agent}
                          </span>
                          <span className="text-[10px] text-theme-muted">
                            {safeFormatDateTime(item.log.date)}
                          </span>
                          <Badge variant="default">{item.lead.name}</Badge>
                        </div>
                        <p className="text-xs text-theme-text italic">
                          &ldquo;{item.log.note}&rdquo;
                        </p>
                        {item.log.rating && (
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-theme-muted mt-1">
                            <Star
                              className="w-3 h-3 text-theme-warning fill-theme-warning"
                              aria-hidden="true"
                            />
                            <span className="text-theme-warning tabular-nums">
                              {item.log.rating} / 5
                            </span>
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setRatingTargetLeadId(item.lead.id);
                          setRatingTargetLogIndex(item.index);
                          setIsRatingModalOpen(true);
                        }}
                        className="whitespace-nowrap shrink-0"
                      >
                        {item.log.rating ? "Re-rate" : "Rate Call"}
                      </Button>
                    </div>
                  ))}
              </div>
            </CardBody>
          </Card>
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
