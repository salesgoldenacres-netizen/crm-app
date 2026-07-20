/** Lead Bin column filters — draft/applied, same UX model as the main list. */

export interface LeadBinFilters {
  leadNumber: string;
  name: string;
  phone: string;
  projectId: string;
  status: string;
  archivedStart: string;
  archivedEnd: string;
  archivedBy: string;
}

export const EMPTY_LEAD_BIN_FILTERS: LeadBinFilters = {
  leadNumber: "",
  name: "",
  phone: "",
  projectId: "",
  status: "",
  archivedStart: "",
  archivedEnd: "",
  archivedBy: "",
};

export function cloneLeadBinFilters(f: LeadBinFilters): LeadBinFilters {
  return { ...f };
}

export function isLeadBinFiltersEmpty(f: LeadBinFilters): boolean {
  return Object.values(f).every((v) => !String(v || "").trim());
}

export function countActiveLeadBinFilters(f: LeadBinFilters): number {
  return Object.values(f).filter((v) => String(v || "").trim()).length;
}

export function leadBinFiltersEqual(a: LeadBinFilters, b: LeadBinFilters): boolean {
  return (Object.keys(EMPTY_LEAD_BIN_FILTERS) as (keyof LeadBinFilters)[]).every(
    (k) => String(a[k] || "") === String(b[k] || "")
  );
}

export interface LeadBinFilterable {
  leadNumber?: string;
  leadReference?: string;
  name?: string;
  phone?: string;
  email?: string;
  projectId?: string;
  plotId?: string;
  status?: string;
  archivedAt?: string;
  archivedBy?: string;
}

export function matchLeadBinFilters(
  lead: LeadBinFilterable,
  f: LeadBinFilters,
  projectName?: string
): boolean {
  if (f.leadNumber) {
    const q = f.leadNumber.toLowerCase();
    const matchNum = (lead.leadNumber || "").toLowerCase().includes(q);
    const matchRef = (lead.leadReference || "").toLowerCase().includes(q);
    if (!matchNum && !matchRef) return false;
  }
  if (f.name) {
    const q = f.name.toLowerCase();
    const name = (lead.name || "").toLowerCase();
    const phone = lead.phone || "";
    if (!name.includes(q) && !phone.includes(f.name)) return false;
  }
  if (f.phone && !(lead.phone || "").includes(f.phone)) return false;
  if (f.projectId && lead.projectId !== f.projectId) return false;
  if (f.status && (lead.status || "new") !== f.status) return false;
  if (f.archivedBy) {
    const q = f.archivedBy.toLowerCase();
    if (!(lead.archivedBy || "").toLowerCase().includes(q)) return false;
  }
  if (f.archivedStart || f.archivedEnd) {
    const ts = lead.archivedAt ? new Date(lead.archivedAt).getTime() : NaN;
    if (Number.isNaN(ts)) return false;
    if (f.archivedStart) {
      const start = new Date(f.archivedStart).setHours(0, 0, 0, 0);
      if (ts < start) return false;
    }
    if (f.archivedEnd) {
      const end = new Date(f.archivedEnd).setHours(23, 59, 59, 999);
      if (ts > end) return false;
    }
  }
  // Optional free-text project name match is handled via projectId select only
  void projectName;
  return true;
}
