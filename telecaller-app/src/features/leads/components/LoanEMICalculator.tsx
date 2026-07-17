import { useState, useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { BANK_LOAN_RATES } from "@/features/leads/constants/leadTemplates";
import { Project, Lead } from "@/shared/types";
import Input from "@/shared/components/ui/Input";
import Select from "@/shared/components/ui/Select";
import Button from "@/shared/components/ui/Button";
import Dialog from "@/shared/components/ui/Dialog";

interface LoanEMICalculatorProps {
  activeLead: Lead;
  activeProj: Project | undefined;
  updateLead: (id: string, data: Partial<Lead>) => Promise<void>;
}

interface EmiState {
  downPaymentPct: number;
  tenureYears: number;
  interestRate: number;
  bankScheme: string;
  stateTaxScheme: string;
  customTaxPct: number;
  loanType: "plot" | "home";
  processingFeePct: number;
}

export default function LoanEMICalculator({
  activeLead,
  activeProj,
  updateLead,
}: LoanEMICalculatorProps) {
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [feedback, setFeedback] = useState<{
    title: string;
    description: string;
  } | null>(null);
  const [emiCalculator, setEmiCalculator] = useState<EmiState>({
    downPaymentPct: 20,
    tenureYears: 15,
    interestRate: 8.25,
    bankScheme: "hdfc",
    stateTaxScheme: "tamilnadu",
    customTaxPct: 7,
    loanType: "plot",
    processingFeePct: 0.5,
  });

  // Sync state when activeLead.loanQuote is updated
  const [prevLeadId, setPrevLeadId] = useState(activeLead.id);
  const [prevLoanQuote, setPrevLoanQuote] = useState(activeLead.loanQuote);
  if (activeLead.id !== prevLeadId || activeLead.loanQuote !== prevLoanQuote) {
    setPrevLeadId(activeLead.id);
    setPrevLoanQuote(activeLead.loanQuote);
    if (activeLead.loanQuote) {
      setEmiCalculator({
        downPaymentPct: activeLead.loanQuote.downPaymentPct ?? 20,
        tenureYears: activeLead.loanQuote.tenureYears ?? 15,
        interestRate: activeLead.loanQuote.interestRate ?? 8.25,
        bankScheme: activeLead.loanQuote.bankScheme ?? "hdfc",
        stateTaxScheme: activeLead.loanQuote.stateTaxScheme ?? "tamilnadu",
        customTaxPct: activeLead.loanQuote.customTaxPct ?? 7,
        loanType: (activeLead.loanQuote.loanType || "plot") as "plot" | "home",
        processingFeePct: activeLead.loanQuote.processingFeePct ?? 0.5,
      });
    }
  }

  const handleSaveLoanQuote = async () => {
    setIsSavingQuote(true);
    try {
      await updateLead(activeLead.id, {
        loanQuote: emiCalculator,
      });
      setFeedback({
        title: "Quote saved",
        description:
          "Loan quote configuration saved successfully to lead record!",
      });
    } catch (err) {
      console.error(err);
      setFeedback({
        title: "Save failed",
        description: "Failed to save loan quote.",
      });
    } finally {
      setIsSavingQuote(false);
    }
  };

  const formatIndianCurrency = (num: number) => {
    if (num === null || num === undefined || isNaN(num)) return "₹0";
    const formattedStr = Math.round(num).toLocaleString("en-IN");
    if (num >= 10000000) {
      const crValue = (num / 10000000).toFixed(2);
      return `₹${formattedStr} (${crValue} Cr)`;
    }
    if (num >= 100000) {
      const lakhValue = (num / 100000).toFixed(2);
      return `₹${formattedStr} (${lakhValue} Lakhs)`;
    }
    return `₹${formattedStr}`;
  };

  // Calculations
  const calculatedValues = useMemo(() => {
    const activePlotObj = activeProj?.plots?.find(
      (p) => p.number === activeLead?.plotId || p.id === activeLead?.plotId
    );
    const sizeStr = activePlotObj?.size || "1000";
    const size = parseInt(sizeStr.replace(/,/g, "")) || 1000;
    const rateStr = activePlotObj?.rate || "3500";
    const rate = parseInt(rateStr.replace(/,/g, "")) || 3500;
    const cost = size * rate;

    const taxRate = emiCalculator.customTaxPct || 7;
    const tax = Math.round(cost * (taxRate / 100));

    const downPayment = Math.round(cost * (emiCalculator.downPaymentPct / 100));
    const processingFee = Math.round(
      (cost - downPayment) * ((emiCalculator.processingFeePct || 0.5) / 100)
    );
    const loanAmt = cost + tax - downPayment;
    const r = emiCalculator.interestRate / 12 / 100;
    const n = emiCalculator.tenureYears * 12;

    const emi =
      loanAmt > 0
        ? Math.round((loanAmt * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1))
        : 0;

    const totalPayout = emi * n;
    const totalInterest = Math.max(0, totalPayout - loanAmt);

    const totalPrincipalPct =
      totalPayout > 0 ? Math.round((loanAmt / totalPayout) * 100) : 100;
    const totalInterestPct = totalPayout > 0 ? 100 - totalPrincipalPct : 0;

    const comparativeLenders = Object.entries(
      BANK_LOAN_RATES[emiCalculator.loanType] as unknown as Record<string, number>
    )
      .map(([key, rateVal]) => {
        const rVal = rateVal / 12 / 100;
        const emiVal =
          loanAmt > 0
            ? Math.round(
                (loanAmt * rVal * Math.pow(1 + rVal, n)) / (Math.pow(1 + rVal, n) - 1)
              )
            : 0;
        const totalInterestVal = Math.max(0, emiVal * n - loanAmt);
        return {
          key,
          name:
            key === "hdfc"
              ? "HDFC Bank"
              : key === "sbi"
                ? "SBI"
                : key === "icici"
                  ? "ICICI Bank"
                  : key === "axis"
                    ? "Axis Bank"
                    : key === "lic"
                      ? "LIC HFL"
                      : "Bank of Baroda",
          rate: rateVal,
          emi: emiVal,
          totalInterest: totalInterestVal,
        };
      })
      .sort((a, b) => a.emi - b.emi);

    return {
      cost,
      tax,
      taxRate,
      downPayment,
      processingFee,
      loanAmt,
      n,
      emi,
      totalInterest,
      totalPrincipalPct,
      totalInterestPct,
      comparativeLenders,
    };
  }, [activeLead, activeProj, emiCalculator]);

  const {
    cost,
    tax,
    taxRate,
    downPayment,
    processingFee,
    loanAmt,
    n,
    emi,
    totalInterest,
    totalPrincipalPct,
    totalInterestPct,
    comparativeLenders,
  } = calculatedValues;

  const bankRates = BANK_LOAN_RATES[emiCalculator.loanType] as unknown as Record<string, number>;

  const interestDisabled = emiCalculator.bankScheme !== "custom";

  return (
    <div className="space-y-5 text-xs animate-fadeIn">
      <div className="flex justify-between items-center gap-3">
        <h4 className="type-label font-semibold text-theme-muted uppercase tracking-wider flex items-center">
          <BarChart3 className="w-4 h-4 mr-1.5 text-theme-accent" aria-hidden="true" />
          Loan Calculations & Quotes
        </h4>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSaveLoanQuote}
          disabled={isSavingQuote}
          aria-busy={isSavingQuote}
        >
          {isSavingQuote ? "Saving…" : "Save Quote"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Loan Category"
          value={emiCalculator.loanType}
          onChange={(e) => {
            const newType = e.target.value as "plot" | "home";
            const newRate =
              emiCalculator.bankScheme === "custom"
                ? emiCalculator.interestRate
                : (BANK_LOAN_RATES[newType] as unknown as Record<string, number>)[emiCalculator.bankScheme];
            setEmiCalculator({
              ...emiCalculator,
              loanType: newType,
              interestRate: newRate,
            });
          }}
          options={[
            { value: "plot", label: "Plot / Land Loan (Standard)" },
            { value: "home", label: "Home Construction Loan" },
          ]}
        />
        <Select
          label="Lender Loan Scheme"
          value={emiCalculator.bankScheme}
          onChange={(e) => {
            const scheme = e.target.value;
            const newRate =
              scheme === "custom"
                ? emiCalculator.interestRate
                : bankRates[scheme];
            setEmiCalculator({
              ...emiCalculator,
              bankScheme: scheme,
              interestRate: newRate,
            });
          }}
          options={[
            { value: "hdfc", label: `HDFC Bank (${bankRates.hdfc}% p.a.)` },
            { value: "sbi", label: `State Bank of India (${bankRates.sbi}% p.a.)` },
            { value: "icici", label: `ICICI Bank (${bankRates.icici}% p.a.)` },
            { value: "axis", label: `Axis Bank (${bankRates.axis}% p.a.)` },
            { value: "lic", label: `LIC HFL (${bankRates.lic}% p.a.)` },
            { value: "baroda", label: `Bank of Baroda (${bankRates.baroda}% p.a.)` },
            { value: "custom", label: "Custom Interest Rate" },
          ]}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Select
          label="State Stamp Duty Rate"
          value={emiCalculator.stateTaxScheme}
          onChange={(e) => {
            const scheme = e.target.value;
            const rates: Record<string, number> = {
              tamilnadu: 9,
              karnataka: 6.6,
              maharashtra: 6,
              delhi: 6,
              up: 7,
              haryana: 6,
              custom: emiCalculator.customTaxPct,
            };
            setEmiCalculator({
              ...emiCalculator,
              stateTaxScheme: scheme,
              customTaxPct: scheme === "custom" ? emiCalculator.customTaxPct : rates[scheme],
            });
          }}
          options={[
            { value: "tamilnadu", label: "Tamil Nadu (9%)" },
            { value: "karnataka", label: "Karnataka (6.6%)" },
            { value: "maharashtra", label: "Maharashtra (6%)" },
            { value: "delhi", label: "Delhi (6%)" },
            { value: "up", label: "Uttar Pradesh (7%)" },
            { value: "haryana", label: "Haryana (6%)" },
            { value: "custom", label: "Custom Stamp" },
          ]}
        />
        <Input
          label="Processing Fee (%)"
          type="number"
          min={0}
          max={5}
          step={0.05}
          value={emiCalculator.processingFeePct}
          onChange={(e) =>
            setEmiCalculator({
              ...emiCalculator,
              processingFeePct: parseFloat(e.target.value) || 0,
            })
          }
        />
        <Input
          label="Interest Rate (%)"
          type="number"
          min={5}
          max={25}
          step={0.05}
          disabled={interestDisabled}
          value={emiCalculator.interestRate}
          onChange={(e) =>
            setEmiCalculator({
              ...emiCalculator,
              interestRate: parseFloat(e.target.value) || 8.5,
            })
          }
          helperText={
            interestDisabled
              ? "Select Custom Interest Rate to edit"
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {emiCalculator.stateTaxScheme === "custom" && (
          <Input
            label="Custom Tax Rate (%)"
            type="number"
            min={0}
            max={30}
            step={0.1}
            value={emiCalculator.customTaxPct}
            onChange={(e) =>
              setEmiCalculator({
                ...emiCalculator,
                customTaxPct: parseFloat(e.target.value) || 0,
              })
            }
          />
        )}
      </div>

      <div className="space-y-4">
        {/* Price breakdown table */}
        <div className="grid grid-cols-2 gap-4 bg-theme-surface p-4 rounded-theme border border-theme-border">
          <div className="space-y-0.5">
            <span className="type-label text-theme-muted block">
              Plot Base Cost
            </span>
            <span className="font-semibold text-base text-theme-text">
              {formatIndianCurrency(cost)}
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="type-label text-theme-muted block">
              Total Cost (+{taxRate}% Reg.)
            </span>
            <span className="font-semibold text-base text-theme-text">
              {formatIndianCurrency(cost + tax)}
            </span>
          </div>
          <div className="pt-2 border-t border-theme-border">
            <span className="type-label text-theme-muted block">
              Stamp/Reg Duty ({taxRate}%)
            </span>
            <span className="font-semibold text-theme-text">
              {formatIndianCurrency(tax)}
            </span>
          </div>
          <div className="pt-2 border-t border-theme-border">
            <span className="type-label text-theme-muted block">
              Loan Principal (LTV)
            </span>
            <span className="font-semibold text-theme-accent">
              {formatIndianCurrency(loanAmt)}
            </span>
          </div>
          <div className="pt-2 border-t border-theme-border col-span-2 flex justify-between">
            <div>
              <span className="type-label text-theme-muted block">
                Processing Fee ({emiCalculator.processingFeePct || 0.5}%)
              </span>
              <span className="font-semibold text-theme-text">
                {formatIndianCurrency(processingFee)}
              </span>
            </div>
          </div>
        </div>

        {/* Controls: Down Payment / Tenure */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between type-label font-semibold text-theme-muted mb-1.5">
              <label htmlFor="emi-down-payment">
                Down Payment ({emiCalculator.downPaymentPct}%)
              </label>
              <span className="text-theme-text font-semibold tabular-nums">
                {formatIndianCurrency(downPayment)}
              </span>
            </div>
            <input
              id="emi-down-payment"
              type="range"
              min="10"
              max="80"
              step="5"
              value={emiCalculator.downPaymentPct}
              onChange={(e) =>
                setEmiCalculator({
                  ...emiCalculator,
                  downPaymentPct: parseInt(e.target.value),
                })
              }
              className="w-full h-1.5 bg-theme-surface rounded-theme appearance-none cursor-pointer accent-[var(--primary-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
              aria-valuemin={10}
              aria-valuemax={80}
              aria-valuenow={emiCalculator.downPaymentPct}
              aria-valuetext={`${emiCalculator.downPaymentPct} percent`}
            />
          </div>

          <div>
            <div className="flex justify-between type-label font-semibold text-theme-muted mb-1.5">
              <label htmlFor="emi-tenure">
                Tenure ({emiCalculator.tenureYears} Years)
              </label>
              <span className="text-theme-text font-semibold tabular-nums">
                Months: {n}
              </span>
            </div>
            <input
              id="emi-tenure"
              type="range"
              min="5"
              max="30"
              step="1"
              value={emiCalculator.tenureYears}
              onChange={(e) =>
                setEmiCalculator({
                  ...emiCalculator,
                  tenureYears: parseInt(e.target.value),
                })
              }
              className="w-full h-1.5 bg-theme-surface rounded-theme appearance-none cursor-pointer accent-[var(--primary-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
              aria-valuemin={5}
              aria-valuemax={30}
              aria-valuenow={emiCalculator.tenureYears}
              aria-valuetext={`${emiCalculator.tenureYears} years`}
            />
          </div>
        </div>

        {/* Display & Ratio Bar */}
        <div
          className="bg-theme-accent-muted border border-theme-accent/30 p-4 rounded-theme text-center relative overflow-hidden"
          role="status"
          aria-live="polite"
        >
          <div className="type-label text-theme-accent font-semibold uppercase tracking-wider">
            Estimated Monthly EMI
          </div>
          <div className="text-2xl font-semibold text-theme-accent mt-1.5 tabular-nums">
            ₹{emi.toLocaleString("en-IN")}{" "}
            <span className="text-xs font-semibold text-theme-muted">/ month</span>
          </div>
        </div>

        {/* Ratio Bar */}
        {loanAmt > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between type-label text-theme-muted uppercase tracking-wider">
              <span>Principal: {totalPrincipalPct}%</span>
              <span>Interest: {totalInterestPct}%</span>
            </div>
            <div
              className="w-full h-2 rounded-theme overflow-hidden flex bg-theme-surface"
              role="img"
              aria-label={`Principal ${totalPrincipalPct} percent, interest ${totalInterestPct} percent`}
            >
              <div
                className="h-full bg-brand-gradient transition-all duration-300"
                style={{ width: `${totalPrincipalPct}%` }}
                aria-hidden="true"
              />
              <div
                className="h-full bg-theme-warning transition-all duration-300"
                style={{ width: `${totalInterestPct}%` }}
                aria-hidden="true"
              />
            </div>
            <div className="flex justify-between text-[10px] text-theme-muted tabular-nums">
              <span>Total Loan: {formatIndianCurrency(loanAmt)}</span>
              <span>Total Interest: {formatIndianCurrency(totalInterest)}</span>
            </div>
          </div>
        )}

        {/* Comparative Table */}
        <div className="space-y-2 pt-2 border-t border-theme-border">
          <h5 className="type-label font-semibold text-theme-muted uppercase tracking-wider flex items-center">
            Lender Comparison Matrix (Sort by Low EMI)
          </h5>
          <div className="overflow-x-auto rounded-theme border border-theme-border">
            <table className="min-w-full divide-y divide-theme-border text-[10px]">
              <caption className="sr-only">
                Lender comparison sorted by lowest monthly EMI
              </caption>
              <thead className="bg-theme-surface font-semibold uppercase text-theme-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left">Bank</th>
                  <th scope="col" className="px-3 py-2 text-center">Interest</th>
                  <th scope="col" className="px-3 py-2 text-center">EMI / mo</th>
                  <th scope="col" className="px-3 py-2 text-center">Total Interest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {comparativeLenders.map((bank, index) => {
                  const isLowest = index === 0;
                  const rowBg = isLowest
                    ? "bg-theme-success/5 text-theme-success font-semibold"
                    : "text-theme-muted";
                  return (
                    <tr key={bank.key} className={`${rowBg} hover:bg-theme-surface`}>
                      <td className="px-3 py-2 text-left">
                        <span className="inline-flex items-center gap-1">
                          {bank.name}
                          {isLowest && (
                            <span className="text-[9px] bg-theme-success/10 text-theme-success px-1 rounded-theme">
                              Best
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center font-semibold tabular-nums">
                        {bank.rate}%
                      </td>
                      <td className="px-3 py-2 text-center font-semibold tabular-nums">
                        ₹{bank.emi.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums">
                        {formatIndianCurrency(bank.totalInterest)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog
        isOpen={!!feedback}
        onClose={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        description={feedback?.description}
        cancelLabel="OK"
      />
    </div>
  );
}
