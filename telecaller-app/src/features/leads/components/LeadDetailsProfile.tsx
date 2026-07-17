import { Link } from "react-router-dom";
import { User as UserIcon, Phone, Mail, Map, Tag, Clock, Globe, UserCheck, Zap, PhoneCall } from "lucide-react";
import { safeFormatDateTime } from "@/shared/utils/dateUtils";
import { User, Lead, Project } from "@/shared/types";
import Input from "@/shared/components/ui/Input";
import Select from "@/shared/components/ui/Select";

interface LeadDetailsProfileProps {
  activeLead: Lead;
  projects: Record<string, Project>;
  user: User;
  updateLead: (id: string, data: Partial<Lead>) => Promise<void>;
  handleStartCall: (lead: Lead) => void;
  shouldHideEmail: boolean | undefined;
  shouldHideLeadSource: boolean | undefined;
  shouldHideFinancials: boolean | undefined;
}

const ROW_BORDER =
  "flex justify-between items-center py-1 border-b border-theme-border/60";

const ROW_LABEL =
  "type-label font-semibold text-theme-muted flex items-center";

const ROW_VALUE = "font-medium text-theme-text";

export default function LeadDetailsProfile({
  activeLead,
  projects,
  updateLead,
  handleStartCall,
  shouldHideEmail,
  shouldHideLeadSource,
  shouldHideFinancials,
}: LeadDetailsProfileProps) {
  const handleTagToggle = async (selectedTag: string) => {
    if (!selectedTag) return;
    const currentTags = activeLead.tags || [];
    let updatedTags: string[];
    if (currentTags.includes(selectedTag)) {
      updatedTags = currentTags.filter((t) => t !== selectedTag);
    } else {
      updatedTags = [...currentTags, selectedTag];
    }
    await updateLead(activeLead.id, { tags: updatedTags });
  };

  return (
    <div className="card-premium p-6 space-y-5">
      <h3 className="type-label font-semibold text-theme-muted uppercase tracking-wider flex items-center border-b border-theme-border pb-2.5">
        <UserIcon className="w-4 h-4 mr-1.5 text-theme-accent" aria-hidden="true" />
        Client Profile Details
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
        <div className={ROW_BORDER}>
          <span className={ROW_LABEL}>
            <Phone className="w-3.5 h-3.5 mr-2" aria-hidden="true" /> Phone
          </span>
          <button
            type="button"
            onClick={() => handleStartCall(activeLead)}
            className="font-semibold text-theme-accent hover:underline flex items-center space-x-1.5 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring rounded-theme"
          >
            <span>{activeLead.phone}</span>
            <PhoneCall className="w-3.5 h-3.5 text-theme-success" aria-hidden="true" />
          </button>
        </div>

        <div className={ROW_BORDER}>
          <span className={ROW_LABEL}>
            <Mail className="w-3.5 h-3.5 mr-2" aria-hidden="true" /> Email
          </span>
          <span className={ROW_VALUE}>
            {shouldHideEmail ? (
              <span className="text-theme-muted italic font-medium">[HIDDEN]</span>
            ) : (
              activeLead.email || "—"
            )}
          </span>
        </div>

        <div className={ROW_BORDER}>
          <span className={ROW_LABEL}>
            <Map className="w-3.5 h-3.5 mr-2" aria-hidden="true" /> Project
          </span>
          <span className={ROW_VALUE}>
            {(activeLead.projectId && projects[activeLead.projectId]?.name) || "Not specified"}
          </span>
        </div>

        <div className={ROW_BORDER}>
          <span className={ROW_LABEL}>
            <Tag className="w-3.5 h-3.5 mr-2" aria-hidden="true" /> Interested Plot
          </span>
          <div className="flex items-center space-x-2">
            <span className="font-medium text-theme-accent">
              {activeLead.plotId ? `Plot ${activeLead.plotId}` : "—"}
            </span>
            {activeLead.plotId && activeLead.projectId && (
              <Link
                to={`/project/${activeLead.projectId}`}
                className="text-[10px] font-semibold bg-theme-accent-muted text-theme-accent px-2 py-0.5 rounded-theme border border-theme-accent/25 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
              >
                Locate Map
              </Link>
            )}
          </div>
        </div>

        <div className={ROW_BORDER}>
          <span className={ROW_LABEL}>
            <Clock className="w-3.5 h-3.5 mr-2" aria-hidden="true" /> Created Time
          </span>
          <span className={ROW_VALUE}>
            {safeFormatDateTime(activeLead.createdTime || activeLead.createdAt)}
          </span>
        </div>

        <div className={ROW_BORDER}>
          <span className={ROW_LABEL}>
            <Globe className="w-3.5 h-3.5 mr-2" aria-hidden="true" /> Lead Source
          </span>
          <span className={ROW_VALUE}>
            {shouldHideLeadSource ? (
              <span className="text-theme-muted italic font-medium">[HIDDEN]</span>
            ) : (
              activeLead.leadSource || "—"
            )}
          </span>
        </div>

        <div className={ROW_BORDER}>
          <span className={ROW_LABEL}>
            <UserCheck className="w-3.5 h-3.5 mr-2" aria-hidden="true" /> Assigned Agent
          </span>
          <span className={ROW_VALUE}>
            {activeLead.assignedToName || "Unassigned"}
          </span>
        </div>

        <div className={ROW_BORDER}>
          <span className={ROW_LABEL}>
            <Zap className="w-3.5 h-3.5 mr-2" aria-hidden="true" /> Medium
          </span>
          <span className={ROW_VALUE}>
            {activeLead.leadMedium || "—"}
          </span>
        </div>
      </div>

      {/* Custom Lead Tags selector */}
      <div className="pt-4 border-t border-theme-border">
        <span
          id="lead-tags-heading"
          className="type-label font-semibold text-theme-muted uppercase tracking-wider flex items-center mb-2.5"
        >
          <Tag className="w-3.5 h-3.5 mr-2" aria-hidden="true" /> Lead Tags
        </span>
        <div className="flex flex-wrap gap-1.5 mb-3" aria-labelledby="lead-tags-heading">
          {(activeLead.tags || []).map((t) => {
            const color =
              t === "High Budget"
                ? "bg-theme-danger/10 text-theme-danger border-theme-danger/25"
                : t === "NRI"
                  ? "bg-theme-accent-muted text-theme-accent border-theme-accent/25"
                  : t === "Ready to Visit"
                    ? "bg-theme-success/10 text-theme-success border-theme-success/25"
                    : t === "Negotiating"
                      ? "bg-theme-warning/10 text-theme-warning border-theme-warning/25"
                      : "bg-theme-surface text-theme-text border-theme-border";
            return (
              <span
                key={t}
                className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-theme border ${color}`}
              >
                {t}
              </span>
            );
          })}
          {(activeLead.tags || []).length === 0 && (
            <span className="text-theme-muted text-xs italic">No tags selected</span>
          )}
        </div>
        <Select
          label="Toggle tags"
          value=""
          onChange={(e) => handleTagToggle(e.target.value)}
          helperText="Select a tag to add or remove it"
        >
          <option value="">Toggle Tags...</option>
          <option value="High Budget">High Budget</option>
          <option value="NRI">NRI</option>
          <option value="Ready to Visit">Ready to Visit</option>
          <option value="Negotiating">Negotiating</option>
          <option value="Switched Off">Switched Off</option>
        </Select>
      </div>

      {/* Referral Tracking Partner info */}
      <div className="pt-4 border-t border-theme-border">
        <span className="type-label font-semibold text-theme-muted uppercase tracking-wider flex items-center mb-2.5">
          <UserCheck className="w-3.5 h-3.5 mr-2" aria-hidden="true" /> Referral tracking
        </span>
        <div className={`grid ${shouldHideFinancials ? "grid-cols-1" : "grid-cols-2"} gap-3 text-xs`}>
          <Input
            label="Referrer Name"
            type="text"
            value={activeLead.referrer || ""}
            onChange={async (e) => {
              await updateLead(activeLead.id, { referrer: e.target.value });
            }}
            placeholder="e.g. Agency Partner"
            helperText="Saves on change"
          />
          {!shouldHideFinancials && (
            <Input
              label="Comm. Payout %/Amt"
              type="text"
              value={activeLead.referrerCommission || ""}
              onChange={async (e) => {
                await updateLead(activeLead.id, { referrerCommission: e.target.value });
              }}
              placeholder="e.g. 2% or 50,000"
              helperText="Saves on change"
            />
          )}
        </div>
      </div>
    </div>
  );
}
