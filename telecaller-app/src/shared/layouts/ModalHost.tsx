import { useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ShortcutsModal from "@/shared/components/ShortcutsModal";
import { Phone } from "lucide-react";
import SidebarNav from "@/shared/components/SidebarNav";
import { AppShellContext } from "@/shared/layouts/AppShellContext";
import { useModalRegistry } from "@/shared/layouts/ModalRegistryContext";
import type { DialerStatus, TemplateModalContext } from "@/shared/layouts/ModalRegistryContext";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { useToast } from "@/shared/components/Toast";
import { User, Project, Lead } from "@/shared/types";
import InCallWhatsAppBar from "@/features/calls/components/InCallWhatsAppBar";

interface ModalHostProps {
  user: User | null;
  projects: Record<string, Project> | null;
  children: ReactNode;
  leads: Lead[];
  addLead: (lead: any) => Promise<any>;
  updateLead: (id: string, data: any) => Promise<any>;
  logCall: (leadId: string, call: any) => Promise<any>;
  ivrSettings: any;
  activeIvrCall: any;
  clearActiveIvrCall: () => Promise<void>;
}

export default function ModalHost({
  user,
  projects,
  children,
  leads,
  addLead,
  updateLead,
  logCall,
  ivrSettings,
  activeIvrCall,
  clearActiveIvrCall,
}: ModalHostProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { TemplateCenterModal, DialPadDrawer, DialerOverlay, CallLogModal } = useModalRegistry();

  // ── Fullscreen state ──────────────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);

  interface FullscreenDocument extends Document {
    webkitFullscreenElement?: Element;
    mozFullScreenElement?: Element;
    msFullscreenElement?: Element;
    webkitExitFullscreen?: () => Promise<void>;
    mozCancelFullScreen?: () => Promise<void>;
    msExitFullscreen?: () => Promise<void>;
  }

  interface FullscreenElement extends HTMLElement {
    webkitRequestFullscreen?: () => Promise<void>;
    mozRequestFullScreen?: () => Promise<void>;
    msRequestFullscreen?: () => Promise<void>;
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      const docObj = document as FullscreenDocument;
      const isCurrentlyFullscreen = !!(
        docObj.fullscreenElement ||
        docObj.webkitFullscreenElement ||
        docObj.mozFullScreenElement ||
        docObj.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const isMobile = Capacitor.isNativePlatform();

    if (isMobile) {
      try {
        const { StatusBar } = await import("@capacitor/status-bar");
        if (isFullscreen) {
          await StatusBar.show();
          setIsFullscreen(false);
          toast("Exited full screen mode", "info");
        } else {
          await StatusBar.hide();
          setIsFullscreen(true);
          toast("Entered full screen mode", "success");
        }
      } catch (err) {
        console.error("Failed to toggle native status bar:", err);
        toast("Failed to toggle full screen", "error");
      }
    } else {
      try {
        const docEl = document.documentElement as FullscreenElement;
        const docObj = document as FullscreenDocument;
        if (isFullscreen) {
          if (docObj.exitFullscreen) {
            await docObj.exitFullscreen();
          } else if (docObj.webkitExitFullscreen) {
            await docObj.webkitExitFullscreen();
          } else if (docObj.mozCancelFullScreen) {
            await docObj.mozCancelFullScreen();
          } else if (docObj.msExitFullscreen) {
            await docObj.msExitFullscreen();
          }
          toast("Exited full screen mode", "info");
        } else {
          if (docEl.requestFullscreen) {
            await docEl.requestFullscreen();
          } else if (docEl.webkitRequestFullscreen) {
            await docEl.webkitRequestFullscreen();
          } else if (docEl.mozRequestFullScreen) {
            await docEl.mozRequestFullScreen();
          } else if (docEl.msRequestFullscreen) {
            await docEl.msRequestFullscreen();
          }
          toast("Entered full screen mode (Press Esc or 'f' to exit)", "success");
        }
      } catch (err) {
        console.error("Fullscreen request failed:", err);
        toast("Fullscreen request blocked or not supported", "error");
      }
    }
  }, [isFullscreen, toast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const tag = activeEl?.tagName?.toLowerCase();
      const isInput =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        activeEl?.getAttribute("contenteditable") === "true";

      if (isInput) return;

      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleFullscreen]);

  // ── Modal visibility ──────────────────────────────────────────────────────
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isDialPadOpen, setIsDialPadOpen] = useState(false);
  const [isCallLogModalOpen, setIsCallLogModalOpen] = useState(false);
  const [callLogLead, setCallLogLead] = useState<Lead | null>(null);
  const [callLogDuration, setCallLogDuration] = useState(0);

  const [templateCtx, setTemplateCtx] = useState<TemplateModalContext>({
    clientName: "",
    phone: "",
    projectName: "",
    plotNumber: "",
  });



  const [activeDialerLead, setActiveDialerLead] = useState<Lead | null>(null);
  const [dialerStatus, setDialerStatus] = useState<DialerStatus>("Dialing...");
  const [dialerSeconds, setDialerSeconds] = useState(0);
  const [dialerMuted, setDialerMuted] = useState(false);
  const [dialerSpeaker, setDialerSpeaker] = useState(false);

  const dialerIntervalRef = useRef<number | null>(null);
  const ringTimeoutRef = useRef<number | null>(null);
  const connectTimeoutRef = useRef<number | null>(null);
  const ivrBridgeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeDialerLead && dialerStatus === "Active Call") {
      dialerIntervalRef.current = setInterval(
        () => setDialerSeconds((s) => s + 1),
        1000
      );
    } else {
      if (dialerIntervalRef.current) clearInterval(dialerIntervalRef.current);
    }
    return () => {
      if (dialerIntervalRef.current) clearInterval(dialerIntervalRef.current);
    };
  }, [activeDialerLead, dialerStatus]);

  const handleStartCall = useCallback(
    (lead: Lead) => {
      setActiveDialerLead(lead);
      setDialerSeconds(0);
      setDialerMuted(false);
      setDialerSpeaker(false);

      if (ivrSettings?.enableIvr) {
        const delay = ivrSettings.ivrProvider === "mock" ? 1200 : 2000;
        setDialerStatus("Connecting IVR...");
        ivrBridgeTimeoutRef.current = setTimeout(() => {
          setDialerStatus("Ringing agent...");
          ivrBridgeTimeoutRef.current = setTimeout(() => {
            setDialerStatus("Connecting customer...");
            ivrBridgeTimeoutRef.current = setTimeout(
              () => setDialerStatus("Active Call"),
              delay === 1200 ? 1500 : 2000
            );
          }, delay);
        }, delay);
      } else {
        setDialerStatus("Dialing...");
        ringTimeoutRef.current = setTimeout(() => {
          setDialerStatus("Ringing...");
          connectTimeoutRef.current = setTimeout(
            () => setDialerStatus("Active Call"),
            2000
          );
        }, 1500);
      }
    },
    [ivrSettings]
  );

  const handleEndCall = useCallback(() => {
    if (dialerIntervalRef.current) clearInterval(dialerIntervalRef.current);
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
    if (ivrBridgeTimeoutRef.current) clearTimeout(ivrBridgeTimeoutRef.current);

    const finalSeconds = dialerSeconds;
    const finalLead = activeDialerLead;
    setActiveDialerLead(null);

    if (!location.pathname.startsWith("/lead/") && finalLead) {
      setCallLogLead(finalLead);
      setCallLogDuration(finalSeconds);
      setIsCallLogModalOpen(true);
    }
  }, [dialerSeconds, activeDialerLead, location.pathname]);

  const openCallLogModal = useCallback((lead: Lead, duration = 0) => {
    setCallLogLead(lead);
    setCallLogDuration(duration);
    setIsCallLogModalOpen(true);
  }, []);

  const handleAnswerIvrCall = useCallback(async () => {
    if (!activeIvrCall) return;
    const phoneNum = activeIvrCall.callerPhone;
    const matchedIvrLead =
      leads.find((l: Lead) => l.id === activeIvrCall.leadId) ||
      leads.find((l: Lead) => l.phone === phoneNum);
    const finalLead: Lead = matchedIvrLead || {
      id: "temp-ivr-" + Date.now(),
      name: activeIvrCall.callerName || "Unknown Caller",
      phone: phoneNum,
      status: "new",
      callLogs: [],
    };
    await clearActiveIvrCall();
    navigate(`/lead/${finalLead.id}`);
  }, [activeIvrCall, leads, clearActiveIvrCall, navigate]);

  const matchedIvrLead = activeIvrCall
    ? leads.find((l: Lead) => l.id === activeIvrCall.leadId) ||
      leads.find((l: Lead) => l.phone === activeIvrCall.callerPhone)
    : null;

  // ── Stable callbacks for context ──────────────────────────────────────────
  const openTemplates = useCallback(() => setIsTemplatesOpen(true), []);
  const openShortcuts = useCallback(() => setIsShortcutsOpen(true), []);
  const setTemplateContext = useCallback(
    (ctx: Partial<TemplateModalContext>) => setTemplateCtx((prev) => ({ ...prev, ...ctx })),
    []
  );

  const handleBackAction = useCallback(() => {
    if (isTemplatesOpen) {
      setIsTemplatesOpen(false);
      return true;
    }
    if (isShortcutsOpen) {
      setIsShortcutsOpen(false);
      return true;
    }

    const isRoot =
      location.pathname === "/" &&
      (!location.search ||
        location.search === "?tab=leads" ||
        location.search === "?tab=company-dashboard");
    if (isRoot) return false;
    navigate(-1);
    return true;
  }, [isTemplatesOpen, isShortcutsOpen, location, navigate]);

  // Capacitor hardware back button
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listenerPromise = App.addListener("backButton", () => {
      if (!handleBackAction()) App.exitApp();
    });
    return () => {
      listenerPromise.then((h) => h.remove());
    };
  }, [handleBackAction]);

  // Edge-swipe gestures
  useEffect(() => {
    const isMapEditor =
      location.pathname.endsWith("/edit") &&
      location.pathname.includes("/project/");
    if (isMapEditor) return;

    let startX = 0,
      startY = 0,
      startTime = 0;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      ({ clientX: startX, clientY: startY } = e.touches[0]);
      startTime = Date.now();
    };
    const onEnd = (e: TouchEvent) => {
      if (e.changedTouches.length !== 1) return;
      const { clientX, clientY } = e.changedTouches[0];
      const dx = clientX - startX,
        dy = clientY - startY,
        dt = Date.now() - startTime;
      if (dt < 300 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) {
        if (dx > 0 && startX < 40) handleBackAction();
        else if (dx < 0 && startX > window.innerWidth - 40) {
          if (!isTemplatesOpen && !isShortcutsOpen) navigate(1);
        }
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [
    handleBackAction,
    isTemplatesOpen,
    isShortcutsOpen,
    navigate,
    location.pathname,
  ]);

  return (
    <AppShellContext.Provider
      value={{
        openTemplates,
        openShortcuts,
        setTemplateContext,
        user,
        startCall: handleStartCall,
        activeDialerLead,
        isDialPadOpen,
        setIsDialPadOpen,
        isCallLogModalOpen,
        callLogLead,
        openCallLogModal,
        isFullscreen,
        toggleFullscreen,
      }}
    >
      <div className="w-full h-[100dvh] max-h-[100dvh] overflow-hidden transition-colors duration-300 flex flex-col md:flex-row app-canvas text-theme-text">
        <SidebarNav
          user={user}
          projects={projects}
          openTemplates={openTemplates}
          openShortcuts={openShortcuts}
        />
        <div className="flex-1 flex flex-col min-w-0 w-full min-h-0 h-full overflow-hidden">
          {children}
        </div>
      </div>

      {/* Global modals */}
      {TemplateCenterModal && (
        <TemplateCenterModal
          isOpen={isTemplatesOpen}
          onClose={() => setIsTemplatesOpen(false)}
          clientName={templateCtx.clientName}
          phone={templateCtx.phone}
          projectName={templateCtx.projectName}
          plotNumber={templateCtx.plotNumber}
        />
      )}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
      {DialPadDrawer && (
        <DialPadDrawer
          isOpen={isDialPadOpen}
          onClose={() => setIsDialPadOpen(false)}
          leads={leads}
          onStartCall={handleStartCall}
          projects={projects || undefined}
          addLead={addLead}
        />
      )}
      {DialerOverlay && (
        <DialerOverlay
          activeDialerLead={activeDialerLead}
          dialerStatus={dialerStatus}
          dialerSeconds={dialerSeconds}
          dialerMuted={dialerMuted}
          setDialerMuted={setDialerMuted}
          dialerSpeaker={dialerSpeaker}
          setDialerSpeaker={setDialerSpeaker}
          handleEndCall={handleEndCall}
          activeIvrCall={activeIvrCall}
          ivrSettings={ivrSettings}
          matchedIvrLead={matchedIvrLead || null}
          projects={projects || {}}
          clearActiveIvrCall={clearActiveIvrCall}
          handleAnswerIvrCall={handleAnswerIvrCall}
        />
      )}
      {user && activeDialerLead && dialerStatus === "Active Call" && (
        <InCallWhatsAppBar
          lead={activeDialerLead}
          user={user}
          projects={projects || {}}
        />
      )}
      {CallLogModal && callLogLead && (
        <CallLogModal
          isOpen={isCallLogModalOpen}
          onClose={() => setIsCallLogModalOpen(false)}
          lead={callLogLead}
          durationSeconds={callLogDuration}
          logCall={logCall}
          updateLead={updateLead}
          user={user!}
        />
      )}
      {user && (
        <button
          type="button"
          onClick={() => setIsDialPadOpen((prev) => !prev)}
          className="fixed bottom-20 md:bottom-6 right-6 z-40 w-12 h-12 bg-theme-accent hover:opacity-90 active:scale-95 text-theme-accent-fg rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all cursor-pointer border border-theme-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring focus-visible:ring-offset-2 focus-visible:ring-offset-theme-bg"
          title="Open Phone Dialer"
          aria-label="Open phone dialer"
          aria-expanded={isDialPadOpen}
        >
          <Phone className="w-5 h-5 fill-current" aria-hidden="true" />
        </button>
      )}
    </AppShellContext.Provider>
  );
}
