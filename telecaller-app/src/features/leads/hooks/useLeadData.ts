import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLeadsStore } from "@/features/leads/hooks/useLeadsStore";
import { useProjectsStore } from "@/features/plots/hooks/useProjectsStore";
import { useUsersStore } from "@/features/employees/hooks/useUsersStore";
import { useNotificationsStore } from "@/features/dashboard/hooks/useNotificationsStore";
import { useCustomRolesStore } from "@/features/admin/hooks/adminStores";
import { useAuthorization } from "@/shared/services/AuthorizationContext";
import { useAppShell } from "@/shared/layouts/AppShellContext";
import { User, Lead } from "@/shared/types";
import { isManagerial as isManagerialUtil } from "@/shared/utils/roleUtils";
import { getIstDateString } from "@/shared/contracts";
import { useTimelineEvents } from "@/features/messaging";
import { computeLeadIntelligence } from "@/features/leads/intelligence";
import { buildCopilotContext } from "@/features/leads/copilot";
import { useAnalytics } from "@/shared/services/analytics/AnalyticsContext";
import { LogCallPayload } from "@/features/leads/hooks/useLeadsStore";

export function useLeadData(user: User, isCopilotOpen: boolean) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { updateLead: baseUpdateLead, logCall: baseLogCall } = useLeadsStore();
  const { refreshDashboard } = useAnalytics();

  const logCall = useCallback(
    async (leadId: string, payload: LogCallPayload) => {
      await baseLogCall(leadId, payload);
      refreshDashboard();
    },
    [baseLogCall, refreshDashboard]
  );

  const updateLead = useCallback(
    async (leadId: string, patch: Partial<Lead>, options?: { suppressTimeline?: boolean }) => {
      await baseUpdateLead(leadId, patch, options);
      if (patch.status !== undefined) {
        refreshDashboard();
      }
    },
    [baseUpdateLead, refreshDashboard]
  );
  const { projects, isLoaded: projectsLoaded } = useProjectsStore();
  const { users } = useUsersStore();
  const { addNotification } = useNotificationsStore(user?.id);
  const { roles: customRoles } = useCustomRolesStore();
  const { canAssignLead } = useAuthorization();
  const { openTemplates, setTemplateContext } = useAppShell();

  const isManagerial = useCallback(
    (roleCode?: string) => {
      if (!roleCode || roleCode === user.role) {
        return canAssignLead();
      }
      return isManagerialUtil(roleCode, customRoles);
    },
    [canAssignLead, user.role, customRoles]
  );

  // Point read via repository — detail pages must not depend on a global leads list.
  const [fetchedLeadState, setFetchedLeadState] = useState<{
    requestId: string;
    lead: Lead | null;
  } | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    void (async () => {
      try {
        const { LeadsRepository } = await import(
          "@/shared/services/firebase/repositories"
        );
        const lead = await LeadsRepository.getById(id);
        if (cancelled) return;
        setFetchedLeadState({ requestId: id, lead });
      } catch {
        if (cancelled) return;
        setFetchedLeadState({ requestId: id, lead: null });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const activeLead = useMemo(() => {
    if (fetchedLeadState && fetchedLeadState.requestId === id) {
      return fetchedLeadState.lead ?? undefined;
    }
    return undefined;
  }, [fetchedLeadState, id]);

  const leadsLoaded = !id || fetchedLeadState?.requestId === id;

  // Copilot: preload timeline on host (drawer never queries Firestore).
  const { events: copilotTimelineEvents } = useTimelineEvents(
    isCopilotOpen && activeLead ? activeLead.id : null,
    50
  );

  const todayYmd = useMemo(() => getIstDateString(), []);

  const leadIntelligence = useMemo(() => {
    if (!activeLead) return null;
    return computeLeadIntelligence(activeLead, {
      todayYmd,
      isManagerial: isManagerial(user.role),
      peers: [{ id: activeLead.id, phone: activeLead.phone }],
    });
  }, [activeLead, todayYmd, user.role, isManagerial]);

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

  // Sync templates context
  useEffect(() => {
    if (activeLead && setTemplateContext) {
      setTemplateContext({
        clientName: activeLead.name || "",
        phone: activeLead.phone || "",
        projectName:
          activeLead.projectId && projects && projects[activeLead.projectId]
            ? projects[activeLead.projectId].name
            : "",
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

  const handleBackNavigation = useCallback(() => {
    if (isManagerial(user.role)) {
      navigate("/admin");
    } else {
      navigate("/");
    }
  }, [navigate, isManagerial, user.role]);

  return {
    id,
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
  };
}
