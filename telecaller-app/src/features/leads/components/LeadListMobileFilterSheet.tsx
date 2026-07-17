import { useId } from "react";
import { Search, RotateCcw } from "lucide-react";
import {
  LEAD_FILTER_FIELDS,
  LeadListFilters,
} from "@/features/leads/config/leadListFilterConfig";
import LeadFilterFieldControl from "./LeadFilterFieldControl";
import { User, Project } from "@/shared/types";
import Modal from "@/shared/components/ui/Modal";
import Button from "@/shared/components/ui/Button";
import FormActions from "@/shared/components/ui/FormActions";

interface LeadListMobileFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  draftFilters: LeadListFilters;
  onChange: (patch: Partial<LeadListFilters>) => void;
  onSearch: () => void;
  onReset: () => void;
  users: User[];
  projects: Record<string, Project>;
  isManagerial: boolean;
  shouldHideEmail: boolean;
  shouldHideLeadSource: boolean;
  activeCount: number;
}

export default function LeadListMobileFilterSheet({
  isOpen,
  onClose,
  draftFilters,
  onChange,
  onSearch,
  onReset,
  users,
  projects,
  isManagerial,
  shouldHideEmail,
  shouldHideLeadSource,
  activeCount,
}: LeadListMobileFilterSheetProps) {
  const descriptionId = useId();

  const fields = LEAD_FILTER_FIELDS.filter((f) => {
    if (f.managerOnly && !isManagerial) return false;
    if (f.hideIfNoEmail && shouldHideEmail) return false;
    if (f.hideIfNoSource && shouldHideLeadSource) return false;
    return true;
  });

  return (
    <div className="md:hidden">
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Filters"
        size="lg"
        variant="sheet"
        descriptionId={descriptionId}
        footer={
          <FormActions className="w-full gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                onReset();
                onClose();
              }}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" aria-hidden />
              Reset
            </Button>
            <Button
              type="button"
              variant="primary"
              className="flex-[1.4]"
              onClick={() => {
                onSearch();
                onClose();
              }}
            >
              <Search className="w-3.5 h-3.5 mr-1.5" aria-hidden />
              Search
            </Button>
          </FormActions>
        }
      >
        <p id={descriptionId} className="type-label text-[10px] text-theme-muted font-semibold mb-3">
          {activeCount > 0 ? `${activeCount} active` : "Set criteria, then Search"}
        </p>

        <div className="grid grid-cols-2 gap-x-2 gap-y-2.5">
          {fields.map((field) => {
            const wide = field.type === "date-range" || field.type === "multi-select";
            return (
              <div key={String(field.key)} className={wide ? "col-span-2" : undefined}>
                <label className="block type-label text-[10px] font-semibold uppercase tracking-wider text-theme-muted mb-0.5">
                  {field.label}
                </label>
                <LeadFilterFieldControl
                  field={field}
                  value={draftFilters}
                  onChange={onChange}
                  users={users}
                  projects={projects}
                  dense
                  onEnterSearch={() => {
                    onSearch();
                    onClose();
                  }}
                />
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
