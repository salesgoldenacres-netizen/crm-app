import { BookOpen } from "lucide-react";
import { Project, Lead } from "@/shared/types";

interface SmartCallScriptProps {
  activeLead: Lead;
  activeProj: Project | undefined;
}

export default function SmartCallScript({ activeLead, activeProj }: SmartCallScriptProps) {
  const currentStatus = activeLead.status || "new";

  return (
    <div className="bg-amber-500/5 dark:bg-amber-950/5 border border-amber-500/15 dark:border-amber-900/25 rounded-2xl p-6 shadow-sm space-y-4">
      <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 flex items-center border-b border-amber-500/10 pb-2.5">
        <BookOpen className="w-4 h-4 mr-1.5 text-amber-500" />
        Smart Call Scripts Engine
      </h4>

      <p className="text-xs text-amber-900 dark:text-amber-200 italic font-semibold leading-relaxed bg-amber-500/10 dark:bg-amber-950/10 p-3.5 rounded-xl border border-amber-500/20 dark:border-amber-800/25">
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

      <div className="space-y-2 pt-3 border-t border-amber-500/10">
        <span className="text-[10px] text-amber-800 dark:text-amber-400 font-bold uppercase tracking-wider block mb-1">
          Objection Handling CheatSheet
        </span>

        <details className="bg-white/70 dark:bg-slate-900/60 border border-theme-border rounded-xl group cursor-pointer text-xs transition-all">
          <summary className="font-bold text-slate-700 dark:text-slate-350 p-2.5 outline-none list-none flex justify-between items-center group-open:border-b group-open:border-slate-100 dark:group-open:border-slate-800">
            "The price is too high"
            <span className="text-amber-500 group-open:hidden">▼</span>
            <span className="text-amber-500 hidden group-open:inline">▲</span>
          </summary>
          <div className="p-3 text-[11px] text-slate-600 dark:text-slate-400 italic leading-relaxed">
            "I understand budget is important. Keep in mind our base price includes premium infrastructure amenities that competitors charge extra for. Plus, our plots in this zone appreciate 15% YoY."
          </div>
        </details>

        <details className="bg-white/70 dark:bg-slate-900/60 border border-theme-border rounded-xl group cursor-pointer text-xs transition-all">
          <summary className="font-bold text-slate-700 dark:text-slate-350 p-2.5 outline-none list-none flex justify-between items-center group-open:border-b group-open:border-slate-100 dark:group-open:border-slate-800">
            "I need to ask my family"
            <span className="text-amber-500 group-open:hidden">▼</span>
            <span className="text-amber-500 hidden group-open:inline">▲</span>
          </summary>
          <div className="p-3 text-[11px] text-slate-600 dark:text-slate-400 italic leading-relaxed">
            "Absolutely, land investment is a family decision. Why don't we schedule a guided site visit this weekend with your family so you can check the groundwater levels and amenities together?"
          </div>
        </details>
      </div>
    </div>
  );
}
