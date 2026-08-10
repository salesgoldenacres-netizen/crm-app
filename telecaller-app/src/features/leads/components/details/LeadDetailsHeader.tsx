import { ArrowLeft, PhoneForwarded, Sparkles, BookOpen } from "lucide-react";
import Button from "@/shared/components/ui/Button";
import Badge from "@/shared/components/ui/Badge";
import { Lead } from "@/shared/types";
import { getLeadStatusBadgeVariant } from "@/shared/utils/leadColors";

interface LeadDetailsHeaderProps {
  activeLead: Lead;
  isDialerActive: boolean;
  onPauseDialer: () => void;
  onOpenCopilot: () => void;
  onOpenTemplates: () => void;
  onBack: () => void;
}

export default function LeadDetailsHeader({
  activeLead,
  isDialerActive,
  onPauseDialer,
  onOpenCopilot,
  onOpenTemplates,
  onBack,
}: LeadDetailsHeaderProps) {
  return (
    <header className="sticky top-0 bg-theme-card/90 backdrop-blur-md border-b border-theme-border header-brand-strip px-3 sm:px-4 min-h-14 h-14 flex items-center justify-between gap-2 z-30 shadow-elevation-sm transition-colors duration-300">
      <div className="flex items-center gap-2.5 min-w-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onBack}
          className="gap-1.5 shrink-0 focus-visible:ring-2 focus-visible:ring-theme-ring"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
          <span className="hidden sm:inline">Back</span>
        </Button>

        <div className="min-w-0">
          <h1 className="type-card-title tracking-tight flex items-center flex-wrap gap-y-1 gap-x-2 min-w-0 text-theme-text">
            <span className="truncate">{activeLead.name}</span>
            <Badge
              variant={getLeadStatusBadgeVariant(activeLead.status)}
              className="normal-case tracking-wide shrink-0"
            >
              {activeLead.status || "new"}
            </Badge>
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {isDialerActive && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPauseDialer}
            className="gap-1.5 border-theme-warning/40 text-theme-warning bg-theme-warning/10 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-theme-ring"
            title="Pause Dialer"
          >
            <PhoneForwarded className="w-3.5 h-3.5" aria-hidden />
            <span className="hidden sm:inline">Pause</span>
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenCopilot}
          className="gap-1.5 border-theme-border text-theme-accent bg-theme-accent-muted hover:opacity-90 focus-visible:ring-2 focus-visible:ring-theme-ring"
          title="Sales Copilot"
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden />
          <span className="hidden sm:inline">Copilot</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenTemplates}
          className="gap-1.5 border-theme-warning/30 text-theme-warning bg-theme-warning/10 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-theme-ring"
          title="Outreach Templates"
        >
          <BookOpen className="w-3.5 h-3.5" aria-hidden />
          <span className="hidden sm:inline">Templates</span>
        </Button>
      </div>
    </header>
  );
}
