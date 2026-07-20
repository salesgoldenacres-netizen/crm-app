import { Map, ChevronDown, ChevronUp } from "lucide-react";
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
      <h4 className="type-label text-theme-muted flex items-center mb-1">
        <Map className="w-4 h-4 mr-1.5 text-theme-accent" aria-hidden="true" />
        Local Area Proximity & Competitors
      </h4>

      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-sky-50/80 border border-sky-100 text-sky-800 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800 p-3 rounded-theme flex flex-col">
          <span className="type-label text-sky-700 dark:text-sky-400 mb-1">
            Schools
          </span>
          {items.schools.map((txt, i) => (
            <span key={i} className="font-semibold text-theme-text">
              {txt}
            </span>
          ))}
          {items.schools.length === 0 && (
            <span className="font-semibold text-theme-muted">None nearby</span>
          )}
        </div>
        <div className="bg-theme-danger/10 border border-theme-danger/20 text-theme-danger p-3 rounded-theme flex flex-col">
          <span className="type-label text-theme-danger mb-1">
            Hospitals
          </span>
          {items.hospitals.map((txt, i) => (
            <span key={i} className="font-semibold text-theme-text">
              {txt}
            </span>
          ))}
          {items.hospitals.length === 0 && (
            <span className="font-semibold text-theme-muted">None nearby</span>
          )}
        </div>
        <div className="bg-theme-success/10 border border-theme-success/20 text-theme-success p-3 rounded-theme flex flex-col">
          <span className="type-label text-theme-success mb-1">
            Transit
          </span>
          {items.transit.map((txt, i) => (
            <span key={i} className="font-semibold text-theme-text">
              {txt}
            </span>
          ))}
          {items.transit.length === 0 && (
            <span className="font-semibold text-theme-muted">None nearby</span>
          )}
        </div>
        <div className="bg-theme-accent-muted border border-theme-border text-theme-accent p-3 rounded-theme flex flex-col">
          <span className="type-label text-theme-accent mb-1">
            Tech Parks
          </span>
          {items.tech_parks.map((txt, i) => (
            <span key={i} className="font-semibold text-theme-text">
              {txt}
            </span>
          ))}
          {items.tech_parks.length === 0 && (
            <span className="font-semibold text-theme-muted">None nearby</span>
          )}
        </div>
      </div>

      <div className="space-y-2 pt-3 border-t border-theme-border">
        <span className="type-label text-theme-muted block mb-1">
          Vs. Local Competitors
        </span>

        {competitorsList.map((item, idx) => (
          <details
            key={idx}
            className="bg-theme-surface border border-theme-border rounded-theme group cursor-pointer transition-all"
          >
            <summary className="text-[11px] font-semibold text-theme-text p-3 outline-none list-none flex justify-between items-center group-open:border-b group-open:border-theme-border focus-visible:ring-2 focus-visible:ring-theme-ring rounded-theme">
              Vs. {item.name}
              <ChevronDown className="w-3.5 h-3.5 text-theme-accent group-open:hidden" aria-hidden="true" />
              <ChevronUp className="w-3.5 h-3.5 text-theme-accent hidden group-open:inline" aria-hidden="true" />
            </summary>
            <div className="p-3.5 text-[11px] text-theme-muted space-y-1.5 leading-relaxed">
              <p>
                <strong className="text-theme-success">Our Advantage:</strong> {item.advantage}
              </p>
              <p>
                <strong className="text-theme-danger">Their Pitch:</strong> {item.pitch}
              </p>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
