import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, PhoneForwarded, FileText, BarChart3, Calendar, Map, AlertCircle, Sparkles } from "lucide-react";

import { useAppShell } from "@/shared/layouts/AppShellContext";
import { useLeadsStore } from "@/features/leads/hooks/useLeadsStore";
import { useIVRStore } from "@/features/calls/hooks/useIVRStore";
import { useProjectsStore } from "@/features/plots/hooks/useProjectsStore";
import { useUsersStore } from "@/features/employees/hooks/useUsersStore";
import { useNotificationsStore } from "@/features/dashboard/hooks/useNotificationsStore";
import { useCustomRolesStore } from "@/features/admin/hooks/adminStores";
import { functions } from "@/shared/services/firebase";
import { httpsCallable } from "firebase/functions";

import { getLeadStatusColor } from "@/features/leads/utils/leadColors";
import { formatDuration } from "@/shared/utils/dateUtils";

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
import CallLoggingForm, { CallLogFormState } from "@/features/leads/components/CallLoggingForm";
import DiscountManager from "@/features/leads/components/DiscountManager";
import LeadPipelineTracker from "@/features/leads/components/LeadPipelineTracker";
import WhatsAppAssistant from "@/features/leads/components/WhatsAppAssistant";
import Dialog from "@/shared/components/ui/Dialog";
import BottomActionBar from "@/shared/components/ui/BottomActionBar";

// Types and Services
import { User, Lead } from "@/shared/types";
import { isManagerial as isManagerialUtil } from "@/shared/utils/roleUtils";
import { getIstDateString, planStatusTransition } from "@/shared/contracts";
import LeadIntelligenceStrip from "@/features/leads/components/LeadIntelligenceStrip";
import {
  SalesCopilotDrawer,
  buildCopilotContext,
} from "@/features/leads/copilot";
import { useTimelineEvents } from "@/features/messaging";
import { computeLeadIntelligence } from "@/features/leads/intelligence";
import { useAuthorization } from "@/shared/services/AuthorizationContext";

type FeedbackDialog =
  | {
      mode: "alert";
      title: string;
      description: string;
      onDismiss?: () => void;
    }
  | {
      mode: "confirm";
      title: string;
      description: string;
      confirmLabel?: string;
      confirmVariant?: "primary" | "danger" | "success";
      onConfirm: () => void | Promise<void>;
    };

interface LeadDetailsPageProps {
  user: User;
}

export default function LeadDetailsPage({ user }: LeadDetailsPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { leads, isLoaded: leadsLoaded, updateLead, logCall } = useLeadsStore();
  const { projects, isLoaded: projectsLoaded } = useProjectsStore();
  const { users } = useUsersStore();
  const { addNotification } = useNotificationsStore(user?.id);
  const { roles: customRoles } = useCustomRolesStore();
  const { ivrSettings } = useIVRStore(user ? user.id : null);
  const { canAssignLead } = useAuthorization();
  const isManagerial = useCallback((roleCode?: string) => {
    if (!roleCode || roleCode === user.role) {
      return canAssignLead();
    }
    return isManagerialUtil(roleCode, customRoles);
  }, [canAssignLead, user.role, customRoles]);
  const { openTemplates, setTemplateContext } = useAppShell();

  const activeLead = useMemo(() => leads.find((l) => l.id === id), [leads, id]);

  // Layout states
  const [modalLeftTab, setModalLeftTab] = useState("history");
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [isWaAssistantOpen, setIsWaAssistantOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState("");

  // Copilot: preload timeline on host (drawer never queries Firestore).
  const { events: copilotTimelineEvents } = useTimelineEvents(
    isCopilotOpen && activeLead ? activeLead.id : null,
    50,
  );

  const todayYmd = useMemo(() => getIstDateString(), []);

  const leadIntelligence = useMemo(() => {
    if (!activeLead) return null;
    return computeLeadIntelligence(activeLead, {
      todayYmd,
      isManagerial: isManagerial(user.role),
      peers: leads.map((l) => ({ id: l.id, phone: l.phone })),
    });
  }, [activeLead, leads, todayYmd, user.role, isManagerial]);

  const copilotContext = useMemo(() => {
    if (!activeLead || !leadIntelligence) return null;
    return buildCopilotContext({
      lead: activeLead,
      timelineEvents: copilotTimelineEvents,
      intelligence: leadIntelligence,
      todayYmd,
      intelligenceOptions: {
        todayYmd,
        isManagerial: isManagerial(user.role),
      },
    });
  }, [
    activeLead,
    copilotTimelineEvents,
    leadIntelligence,
    todayYmd,
    user.role,
    isManagerial,
  ]);

  // Dialer simulation states
  const [activeDialerLead, setActiveDialerLead] = useState<Lead | null>(null);
  const [dialerStatus, setDialerStatus] = useState("Dialing...");
  const [dialerSeconds, setDialerSeconds] = useState(0);
  const [dialerMuted, setDialerMuted] = useState(false);
  const [dialerSpeaker, setDialerSpeaker] = useState(false);
  const dialerIntervalRef = useRef<any>(null);

  // Power Dialer state
  const [isDialerActive, setIsDialerActive] = useState(
    sessionStorage.getItem("isPowerDialerActive") === "true"
  );
  const [feedback, setFeedback] = useState<FeedbackDialog | null>(null);

  // Sync templates context
  useEffect(() => {
    if (activeLead && setTemplateContext) {
      setTemplateContext({
        clientName: activeLead.name || "",
        phone: activeLead.phone || "",
        projectName: activeLead.projectId && projects && projects[activeLead.projectId] ? projects[activeLead.projectId].name : "",
        plotNumber: activeLead.plotId || "",
      });
    }
    return () => {
      if (setTemplateContext) {
        setTemplateContext({
          clientName: "",
          phone: "",
          projectName: "",
          plotNumber: "",
        });
      }
    };
  }, [activeLead, projects, setTemplateContext]);

  // Form states
  const [callLogForm, setCallLogForm] = useState<CallLogFormState>({
    note: "",
    status: "new",
    disposition: "Connected",
    priority: "warm",
    followUpDate: "",
  });

  // Sync states on load or lead switch
  const [prevLeadId, setPrevLeadId] = useState<string | undefined>(activeLead?.id);
  if (activeLead && activeLead.id !== prevLeadId) {
    setPrevLeadId(activeLead.id);
    setCallLogForm((prev) => ({
      ...prev,
      status: activeLead.status || "new",
      priority: activeLead.priority || "warm",
      followUpDate: activeLead.followUpDate || "",
    }));
    setModalLeftTab(activeLead.siteVisit ? "site-visit" : "history");
  }

  // Outbound call handler
  const handleStartCall = (lead: Lead) => {
    setActiveDialerLead(lead);
    setDialerSeconds(0);
    setDialerMuted(false);
    setDialerSpeaker(false);

    if (ivrSettings && ivrSettings.enableIvr) {
      if (ivrSettings.ivrProvider === "mock") {
        setDialerStatus("Connecting IVR...");
        setTimeout(() => {
          setDialerStatus("Ringing agent...");
          setTimeout(() => {
            setDialerStatus("Connecting customer...");
            setTimeout(() => {
              setDialerStatus("Active Call");
            }, 1500);
          }, 1500);
        }, 1200);
      } else {
        setDialerStatus("Connecting IVR...");
        const triggerCall = async () => {
          try {
            const trigger = httpsCallable(functions, "triggerOutboundCall");
            const result = (await trigger({ leadId: lead.id })) as any;

            if (result.data && result.data.success) {
              setDialerStatus("Ringing agent...");
              setTimeout(() => {
                setDialerStatus("Connecting customer...");
                setTimeout(() => {
                  setDialerStatus("Active Call");
                }, 2000);
              }, 2000);
            } else {
              setDialerStatus("Failed: " + (result.data?.message || "Unknown error"));
            }
          } catch (err: any) {
            console.error("IVR call trigger failed:", err);
            setDialerStatus("Failed: " + err.message);
          }
        };
        triggerCall();
      }
    } else {
      setDialerStatus("Dialing...");
      setTimeout(() => {
        setDialerStatus("Ringing...");
        setTimeout(() => {
          setDialerStatus("Active Call");
        }, 2000);
      }, 1500);
    }
  };

  // Dialer timer ticks
  useEffect(() => {
    if (activeDialerLead && dialerStatus === "Active Call") {
      dialerIntervalRef.current = setInterval(() => {
        setDialerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (dialerIntervalRef.current) clearInterval(dialerIntervalRef.current);
    }
    return () => {
      if (dialerIntervalRef.current) clearInterval(dialerIntervalRef.current);
    };
  }, [activeDialerLead, dialerStatus]);

  // Power dialer auto-call on page mount or switch
  useEffect(() => {
    if (activeLead && isDialerActive) {
      const timer = setTimeout(() => {
        if (!activeDialerLead) {
          handleStartCall(activeLead);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLead?.id, isDialerActive]);

  if (!leadsLoaded || !projectsLoaded) {
    return (
      <div className="min-h-screen app-canvas flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-theme-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-theme-muted font-medium">Loading CRM Workspace...</p>
        </div>
      </div>
    );
  }

  if (!activeLead) {
    return (
      <div className="min-h-screen app-canvas flex flex-col items-center justify-center p-4">
        <div className="card-premium p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-theme-text mb-2">Lead Not Found</h2>
          <p className="text-theme-muted mb-6 text-sm">
            The lead you are trying to view does not exist or you do not have permission to view it.
          </p>
          <button
            onClick={() => navigate("/")}
            className="btn-premium-primary px-6 py-2.5 text-sm"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const shouldHideEmail = user.roleRestrictions?.hideEmail;
  const shouldHideLeadSource = user.roleRestrictions?.hideLeadSource;
  const shouldHideFinancials = user.roleRestrictions?.hideFinancials;

  const handleEndCall = () => {
    if (dialerIntervalRef.current) clearInterval(dialerIntervalRef.current);
    const durationStr = formatDuration(dialerSeconds * 1000);
    setCallLogForm((prev) => ({
      ...prev,
      note: (prev.note ? prev.note + "\n" : "") + `[Call Log - Duration: ${durationStr}] `,
    }));
    setActiveDialerLead(null);
  };

  const handleCallLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const disposition = callLogForm.disposition || "Connected";
    const customerPicked = ["Connected", "Interested", "Site Visit Scheduled", "Booked"].includes(
      disposition
    );

    const finalNote = callLogForm.note.trim() || "Logged a call disposition: " + disposition;
    const targetStatus = callLogForm.status || "new";
    const statusPlan = planStatusTransition({
      from: activeLead.status,
      to: targetStatus,
      reason: "call",
    });
    if (!statusPlan.ok && statusPlan.error !== "Status unchanged") {
      setFeedback({
        mode: "alert",
        title: "Status change blocked",
        description: statusPlan.error || "Cannot apply call disposition status.",
      });
      return;
    }

    await logCall(activeLead.id, {
      note: finalNote,
      status: statusPlan.to,
      followUpDate: callLogForm.followUpDate,
      agent: user.username,
      duration: dialerSeconds || 0,
      callType: "outgoing",
      picked: customerPicked,
      timelineActivity: "call",
    });

    // Priority only — status/follow-up already applied via logCall (one emit path).
    await updateLead(activeLead.id, {
      priority: callLogForm.priority,
    });

    // Deep-link only — do NOT write callLogs / [WhatsApp Sent] (messaging SoR).
    const autoSendCheckbox = document.getElementById("autoWhatsAppCheck") as HTMLInputElement;
    if (autoSendCheckbox && autoSendCheckbox.checked && disposition === "Connected") {
      const projectName = (activeLead.projectId && projects[activeLead.projectId]?.name) || "Golden Acres";
      const cleanPhone = activeLead.phone.replace(/[^0-9]/g, "");
      const defaultText = `Hello ${activeLead.name}, thank you for taking the time to speak with us today regarding ${projectName}. Regards, Golden Acres.`;
      const waUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(defaultText)}`;
      window.open(waUrl, "_blank");
    }

    setCallLogForm((prev) => ({ ...prev, note: "" }));

    if (isDialerActive) {
      const queueStr = sessionStorage.getItem("powerDialerQueue");
      const queue = queueStr ? JSON.parse(queueStr) : [];
      const currentIndex = queue.indexOf(activeLead.id);
      const nextLeadId = queue[currentIndex + 1];
      if (nextLeadId) {
        setFeedback({
          mode: "alert",
          title: "Call log saved",
          description:
            "Call log saved successfully! Proceeding to next lead in queue...",
          onDismiss: () => navigate(`/lead/${nextLeadId}`),
        });
      } else {
        sessionStorage.removeItem("isPowerDialerActive");
        setIsDialerActive(false);
        setFeedback({
          mode: "alert",
          title: "Queue complete",
          description:
            "Auto-dialer queue complete! No more leads in this queue.",
          onDismiss: () => handleBackNavigation(),
        });
      }
    } else {
      setFeedback({
        mode: "alert",
        title: "Call log saved",
        description: "Call log and status saved successfully!",
      });
    }
  };

  const handleBackNavigation = () => {
    if (isManagerial(user.role)) {
      navigate("/admin");
    } else {
      navigate("/");
    }
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden app-canvas text-theme-text transition-colors duration-300 pb-20 md:pb-0">
      {/* Frosted Header Bar */}
      <header className="sticky top-0 bg-theme-card/85 backdrop-blur-md border-b border-theme-border header-brand-strip px-4 h-14 flex items-center justify-between z-30 shadow-sm transition-all duration-300">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleBackNavigation}
            className="btn-premium-secondary px-3 py-1.5 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div>
            <h1 className="text-sm sm:text-base font-black tracking-tight flex items-center">
              {activeLead.name}
              <span
                className={`ml-2 text-[8px] sm:text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border ${getLeadStatusColor(
                  activeLead.status
                )}`}
              >
                {activeLead.status}
              </span>
            </h1>
            <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">
              Lead ID: {activeLead.id}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isDialerActive && (
            <button
              onClick={() => {
                sessionStorage.removeItem("isPowerDialerActive");
                setIsDialerActive(false);
                setFeedback({
                  mode: "alert",
                  title: "Power Dialer paused",
                  description:
                    "Power Dialer paused. You can resume from the dashboard.",
                });
              }}
              className="flex items-center space-x-1.5 p-1.5 sm:px-3 sm:py-1.5 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 dark:bg-amber-950/20 dark:border-amber-900/60 text-amber-600 dark:text-amber-400 rounded-lg cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              title="Pause Dialer"
            >
              <PhoneForwarded className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Pause Dialer</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCopilotOpen(true)}
            className="flex items-center space-x-1.5 p-1.5 sm:px-3 sm:py-1.5 text-xs font-bold bg-theme-accent-muted hover:bg-theme-accent/20 border border-theme-border text-theme-accent rounded-lg cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Sales Copilot"
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden />
            <span className="hidden sm:inline">Copilot</span>
          </button>

          <button
            onClick={() => openTemplates()}
            className="flex items-center space-x-1.5 p-1.5 sm:px-3 sm:py-1.5 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 dark:bg-amber-950/20 dark:border-amber-900/60 text-amber-600 dark:text-amber-400 rounded-lg cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Outreach Templates"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Templates</span>
          </button>
        </div>
      </header>

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
            const isTerminalNotInterested = activeLead.status === "not-interested";
            const nextStatus = isTerminalNotInterested ? "new" : "not-interested";
            setFeedback({
              mode: "confirm",
              title: isTerminalNotInterested
                ? "Reopen lead?"
                : "Mark not interested?",
              description: `Mark lead ${activeLead.name} as ${
                isTerminalNotInterested ? "Active (New)" : "Not Interested"
              }?`,
              confirmLabel: isTerminalNotInterested ? "Reopen" : "Mark Not Interested",
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
          allLeads={leads}
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

            <PlotLocator activeProj={activeLead.projectId ? projects[activeLead.projectId] : undefined} activeLead={activeLead} />

            <SmartCallScript activeLead={activeLead} activeProj={activeLead.projectId ? projects[activeLead.projectId] : undefined} />
          </section>

          {/* COLUMN 2: Tabs (History, Loans, Scheduler) */}
          <section className="space-y-5 min-w-0">
            <div className="card-premium p-5 sm:p-6 space-y-5">
              <div className="flex gap-1 p-1 bg-theme-surface rounded-xl border border-theme-border w-full overflow-x-auto">
                {[
                  { id: "history", label: "History", icon: <FileText className="w-3.5 h-3.5" /> },
                  { id: "calculator", label: "Loan & EMI", icon: <BarChart3 className="w-3.5 h-3.5" /> },
                  { id: "site-visit", label: "Site Visits", icon: <Calendar className="w-3.5 h-3.5" /> },
                  { id: "insights", label: "Insights", icon: <Map className="w-3.5 h-3.5" /> },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setModalLeftTab(t.id)}
                    className={`flex-1 min-w-[4.5rem] py-2 px-1.5 text-[11px] font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                      modalLeftTab === t.id
                        ? "bg-brand-gradient text-white shadow-md"
                        : "text-theme-muted hover:text-theme-text hover:bg-theme-card"
                    }`}
                  >
                    {t.icon}
                    <span className="hidden sm:inline">{t.label}</span>
                    <span className="sm:hidden">{t.label.split(" ")[0]}</span>
                  </button>
                ))}
              </div>

              {modalLeftTab === "history" && <LeadInteractionHistory activeLead={activeLead} />}

              {modalLeftTab === "calculator" && (
                <LoanEMICalculator
                  activeLead={activeLead}
                  activeProj={activeLead.projectId ? projects[activeLead.projectId] : undefined}
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
                <LeadProximityInsights activeProj={activeLead.projectId ? projects[activeLead.projectId] : undefined} />
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
              handleEndCall={handleEndCall}
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

      <BottomActionBar>
        {activeLead && (
          <>
            <button
              type="button"
              onClick={() => handleStartCall(activeLead)}
              className="flex-1 flex flex-col items-center justify-center py-1 text-theme-text text-[10px] font-bold gap-1 cursor-pointer border-0 bg-transparent focus-visible:outline-none"
            >
              <PhoneForwarded className="w-5 h-5 text-theme-success animate-pulse" />
              <span>Call</span>
            </button>

            <button
              type="button"
              onClick={() => setIsWaAssistantOpen(true)}
              className="flex-1 flex flex-col items-center justify-center py-1 text-theme-text text-[10px] font-bold gap-1 cursor-pointer border-0 bg-transparent focus-visible:outline-none"
            >
              <svg className="w-5 h-5 text-theme-success" fill="currentColor" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.59-4.846c1.6.95 3.16 1.453 4.814 1.454 5.411 0 9.814-4.402 9.817-9.818.001-2.624-1.021-5.09-2.885-6.957C16.48 1.965 14.017.943 11.997.943c-5.419 0-9.827 4.404-9.83 9.82-.001 1.782.468 3.522 1.36 5.061L2.5 21.5l5.837-1.53c.277.01.554.022.83.022z"/>
              </svg>
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCopilotOpen(true)}
              className="flex-1 flex flex-col items-center justify-center py-1 text-theme-text text-[10px] font-bold gap-1 cursor-pointer border-0 bg-transparent focus-visible:outline-none"
            >
              <Sparkles className="w-5 h-5 text-theme-accent" />
              <span>Copilot</span>
            </button>

            <button
              type="button"
              onClick={() => openTemplates()}
              className="flex-1 flex flex-col items-center justify-center py-1 text-theme-text text-[10px] font-bold gap-1 cursor-pointer border-0 bg-transparent focus-visible:outline-none"
            >
              <BookOpen className="w-5 h-5 text-amber-500" />
              <span>Templates</span>
            </button>
          </>
        )}
      </BottomActionBar>
    </div>
  );
}
