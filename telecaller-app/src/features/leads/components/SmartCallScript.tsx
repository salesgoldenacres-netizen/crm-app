import { BookOpen, ChevronDown } from "lucide-react";
import { Project, Lead } from "@/shared/types";

interface SmartCallScriptProps {
  activeLead: Lead;
  activeProj: Project | undefined;
}

export default function SmartCallScript({ activeLead, activeProj }: SmartCallScriptProps) {
  const currentStatus = activeLead.status || "new";

  return (
    <div className="bg-theme-warning/5 border border-theme-warning/20 rounded-theme p-5 sm:p-6 shadow-elevation-sm space-y-4">
      <h4 className="type-label text-[10px] uppercase tracking-wider text-theme-warning flex items-center border-b border-theme-warning/15 pb-2.5 gap-1.5">
        <BookOpen className="w-4 h-4 text-theme-warning" aria-hidden />
        Smart Call Scripts
      </h4>

      <p className="text-xs text-theme-text font-medium leading-relaxed bg-theme-surface/80 p-3.5 rounded-theme border border-theme-border">
        {currentStatus === "new" &&
          `Hi ${activeLead.name}, I am calling from Golden Acres. I saw you recently inquired about ${activeProj?.name || "our plots"}. Are you still looking for investment properties?`}
        {currentStatus === "contacted" &&
          `Hi ${activeLead.name}, following up on our previous conversation regarding ${activeProj?.name || "Golden Acres"}. Did you have a chance to review the details I shared?`}
        {currentStatus === "interested" &&
          `Hello ${activeLead.name}, I noticed you're highly interested in ${activeProj?.name || "Golden Acres"}. When would be a good time this week for you to visit the site in person?`}
        {(currentStatus === "reserved" || currentStatus === "booked") &&
          `Hi ${activeLead.name}, congratulations again on your choice. I'm calling to assist you with the next steps regarding documentation for Plot ${activeLead.plotId || "your plot"}.`}
        {currentStatus !== "new" &&
          currentStatus !== "contacted" &&
          currentStatus !== "interested" &&
          currentStatus !== "reserved" &&
          currentStatus !== "booked" &&
          `Hi ${activeLead.name}, calling to check if your requirements have changed regarding ${activeProj?.name || "Golden Acres"}.`}
      </p>

      <div className="space-y-2 pt-3 border-t border-theme-border">
        <span className="type-label text-[10px] text-theme-muted uppercase tracking-wider block mb-1">
          Objection handling
        </span>

        <details className="bg-theme-card border border-theme-border rounded-theme group cursor-pointer text-xs transition-colors">
          <summary className="font-semibold text-theme-text p-2.5 outline-none list-none flex justify-between items-center gap-2 group-open:border-b group-open:border-theme-border">
            &ldquo;The price is too high&rdquo;
            <ChevronDown
              className="w-3.5 h-3.5 text-theme-muted shrink-0 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="p-3 text-[11px] text-theme-muted leading-relaxed">
            &ldquo;I understand budget is important. Keep in mind our base price includes premium infrastructure amenities that competitors charge extra for. Plus, our plots in this zone appreciate 15% YoY.&rdquo;
          </div>
        </details>

        <details className="bg-theme-card border border-theme-border rounded-theme group cursor-pointer text-xs transition-colors">
          <summary className="font-semibold text-theme-text p-2.5 outline-none list-none flex justify-between items-center gap-2 group-open:border-b group-open:border-theme-border">
            &ldquo;I need to ask my family&rdquo;
            <ChevronDown
              className="w-3.5 h-3.5 text-theme-muted shrink-0 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="p-3 text-[11px] text-theme-muted leading-relaxed">
            &ldquo;Absolutely, land investment is a family decision. Why don&apos;t we schedule a guided site visit this weekend with your family so you can check the groundwater levels and amenities together?&rdquo;
          </div>
        </details>
      </div>
    </div>
  );
}
