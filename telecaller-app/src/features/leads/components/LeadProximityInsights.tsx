import { Map } from "lucide-react";
import { Project } from "@/shared/types";

interface LeadProximityInsightsProps {
  activeProj: Project | undefined;
}

export default function LeadProximityInsights({ activeProj }: LeadProximityInsightsProps) {
  const getProximityItems = () => {
    if (activeProj && Array.isArray(activeProj.proximity) && activeProj.proximity.length > 0) {
      const categories: Record<string, string[]> = {
        schools: [],
        hospitals: [],
        transit: [],
        tech_parks: [],
      };
      activeProj.proximity.forEach((item) => {
        if (categories[item.category]) {
          categories[item.category].push(`${item.name} (${item.distance})`);
        }
      });
      return categories;
    }
    return {
      schools: ["St. Mary's (2.5 km)", "DPS (4.0 km)"],
      hospitals: ["City Care (1.2 km)", "Apollo (5.5 km)"],
      transit: ["Metro Station (1.0 km)", "Bus Stop (0.3 km)"],
      tech_parks: ["Cyber Hub (6.0 km)", "IT Corridor (8.5 km)"],
    };
  };

  const getCompetitors = () => {
    if (activeProj && Array.isArray(activeProj.competitors) && activeProj.competitors.length > 0) {
      return activeProj.competitors;
    }
    return [
      {
        name: "Silver Sands Estates",
        advantage: "RERA approved, immediate registration, 40ft internal roads (they only have 30ft).",
        pitch: "Slightly cheaper base price, but higher hidden amenities charges.",
      },
      {
        name: "Green Valley Villas",
        advantage: "Better ground water levels, clear title deeds (Green Valley has pending litigation).",
        pitch: "Closer to highway, but faces severe noise pollution.",
      },
    ];
  };

  const items = getProximityItems();
  const competitorsList = getCompetitors();

  return (
    <div className="space-y-4 text-xs animate-fadeIn">
      <h4 className="text-xs font-black text-theme-muted uppercase tracking-wider flex items-center mb-1">
        <Map className="w-4 h-4 mr-1.5 text-blue-500" />
        Local Area Proximity & Competitors
      </h4>

      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-blue-500/10 border border-blue-500/15 text-blue-800 dark:text-blue-300 p-3 rounded-xl flex flex-col hover:scale-[1.02] transition-transform duration-200">
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-wide mb-1">
            Schools
          </span>
          {items.schools.map((txt, i) => (
            <span key={i} className="font-semibold text-slate-700 dark:text-slate-200">
              {txt}
            </span>
          ))}
          {items.schools.length === 0 && (
            <span className="font-semibold text-slate-400 italic">None nearby</span>
          )}
        </div>
        <div className="bg-rose-500/10 border border-rose-500/15 text-rose-800 dark:text-rose-300 p-3 rounded-xl flex flex-col hover:scale-[1.02] transition-transform duration-200">
          <span className="text-[10px] text-theme-danger font-extrabold uppercase tracking-wide mb-1">
            Hospitals
          </span>
          {items.hospitals.map((txt, i) => (
            <span key={i} className="font-semibold text-slate-700 dark:text-slate-200">
              {txt}
            </span>
          ))}
          {items.hospitals.length === 0 && (
            <span className="font-semibold text-slate-400 italic">None nearby</span>
          )}
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/15 text-emerald-800 dark:text-emerald-300 p-3 rounded-xl flex flex-col hover:scale-[1.02] transition-transform duration-200">
          <span className="text-[10px] text-theme-success font-extrabold uppercase tracking-wide mb-1">
            Transit
          </span>
          {items.transit.map((txt, i) => (
            <span key={i} className="font-semibold text-slate-700 dark:text-slate-200">
              {txt}
            </span>
          ))}
          {items.transit.length === 0 && (
            <span className="font-semibold text-slate-400 italic">None nearby</span>
          )}
        </div>
        <div className="bg-purple-500/10 border border-purple-500/15 text-purple-800 dark:text-purple-300 p-3 rounded-xl flex flex-col hover:scale-[1.02] transition-transform duration-200">
          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-extrabold uppercase tracking-wide mb-1">
            Tech Parks
          </span>
          {items.tech_parks.map((txt, i) => (
            <span key={i} className="font-semibold text-slate-700 dark:text-slate-200">
              {txt}
            </span>
          ))}
          {items.tech_parks.length === 0 && (
            <span className="font-semibold text-slate-400 italic">None nearby</span>
          )}
        </div>
      </div>

      <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
        <span className="text-[10px] text-theme-muted font-bold uppercase tracking-wider block mb-1">
          Vs. Local Competitors
        </span>

        {competitorsList.map((item, idx) => (
          <details
            key={idx}
            className="bg-theme-surface border border-slate-200 dark:border-slate-900 rounded-xl group cursor-pointer transition-all"
          >
            <summary className="text-[11px] font-black text-theme-text p-3 outline-none list-none flex justify-between items-center group-open:border-b group-open:border-slate-200 dark:group-open:border-slate-900">
              Vs. {item.name}
              <span className="text-indigo-500 group-open:hidden transition-transform duration-200">
                ▼
              </span>
              <span className="text-indigo-500 hidden group-open:inline transition-transform duration-200">
                ▲
              </span>
            </summary>
            <div className="p-3.5 text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed">
              <p>
                ✅ <strong>Our Advantage:</strong> {item.advantage}
              </p>
              <p>
                ❌ <strong>Their Pitch:</strong> {item.pitch}
              </p>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
