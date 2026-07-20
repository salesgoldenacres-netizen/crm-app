import { useState } from "react";
import { AlertCircle } from "lucide-react";

import { useLeadData } from "@/features/leads/hooks/useLeadData";
import { useLeadDialer } from "@/features/leads/hooks/useLeadDialer";
import { useLeadCallLog } from "@/features/leads/hooks/useLeadCallLog";

// Custom Subcomponents
import LeadDetailsProfile from "@/features/leads/components/LeadDetailsProfile";
import PlotLocator from "@/features/leads/components/PlotLocator";
import SmartCallScript from "@/features/leads/components/SmartCallScript";
import LeadInteractionHistory from "@/features/leads/components/LeadInteractionHistory";
import LeadWhatsAppPanel from "@/features/leads/components/LeadWhatsAppPanel";
import LoanEMICalculator from "@/features/leads/components/LoanEMICalculator";
import SiteVisitScheduler from "@/features/leads/components/SiteVisitScheduler";
import LeadProximityInsights from "@/features/leads/components/LeadProximityInsights";

import SimulatedDialer from "@/features/leads/components/SimulatedDialer";
import CallLoggingForm from "@/features/leads/components/CallLoggingForm";
import DiscountManager from "@/features/leads/components/DiscountManager";
import LeadPipelineTracker from "@/features/leads/components/LeadPipelineTracker";
import WhatsAppAssistant from "@/features/leads/components/WhatsAppAssistant";
import Dialog from "@/shared/components/ui/Dialog";
import Button from "@/shared/components/ui/Button";
import EmptyState from "@/shared/components/ui/EmptyState";
import LeadIntelligenceStrip from "@/features/leads/components/LeadIntelligenceStrip";
import { SalesCopilotDrawer } from "@/features/leads/copilot";

// Extracted Header and Footer presentation components
import LeadDetailsHeader from "@/features/leads/components/details/LeadDetailsHeader";
import LeadDetailsBottomBar from "@/features/leads/components/details/LeadDetailsBottomBar";

import { User } from "@/shared/types";
import { planStatusTransition } from "@/shared/contracts";

interface LeadDetailsPageProps {
  user: User;
}

export default function LeadDetailsPage({ user }: LeadDetailsPageProps) {
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [modalLeftTab, setModalLeftTab] = useState("history");
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [isWaAssistantOpen, setIsWaAssistantOpen] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState("");

  const {
    activeLead,
    leadsLoaded,
    projects,
    projectsLoaded,
    users,
    isManagerial,
    copilotContext,
    handleBackNavigation,
    addNotification,
    updateLead,
    logCall,
    openTemplates,
    todayYmd,
  } = useLeadData(user, isCopilotOpen);

  const {
    activeDialerLead,
    dialerStatus,
    dialerSeconds,
    dialerMuted,
    setDialerMuted,
    dialerSpeaker,
    setDialerSpeaker,
    isDialerActive,
    setIsDialerActive,
    handleStartCall,
    handleEndCall,
  } = useLeadDialer(activeLead, user);

  const {
    callLogForm,
    setCallLogForm,
    feedback,
    setFeedback,
    handleCallLogSubmit,
  } = useLeadCallLog(
    activeLead,
    user,
    projects,
    isDialerActive,
    setIsDialerActive,
    dialerSeconds,
    logCall,
    updateLead,
    handleBackNavigation
  );

  const triggerEndCall = () => {
    handleEndCall((_seconds, formatted) => {
      setCallLogForm((prev) => ({
        ...prev,
        note:
          (prev.note ? prev.note + "\n" : "") +
          `[Call Log - Duration: ${formatted}] `,
      }));
    });
  };

  if (!leadsLoaded || !projectsLoaded) {
    return (
      <div className="min-h-screen app-canvas flex items-center justify-center p-4">
        <div className="text-center space-y-3" role="status" aria-live="polite">
          <div className="w-12 h-12 border-2 border-theme-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="type-secondary text-sm text-theme-muted">
            Loading lead…
          </p>
        </div>
      </div>
    );
  }

  if (!activeLead) {
    return (
      <div className="min-h-screen app-canvas flex flex-col items-center justify-center p-4">
        <EmptyState
          title="Lead not found"
          description="This lead may have been removed, or you do not have permission to view it."
          icon={<AlertCircle className="w-8 h-8" aria-hidden />}
          action={
            <Button type="button" onClick={handleBackNavigation}>
              Go to Dashboard
            </Button>
          }
        />
      </div>
    );
  }

  const shouldHideEmail = user.roleRestrictions?.hideEmail;
  const shouldHideLeadSource = user.roleRestrictions?.hideLeadSource;
  const shouldHideFinancials = user.roleRestrictions?.hideFinancials;

  return (
    <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden app-canvas text-theme-text transition-colors duration-300 pb-20 md:pb-0">
      <LeadDetailsHeader
        activeLead={activeLead}
        isDialerActive={isDialerActive}
        onPauseDialer={() => {
          sessionStorage.removeItem("isPowerDialerActive");
          setIsDialerActive(false);
          setFeedback({
            mode: "alert",
            title: "Power Dialer paused",
            description:
              "Power Dialer paused. You can resume from the dashboard.",
          });
        }}
        onOpenCopilot={() => setIsCopilotOpen(true)}
        onOpenTemplates={() => openTemplates()}
        onBack={handleBackNavigation}
      />

      {/* Main CRM Workspace Grid */}
      <main className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 space-y-5 transition-all duration-300">
        <LeadPipelineTracker
          leadName={activeLead.name}
          currentStatus={activeLead.status || "new"}
          onSelectStage={async (targetStatus, label) => {
            const plan = planStatusTransition({
              from: activeLead.status,
              to: targetStatus,
              reason: "pipeline",
            });
            if (!plan.ok) {
              setFeedback({
                mode: "alert",
                title: "Status change blocked",
                description: plan.error || `Cannot move to ${label}.`,
              });
              return;
            }
            await updateLead(activeLead.id, plan.leadPatch);
          }}
          onToggleNotInterested={async () => {
            const isTerminalNotInterested =
              activeLead.status === "not-interested";
            const nextStatus = isTerminalNotInterested
              ? "new"
              : "not-interested";
            setFeedback({
              mode: "confirm",
              title: isTerminalNotInterested
                ? "Reopen lead?"
                : "Mark not interested?",
              description: `Mark lead ${activeLead.name} as ${
                isTerminalNotInterested ? "Active (New)" : "Not Interested"
              }?`,
              confirmLabel: isTerminalNotInterested
                ? "Reopen"
                : "Mark Not Interested",
              confirmVariant: isTerminalNotInterested ? "primary" : "danger",
              onConfirm: async () => {
                const plan = planStatusTransition({
                  from: activeLead.status,
                  to: nextStatus,
                  reason: isTerminalNotInterested ? "reopen" : "pipeline",
                });
                if (!plan.ok) {
                  setFeedback({
                    mode: "alert",
                    title: "Status change blocked",
                    description: plan.error || "Cannot change status.",
                  });
                  return;
                }
                await updateLead(activeLead.id, plan.leadPatch);
                setFeedback(null);
              },
            });
          }}
        />

        <LeadIntelligenceStrip
          lead={activeLead}
          allLeads={activeLead ? [activeLead] : []}
          isManagerial={isManagerial(user.role)}
          todayYmd={todayYmd}
        />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
          {/* COLUMN 1: Profile & Cheat Sheet */}
          <section className="space-y-5 min-w-0">
            <LeadDetailsProfile
              activeLead={activeLead}
              projects={projects}
              user={user}
              updateLead={updateLead}
              handleStartCall={handleStartCall}
              shouldHideEmail={shouldHideEmail}
              shouldHideLeadSource={shouldHideLeadSource}
              shouldHideFinancials={shouldHideFinancials}
            />

            <LeadWhatsAppPanel lead={activeLead} />

            <PlotLocator
              activeProj={
                activeLead.projectId && projects
                  ? projects[activeLead.projectId]
                  : undefined
              }
              activeLead={activeLead}
            />

            <SmartCallScript
              activeLead={activeLead}
              activeProj={
                activeLead.projectId && projects
                  ? projects[activeLead.projectId]
                  : undefined
              }
            />
          </section>

          {/* COLUMN 2: Tabs (History, Loans, Scheduler) */}
          <section className="space-y-5 min-w-0">
            <div className="card-premium p-5 sm:p-6 space-y-5">
              <div className="flex gap-1 p-1 bg-theme-surface rounded-theme border border-theme-border w-full overflow-x-auto scrollbar-none">
                {[
                  {
                    id: "history",
                    label: "History",
                    icon: <AlertCircle className="w-3.5 h-3.5" />,
                  },
                  {
                    id: "calculator",
                    label: "Loan & EMI",
                    icon: <AlertCircle className="w-3.5 h-3.5" />,
                  },
                  {
                    id: "site-visit",
                    label: "Site Visits",
                    icon: <AlertCircle className="w-3.5 h-3.5" />,
                  },
                  {
                    id: "insights",
                    label: "Insights",
                    icon: <AlertCircle className="w-3.5 h-3.5" />,
                  },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setModalLeftTab(t.id)}
                    className={`flex-1 min-w-[4.5rem] min-h-11 sm:min-h-0 py-2 px-1.5 text-[11px] font-semibold rounded-theme transition-colors duration-150 flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
                      modalLeftTab === t.id
                        ? "bg-theme-card text-theme-accent shadow-sm border border-theme-border"
                        : "text-theme-muted hover:text-theme-text hover:bg-theme-card/60 border border-transparent"
                    }`}
                  >
                    {t.icon}
                    <span className="hidden sm:inline">{t.label}</span>
                    <span className="sm:hidden">{t.label.split(" ")[0]}</span>
                  </button>
                ))}
              </div>

              {modalLeftTab === "history" && (
                <LeadInteractionHistory activeLead={activeLead} />
              )}

              {modalLeftTab === "calculator" && (
                <LoanEMICalculator
                  activeLead={activeLead}
                  activeProj={
                    activeLead.projectId && projects
                      ? projects[activeLead.projectId]
                      : undefined
                  }
                  updateLead={updateLead}
                />
              )}

              {modalLeftTab === "site-visit" && (
                <SiteVisitScheduler
                  activeLead={activeLead}
                  user={user}
                  users={users}
                  updateLead={updateLead}
                  addNotification={addNotification}
                  isManagerial={isManagerial}
                />
              )}

              {modalLeftTab === "insights" && (
                <LeadProximityInsights
                  activeProj={
                    activeLead.projectId && projects
                      ? projects[activeLead.projectId]
                      : undefined
                  }
                />
              )}
            </div>
          </section>

          {/* COLUMN 3: Outbound calling and action forms */}
          <section className="space-y-5 min-w-0">
            <SimulatedDialer
              activeDialerLead={activeDialerLead}
              dialerStatus={dialerStatus}
              dialerSeconds={dialerSeconds}
              dialerMuted={dialerMuted}
              setDialerMuted={setDialerMuted}
              dialerSpeaker={dialerSpeaker}
              setDialerSpeaker={setDialerSpeaker}
              handleStartCall={handleStartCall}
              handleEndCall={triggerEndCall}
              activeLead={activeLead}
            />

            <CallLoggingForm
              callLogForm={callLogForm}
              setCallLogForm={setCallLogForm}
              onSubmit={handleCallLogSubmit}
            />

            <DiscountManager
              activeLead={activeLead}
              isOpen={isDiscountOpen}
              onToggle={() => setIsDiscountOpen(!isDiscountOpen)}
              updateLead={updateLead}
              user={user}
              users={users}
              isManagerial={isManagerial}
              addNotification={addNotification}
            />

            <WhatsAppAssistant
              activeLead={activeLead}
              isOpen={isWaAssistantOpen}
              onToggle={() => setIsWaAssistantOpen(!isWaAssistantOpen)}
              projects={projects}
              whatsAppMessage={whatsAppMessage}
              setWhatsAppMessage={setWhatsAppMessage}
              user={user}
            />
          </section>
        </div>
      </main>

      <SalesCopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        leadId={activeLead.id}
        leadName={activeLead.name}
        lead={activeLead}
        userId={user.id}
        actorName={user.username}
        role={user.role}
        assignableUsers={users.map((u) => ({
          id: u.id,
          username: u.username,
          status: u.status,
        }))}
        updateLead={updateLead}
        logCall={logCall}
        contextSlots={copilotContext?.contextSlots}
        nextAction={copilotContext?.nextAction}
        readiness={copilotContext?.readiness}
        timeline={copilotContext?.timeline}
        rulesBrief={copilotContext?.rulesBrief}
      />

      <Dialog
        isOpen={!!feedback}
        onClose={() => {
          const dismiss =
            feedback?.mode === "alert" ? feedback.onDismiss : undefined;
          setFeedback(null);
          dismiss?.();
        }}
        title={feedback?.title ?? ""}
        description={feedback?.description}
        cancelLabel={feedback?.mode === "alert" ? "OK" : "Cancel"}
        confirmLabel={
          feedback?.mode === "confirm"
            ? feedback.confirmLabel ?? "Confirm"
            : undefined
        }
        confirmVariant={
          feedback?.mode === "confirm"
            ? feedback.confirmVariant ?? "primary"
            : undefined
        }
        onConfirm={
          feedback?.mode === "confirm" ? feedback.onConfirm : undefined
        }
      />

      <LeadDetailsBottomBar
        activeLead={activeLead}
        onStartCall={handleStartCall}
        onOpenWhatsApp={() => setIsWaAssistantOpen(true)}
        onOpenCopilot={() => setIsCopilotOpen(true)}
        onOpenTemplates={() => openTemplates()}
      />
    </div>
  );
}
