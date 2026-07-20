export interface QuickCallTemplate {
  label: string;
  text: string;
}

export interface BankRates {
  hdfc: number;
  sbi: number;
  icici: number;
  axis: number;
  lic: number;
  baroda: number;
}

export interface BankLoanRates {
  plot: BankRates;
  home: BankRates;
}

export const QUICK_CALL_TEMPLATES: QuickCallTemplate[] = [
  { label: "Busy", text: "Customer busy, requested callback tomorrow." },
  {
    label: "Discount req.",
    text: "Customer interested. Requested a price discount for negotiation.",
  },
  {
    label: "Site Visit",
    text: "Customer agreed to schedule a site visit for this weekend.",
  },
  { label: "Not Answering", text: "Called client. Ringing, but no answer." },
];

export const BANK_LOAN_RATES: BankLoanRates = {
  plot: {
    hdfc: 8.25,
    sbi: 8.5,
    icici: 8.6,
    axis: 8.85,
    lic: 8.15,
    baroda: 8.2,
  },
  home: {
    hdfc: 7.2,
    sbi: 7.25,
    icici: 7.5,
    axis: 8.0,
    lic: 7.15,
    baroda: 7.2,
  },
};
