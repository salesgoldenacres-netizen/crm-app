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
  qualityScore?: number;
  disposition?: string;
  priority?: string;
  followUpDate?: string;
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
  callLogs?: CallLog[];
  source?: string;
  createdAt?: string;
  updatedAt?: string;
  isArchived?: boolean;
  projectId?: string;
  assignedTo?: string;
  plotId?: string;
  followUpDate?: string;
  followUpOn?: string;  // legacy alias for followUpDate
  priority?: string;
  leadSource?: string;
  leadMedium?: string;
  createdBy?: string;
  assignedToName?: string;
  leadNumber?: string;   // auto-generated sequence number
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
