export interface CallLog {
  date: string;
  note: string;
  status: string;
  agent: string;
  rating?: number;
  timestamp?: string;
  duration?: number;
  callType?: string;
  picked?: boolean;
  feedback?: string;
  /** Admin QA feedback (legacy alias used by rating UI). */
  adminFeedback?: string;
  qualityScore?: number;
  disposition?: string;
  priority?: string;
  followUpDate?: string;
}

/** Top-level `callLogs/{id}` document (Phase C SoT for call history). */
export interface CallLogDocument extends CallLog {
  id: string;
  leadId: string;
  createdAt?: string;
  /** Set by backfill; productivity trigger skips these. */
  migratedFromEmbedded?: boolean;
  skipProductivity?: boolean;
  embeddedIndex?: number;
}

export interface SiteVisit {
  date?: string;
  time?: string;
  /** Canonical: scheduled | confirmed | completed | cancelled | no_show — see `@/shared/contracts/siteVisit`. */
  status?: string;
  notes?: string;
  scheduledBy?: string;
  coordinator?: string;
}

export interface LoanQuote {
  downPaymentPct?: number;
  tenureYears?: number;
  interestRate?: number;
  bankScheme?: string;
  stateTaxScheme?: string;
  customTaxPct?: number;
  loanType?: "plot" | "home";
  processingFeePct?: number;
  propertyValue?: string;
  downPayment?: string;
  processingFee?: string;
  monthlyEmi?: string;
  totalInterest?: string;
  totalPayable?: string;
}

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone: string;
  status: string;
  notes?: string;
  assignedAgent?: string;
  /**
   * @deprecated Embedded array — dual-read fallback only during Phase C migration.
   * Canonical history lives in top-level `callLogs` + denormalized summary fields.
   */
  callLogs?: CallLog[];
  /** Denormalized count of top-level callLogs for this lead. */
  callCount?: number;
  lastCallAt?: string;
  lastCallOutcome?: string;
  lastCallAgent?: string;
  lastAgentId?: string;
  lastCallNote?: string;
  /** Sticky true once any non-system agent call is logged. */
  hasAgentCall?: boolean;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
  isArchived?: boolean;
  projectId?: string;
  assignedTo?: string;
  /** SEC-1: denormalized Auth uid for future least-privilege lead reads. */
  assignedToUid?: string;
  plotId?: string;
  followUpDate?: string;
  followUpOn?: string;  // legacy alias for followUpDate
  priority?: string;
  leadSource?: string;
  leadMedium?: string;
  createdBy?: string;
  assignedToName?: string;
  leadNumber?: string;   // auto-generated sequence number
  leadReference?: string; // Crockford's Base32 time-sortable unique reference (ULID)
  createdTime?: string;  // legacy alias for createdAt
  budget?: string;
  tags?: string[];
  referrer?: string;
  referrerCommission?: string;
  siteVisit?: SiteVisit | null;
  loanQuote?: LoanQuote;
  plotRate?: string;
  discountRequest?: {
    requestedAmt?: string;
    justification?: string;
    status: "pending" | "approved" | "rejected";
  };
}
