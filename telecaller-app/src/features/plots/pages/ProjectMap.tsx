import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAppShell } from "@/shared/layouts/AppShellContext";
import { useProjectsStore } from "@/features/plots/hooks/useProjectsStore";
import { useLeadsStore } from "@/features/leads/hooks/useLeadsStore";
import { useAgentOpenLeads } from "@/features/leads/hooks/useAgentOpenLeads";
import { useIVRStore } from "@/features/calls/hooks/useIVRStore";
import { functions } from "@/shared/services/firebase";
import { httpsCallable } from "firebase/functions";
import { logAnalyticsEvent } from "@/shared/utils/analytics";
import { formatDuration } from "@/shared/utils/dateUtils";
import { User, Plot, Lead } from "@/shared/types";

import MapCallLogModal from "@/features/leads/components/MapCallLogModal";
import LinkLeadModal from "@/features/leads/components/LinkLeadModal";
import SimulatedDialerOverlay from "@/features/calls/components/SimulatedDialerOverlay";
import ProjectMapSidebar from "../components/ProjectMapSidebar";
import ProjectMapCanvas from "../components/ProjectMapCanvas";
import { useToast } from "@/shared/components/Toast";
import Badge from "@/shared/components/ui/Badge";

interface ProjectMapProps {
  user: User;
}

export default function ProjectMap({ user }: ProjectMapProps) {
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const {
    projects,
    isLoaded: projectsLoaded,
    updateProject,
  } = useProjectsStore();
  const {
    addLead,
    updateLead: updateLeadInStore,
    logCall,
  } = useLeadsStore();
  const { openLeads: leads, isLoaded: leadsLoaded } = useAgentOpenLeads();
  const { ivrSettings } = useIVRStore(user ? user.id : null);
  const project = id ? projects[id] : undefined;

  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);

  useEffect(() => {
    if (selectedPlot) {
      logAnalyticsEvent("plot_viewed", {
        plotId: selectedPlot.id,
        number: selectedPlot.number,
        projectId: id || "",
        status: selectedPlot.status,
      });
    }
  }, [selectedPlot, id]);

  const [hoveredPlot, setHoveredPlot] = useState<Plot | null>(null);
  const [filter, setFilter] = useState("all");
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const transformRef = useRef<unknown>(null);

  const handleImageLoad = () => {
    if (transformRef.current) {
      (transformRef.current as { centerView?: () => void }).centerView?.();
    }
  };

  // Search & Focus states
  const [searchQuery, setSearchQuery] = useState("");
  const [flashPlotId, setFlashPlotId] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(false);

  // Work OS context (modals managed by AppShell)
  const { setTemplateContext } = useAppShell();

  // Sync project context so global template modal has the right project name
  useEffect(() => {
    if (project && setTemplateContext) {
      setTemplateContext({ projectName: project.name || "" });
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
  }, [project, setTemplateContext]);

  const [activeMapLead, setActiveMapLead] = useState<Lead | null>(null);
  const [isLinkLeadModalOpen, setIsLinkLeadModalOpen] = useState(false);
  const [leadLinkMode, setLeadLinkMode] = useState<"existing" | "new">("existing");
  const [selectedExistingLeadId, setSelectedExistingLeadId] = useState("");
  const [callLogForm, setCallLogForm] = useState({
    note: "",
    status: "contacted",
    followUpDate: "",
  });
  const [newLeadForm, setNewLeadForm] = useState<{
    name: string;
    phone: string;
    email: string;
    notes: string;
    priority: "warm" | "hot" | "cold";
  }>({
    name: "",
    phone: "",
    email: "",
    notes: "",
    priority: "warm",
  });

  // Dialer states
  const [activeDialerLead, setActiveDialerLead] = useState<Lead | null>(null);
  const [dialerStatus, setDialerStatus] = useState("Dialing..."); // 'Dialing...', 'Ringing...', 'Active Call'
  const [dialerSeconds, setDialerSeconds] = useState(0);
  const [dialerMuted, setDialerMuted] = useState(false);
  const [dialerSpeaker, setDialerSpeaker] = useState(false);
  const [dialerIntervalId, setDialerIntervalId] = useState<ReturnType<typeof setInterval> | null>(null);
  const [ringTimeoutId, setRingTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [connectTimeoutId, setConnectTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleStartCall = (lead: Lead) => {
    setActiveDialerLead(lead);
    setDialerSeconds(0);
    setDialerMuted(false);
    setDialerSpeaker(false);

    if (ivrSettings && ivrSettings.enableIvr) {
      if (ivrSettings.ivrProvider === "mock") {
        setDialerStatus("Connecting IVR...");
        const ringT = setTimeout(() => {
          setDialerStatus("Ringing agent...");
          const connectT = setTimeout(() => {
            setDialerStatus("Connecting customer...");
            const activeT = setTimeout(() => {
              setDialerStatus("Active Call");
              const intervalI = setInterval(() => {
                setDialerSeconds((prev) => prev + 1);
              }, 1000);
              setDialerIntervalId(intervalI);
            }, 1500);
            setConnectTimeoutId(activeT);
          }, 1500);
          setRingTimeoutId(connectT);
        }, 1200);
        setRingTimeoutId(ringT);
      } else {
        setDialerStatus("Connecting IVR...");
        const triggerCall = async () => {
          try {
            const trigger = httpsCallable(functions, "triggerOutboundCall");
            const result = await trigger({ leadId: lead.id });

            interface OutboundCallResult {
              success: boolean;
              message?: string;
            }
            const resData = result.data as OutboundCallResult | undefined;

            if (resData && resData.success) {
              setDialerStatus("Ringing agent...");
              const ringT = setTimeout(() => {
                setDialerStatus("Connecting customer...");
                const connectT = setTimeout(() => {
                  setDialerStatus("Active Call");
                  const intervalI = setInterval(() => {
                    setDialerSeconds((prev) => prev + 1);
                  }, 1000);
                  setDialerIntervalId(intervalI);
                }, 2000);
                setConnectTimeoutId(connectT);
              }, 2000);
              setRingTimeoutId(ringT);
            } else {
              setDialerStatus(
                "Failed: " + (resData?.message || "Unknown error")
              );
            }
          } catch (err: unknown) {
            console.error("IVR call trigger failed:", err);
            const msg = err instanceof Error ? err.message : String(err);
            setDialerStatus("Failed: " + msg);
          }
        };
        triggerCall();
      }
    } else {
      setDialerStatus("Dialing...");
      const ringT = setTimeout(() => {
        setDialerStatus("Ringing...");
      }, 1200);
      setRingTimeoutId(ringT);

      const connectT = setTimeout(() => {
        setDialerStatus("Active Call");
        const intervalI = setInterval(() => {
          setDialerSeconds((prev) => prev + 1);
        }, 1000);
        setDialerIntervalId(intervalI);
      }, 3500);
      setConnectTimeoutId(connectT);
    }
  };

  const handleEndCall = () => {
    // Clear intervals
    if (dialerIntervalId) clearInterval(dialerIntervalId);
    if (ringTimeoutId) clearTimeout(ringTimeoutId);
    if (connectTimeoutId) clearTimeout(connectTimeoutId);

    // Save call duration in logCall form note
    const durationStr = formatDuration(dialerSeconds);
    if (activeDialerLead) {
      setCallLogForm({
        note: `[Call Log - Duration: ${durationStr}] `,
        status: activeDialerLead.status,
        followUpDate: activeDialerLead.followUpDate || "",
      });
    }

    setActiveMapLead(activeDialerLead);
    setActiveDialerLead(null);
  };

  useEffect(() => {
    return () => {
      if (dialerIntervalId) clearInterval(dialerIntervalId);
      if (ringTimeoutId) clearTimeout(ringTimeoutId);
      if (connectTimeoutId) clearTimeout(connectTimeoutId);
    };
  }, [dialerIntervalId, ringTimeoutId, connectTimeoutId]);

  if (!projectsLoaded || !leadsLoaded) {
    return (
      <div className="min-h-screen bg-theme-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-theme-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-theme-muted font-medium">
            Loading interactive layout map...
          </p>
        </div>
      </div>
    );
  }
  if (!project)
    return (
      <div className="p-10 text-center text-theme-text">Project not found</div>
    );

  const filteredPlots = project.plots.filter(
    (p) => filter === "all" || p.status === filter,
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return "bg-theme-success/10 text-theme-success border-theme-success/20";
      case "sold":
        return "bg-theme-danger/10 text-theme-danger border-theme-danger/20";
      case "reserved":
        return "bg-theme-warning/10 text-theme-warning border-theme-warning/20";
      case "road":
        return "bg-theme-surface text-theme-muted border-theme-border";
      case "market":
        return "bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800";
      case "park":
        return "bg-theme-success/10 text-theme-success border-theme-success/20";
      default:
        return "bg-theme-surface text-theme-text border-theme-border";
    }
  };

  const handlePlotHover = (plot: Plot, e: React.MouseEvent) => {
    setHoveredPlot(plot);
    if (mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (hoveredPlot && mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  // Shoelace formula area calculator
  const calculatePolygonArea = (
    points: [number, number][] | undefined,
    scaleRatio: number | null | undefined,
  ) => {
    if (!points || points.length < 3) return 0;
    let sum = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      sum += p1[0] * p2[1] - p2[0] * p1[1];
    }
    const areaSvg = Math.abs(sum) / 2;
    if (scaleRatio) {
      return Math.round(areaSvg * scaleRatio ** 2);
    }
    return Math.round(areaSvg * 100) / 100;
  };



  const handleSearchPlot = (number: string) => {
    const plot = project.plots.find(
      (p) => p.number.toLowerCase() === number.toLowerCase(),
    );
    if (plot) {
      setSelectedPlot(plot);
      setFlashPlotId(plot.id);

      // Zoom and center the element using react-zoom-pan-pinch zoomToElement API
      if (transformRef.current) {
        setTimeout(() => {
          (transformRef.current as any).zoomToElement(`poly-${plot.id}`, 3.5, 600);
        }, 100);
      }

      setTimeout(() => {
        setFlashPlotId(null);
      }, 3000);
    }
  };

  const handleMapCallLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMapLead) return;

    await logCall(activeMapLead.id, {
      note: callLogForm.note,
      status: callLogForm.status,
      followUpDate: callLogForm.followUpDate,
      agent: user.username,
      timelineActivity: "call",
    });

    let plotStatus: Plot["status"] | null = null;
    if (callLogForm.status === "booked") plotStatus = "sold";
    else if (callLogForm.status === "reserved") plotStatus = "reserved";

    if (plotStatus && selectedPlot) {
      const updatedPlots = project.plots.map((p) => {
        if (p.id === selectedPlot.id || p.number === selectedPlot.number) {
          return { ...p, status: plotStatus as Plot["status"] };
        }
        return p;
      });
      await updateProject(project.id, { ...project, plots: updatedPlots });
      setSelectedPlot({ ...selectedPlot, status: plotStatus });
    }

    setCallLogForm({ note: "", status: "contacted", followUpDate: "" });
    setActiveMapLead(null);
  };

  const handleLinkLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlot) return;
    if (leadLinkMode === "existing") {
      if (!selectedExistingLeadId) {
        toast("Please select a lead first.", "warning");
        return;
      }
      await updateLeadInStore(selectedExistingLeadId, {
        projectId: project.id,
        plotId: selectedPlot.number,
      });
    } else {
      await addLead({
        name: newLeadForm.name,
        phone: newLeadForm.phone,
        email: newLeadForm.email,
        projectId: project.id,
        plotId: selectedPlot.number,
        notes: newLeadForm.notes,
        status: "new",
        priority: newLeadForm.priority || "warm",
        assignedTo: user.role === "telecaller" ? user.id : "",
        assignedToName:
          user.role === "telecaller" ? user.username : "Unassigned",
      });
    }
    setIsLinkLeadModalOpen(false);
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-theme-bg text-theme-text transition-colors duration-300">
      <header className="bg-theme-card/85 backdrop-blur-md border-b border-theme-border z-10">
        <div className="px-3 md:px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              to="/"
              className="p-1.5 min-h-11 min-w-11 inline-flex items-center justify-center rounded-theme bg-theme-surface hover:bg-theme-card text-theme-muted hover:text-theme-text transition-all border border-theme-border shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
              title="Back to CRM"
              aria-label="Back to CRM"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </Link>
            <h1 className="type-card-title text-theme-text truncate max-w-[150px] md:max-w-none tracking-tight">
              {project.name}
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex flex-col md:flex-row space-y-1 md:space-y-0 md:space-x-2">
              <Badge variant="success" className="normal-case tracking-wide">
                <span className="hidden sm:inline">Available: </span>
                <span className="sm:hidden">Avail: </span>
                {project.plots.filter((p) => p.status === "available").length}
              </Badge>
              <Badge variant="danger" className="normal-case tracking-wide">
                <span className="hidden sm:inline">Sold: </span>
                <span className="sm:hidden">Sold: </span>
                {project.plots.filter((p) => p.status === "sold").length}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <ProjectMapCanvas
          project={project}
          filteredPlots={filteredPlots}
          selectedPlot={selectedPlot}
          setSelectedPlot={setSelectedPlot}
          hoveredPlot={hoveredPlot}
          setHoveredPlot={setHoveredPlot}
          tooltipPos={tooltipPos}
          setTooltipPos={setTooltipPos}
          mapContainerRef={mapContainerRef}
          transformRef={transformRef}
          handleImageLoad={handleImageLoad}
          handleMouseMove={handleMouseMove}
          handlePlotHover={handlePlotHover}
          showLabels={showLabels}
          setShowLabels={setShowLabels}
          flashPlotId={flashPlotId}
          calculatePolygonArea={calculatePolygonArea}
        />
        <ProjectMapSidebar
          selectedPlot={selectedPlot}
          setSelectedPlot={setSelectedPlot}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filter={filter}
          setFilter={setFilter}
          handleSearchPlot={handleSearchPlot}
          getStatusBadge={getStatusBadge}
          calculatePolygonArea={calculatePolygonArea}
          project={project}
          leads={leads}
          user={user}
          handleStartCall={handleStartCall}
          setActiveMapLead={setActiveMapLead}
          setCallLogForm={setCallLogForm}
          setIsLinkLeadModalOpen={setIsLinkLeadModalOpen}
          setLeadLinkMode={setLeadLinkMode}
          setSelectedExistingLeadId={setSelectedExistingLeadId}
          setNewLeadForm={setNewLeadForm as any}
        />
      </div>

      {activeMapLead && (
        <MapCallLogModal
          activeMapLead={activeMapLead}
          onClose={() => setActiveMapLead(null)}
          onSubmit={handleMapCallLogSubmit}
          callLogForm={callLogForm}
          setCallLogForm={setCallLogForm as any}
        />
      )}

      {isLinkLeadModalOpen && (
        <LinkLeadModal
          selectedPlot={selectedPlot!}
          onClose={() => setIsLinkLeadModalOpen(false)}
          onSubmit={handleLinkLeadSubmit}
          leadLinkMode={leadLinkMode}
          setLeadLinkMode={setLeadLinkMode}
          leads={leads}
          selectedExistingLeadId={selectedExistingLeadId}
          setSelectedExistingLeadId={setSelectedExistingLeadId}
          newLeadForm={newLeadForm}
          setNewLeadForm={setNewLeadForm as any}
        />
      )}

      {/* SIMULATED DIALER OVERLAY */}
      {activeDialerLead && (
        <SimulatedDialerOverlay
          activeDialerLead={activeDialerLead}
          dialerStatus={dialerStatus}
          dialerSeconds={dialerSeconds}
          dialerMuted={dialerMuted}
          setDialerMuted={setDialerMuted}
          dialerSpeaker={dialerSpeaker}
          setDialerSpeaker={setDialerSpeaker}
          handleEndCall={handleEndCall}
        />
      )}

      {/* Modals now rendered globally by AppShell */}
    </div>
  );
}
