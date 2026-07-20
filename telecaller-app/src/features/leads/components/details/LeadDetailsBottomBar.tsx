import { PhoneForwarded, Sparkles, BookOpen } from "lucide-react";
import BottomActionBar from "@/shared/components/ui/BottomActionBar";
import { Lead } from "@/shared/types";

interface LeadDetailsBottomBarProps {
  activeLead: Lead;
  onStartCall: (lead: Lead) => void;
  onOpenWhatsApp: () => void;
  onOpenCopilot: () => void;
  onOpenTemplates: () => void;
}

export default function LeadDetailsBottomBar({
  activeLead,
  onStartCall,
  onOpenWhatsApp,
  onOpenCopilot,
  onOpenTemplates,
}: LeadDetailsBottomBarProps) {
  return (
    <BottomActionBar>
      <button
        type="button"
        onClick={() => onStartCall(activeLead)}
        className="flex-1 flex flex-col items-center justify-center min-h-11 py-1 text-theme-text text-[10px] font-semibold gap-1 cursor-pointer border-0 bg-transparent rounded-theme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
      >
        <PhoneForwarded className="w-5 h-5 text-theme-success" aria-hidden="true" />
        <span>Call</span>
      </button>

      <button
        type="button"
        onClick={onOpenWhatsApp}
        className="flex-1 flex flex-col items-center justify-center min-h-11 py-1 text-theme-text text-[10px] font-semibold gap-1 cursor-pointer border-0 bg-transparent rounded-theme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
      >
        <svg className="w-5 h-5 text-theme-success" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.59-4.846c1.6.95 3.16 1.453 4.814 1.454 5.411 0 9.814-4.402 9.817-9.818.001-2.624-1.021-5.09-2.885-6.957C16.48 1.965 14.017.943 11.997.943c-5.419 0-9.827 4.404-9.83 9.82-.001 1.782.468 3.522 1.36 5.061L2.5 21.5l5.837-1.53c.277.01.554.022.83.022z"/>
        </svg>
        <span>WhatsApp</span>
      </button>

      <button
        type="button"
        onClick={onOpenCopilot}
        className="flex-1 flex flex-col items-center justify-center min-h-11 py-1 text-theme-text text-[10px] font-semibold gap-1 cursor-pointer border-0 bg-transparent rounded-theme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
      >
        <Sparkles className="w-5 h-5 text-theme-accent" aria-hidden />
        <span>Copilot</span>
      </button>

      <button
        type="button"
        onClick={onOpenTemplates}
        className="flex-1 flex flex-col items-center justify-center min-h-11 py-1 text-theme-text text-[10px] font-semibold gap-1 cursor-pointer border-0 bg-transparent rounded-theme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
      >
        <BookOpen className="w-5 h-5 text-theme-warning" aria-hidden />
        <span>Templates</span>
      </button>
    </BottomActionBar>
  );
}
