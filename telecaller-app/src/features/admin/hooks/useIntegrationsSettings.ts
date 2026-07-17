import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/shared/services/firebase";
import { User, Lead, AuditLog } from "@/shared/types";
import { useToast } from "@/shared/components/Toast";

interface UseIntegrationsSettingsProps {
  user: User;
  users: User[];
  leads: Lead[];
  addLead: (leadData: Partial<Lead> & { name: string; phone: string }) => Promise<Lead | { isDuplicate: boolean }>;
  logAuditEvent: (eventData: Partial<AuditLog>) => Promise<void>;
  isManagerial: (role: string) => boolean;
  simulateIncomingIvrCall: (agentId: string, payload: { callerPhone: string; callerName?: string; leadId?: string }) => Promise<void>;
}

export function useIntegrationsSettings({
  user,
  users,
  leads,
  addLead,
  logAuditEvent,
  isManagerial,
  simulateIncomingIvrCall,
}: UseIntegrationsSettingsProps) {
  const { toast } = useToast();
  const [integrationSettings, setIntegrationSettings] = useState({
    googleWebhookKey: "",
    metaVerifyToken: "",
    metaAccessToken: "",
    apiWebhookKey: "",
    twilioAccountSid: "",
    twilioAuthToken: "",
    twilioPhoneNumber: "",
    whatsAppPhoneNumberId: "",
    whatsAppAccessToken: "",
    evolutionEnabled: false,
    evolutionBaseUrl: "",
    evolutionApiKey: "",
    evolutionInstanceName: "",
    evolutionInstanceToken: "",
    evolutionWebhookSecret: "",
    messagingProviderId: "evolution",
    messagingConnectionStatus: "not_configured",
    messagingWebhookHealth: "unknown",
    messagingLastWebhookAt: "",
    evolutionConnectionStatus: "not_configured",
    evolutionQrStatus: "n/a",
    evolutionConnectedPhone: "",
    evolutionInstanceStatus: "not_configured",
    evolutionLastSyncAt: "",
    evolutionLastError: "",
    evolutionLastWebhookAt: "",
    evolutionWebhookHealth: "unknown",
    enableIvr: false,
    ivrProvider: "mock",
    ivrVirtualNumber: "",
    exotelSid: "",
    exotelToken: "",
    exotelVirtualNumber: "",
    ivrCustomOutboundUrl: "",
    ivrCustomMethod: "POST",
    ivrCustomAuthHeader: "",
    ivrCustomHeaders: '{\n  "Content-Type": "application/json"\n}',
    ivrCustomPayload:
      '{\n  "from": "{{agentPhone}}",\n  "to": "{{clientPhone}}",\n  "callerId": "{{virtualNumber}}"\n}',
    duplicateHandlingRule: "merge",
  });

  const [simulatorPlatform, setSimulatorPlatform] = useState("google");
  const [simulatorForm, setSimulatorForm] = useState({
    name: "Amit Patel",
    phone: "9876543210",
    email: "amit.patel@outlook.com",
    googleCampaignId: "123456789",
    googleKey: "",
    metaLeadId: "543210987654",
    metaFormId: "9876543210",
    ivrAgentId: "",
    ivrVirtualNumber: "+918047092300",
  });
  const [simulatorLogs, setSimulatorLogs] = useState<string[]>([]);
  const [simulatedResult, setSimulatedResult] = useState<Partial<Lead> | { isDuplicate: boolean } | null>(null);
  interface RoutingSettings {
    enableRoundRobin: boolean;
    activeAgents: string[];
  }
  const [routingSettings, setRoutingSettings] = useState<RoutingSettings>({
    enableRoundRobin: true,
    activeAgents: [],
  });
  const [ivrJsonErrors, setIvrJsonErrors] = useState<Record<string, string | null>>({
    headers: null,
    payload: null,
  });

  // Remote config local state
  const [remoteSettings, setRemoteSettings] = useState({
    announcement_text: "",
    show_announcement: false,
    default_rate_per_sqft: 3500,
    follow_up_reminder_days: 1,
  });

  // Sync Remote Config settings
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", "remoteConfig"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRemoteSettings({
          announcement_text: data.announcement_text || "",
          show_announcement: !!data.show_announcement,
          default_rate_per_sqft: parseInt(data.default_rate_per_sqft) || 3500,
          follow_up_reminder_days: parseInt(data.follow_up_reminder_days) || 1,
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync integrations settings
  useEffect(() => {
    let active = true;
    const loadSettings = async () => {
      try {
        const docRef = doc(db, "settings", "integrations");
        const docSnap = await getDoc(docRef);

        const secretRef = doc(db, "settings", "integrations_secrets");
        const secretSnap = await getDoc(secretRef);

        if (!active) return;

        let combined = {};
        if (docSnap.exists()) {
          combined = { ...combined, ...docSnap.data() };
        }
        if (secretSnap.exists()) {
          combined = { ...combined, ...secretSnap.data() };
        }
        setIntegrationSettings((prev) => ({ ...prev, ...combined }));

        const routingRef = doc(db, "settings", "routing");
        const routingSnap = await getDoc(routingRef);
        if (routingSnap.exists() && active) {
          setRoutingSettings(routingSnap.data() as RoutingSettings);
        }
      } catch (err) {
        console.error("Error loading settings: ", err);
      }
    };
    loadSettings();
    return () => {
      active = false;
    };
  }, []);

  const handleHeadersChange = (val: string) => {
    setIntegrationSettings((prev) => ({ ...prev, ivrCustomHeaders: val }));
    try {
      if (val.trim()) {
        JSON.parse(val);
      }
      setIvrJsonErrors((prev) => ({ ...prev, headers: null }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setIvrJsonErrors((prev) => ({ ...prev, headers: msg }));
    }
  };

  const handlePayloadChange = (val: string) => {
    setIntegrationSettings((prev) => ({ ...prev, ivrCustomPayload: val }));
    try {
      if (val.trim()) {
        JSON.parse(val);
      }
      setIvrJsonErrors((prev) => ({ ...prev, payload: null }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setIvrJsonErrors((prev) => ({ ...prev, payload: msg }));
    }
  };

  const handleSaveIntegrationSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const publicFields = {
        enableIvr: integrationSettings.enableIvr ?? false,
        ivrProvider: integrationSettings.ivrProvider ?? "mock",
        ivrVirtualNumber: integrationSettings.ivrVirtualNumber ?? "",
        duplicateHandlingRule: integrationSettings.duplicateHandlingRule ?? "merge",
        messagingProviderId: integrationSettings.messagingProviderId ?? "evolution",
        messagingEnabled: !!integrationSettings.evolutionEnabled,
        messagingBaseUrl: integrationSettings.evolutionBaseUrl ?? "",
        messagingInstanceName: integrationSettings.evolutionInstanceName ?? "",
        evolutionEnabled: !!integrationSettings.evolutionEnabled,
        evolutionBaseUrl: integrationSettings.evolutionBaseUrl ?? "",
        evolutionInstanceName: integrationSettings.evolutionInstanceName ?? "",
        evolutionConnectionStatus:
          integrationSettings.evolutionConnectionStatus ?? "not_configured",
        evolutionQrStatus: integrationSettings.evolutionQrStatus ?? "n/a",
        evolutionConnectedPhone: integrationSettings.evolutionConnectedPhone ?? "",
        evolutionInstanceStatus:
          integrationSettings.evolutionInstanceStatus ?? "not_configured",
        evolutionLastSyncAt: integrationSettings.evolutionLastSyncAt ?? "",
        evolutionLastError: integrationSettings.evolutionLastError ?? "",
        evolutionLastWebhookAt: integrationSettings.evolutionLastWebhookAt ?? "",
        evolutionWebhookHealth: integrationSettings.evolutionWebhookHealth ?? "unknown",
        messagingConnectionStatus:
          integrationSettings.messagingConnectionStatus ||
          integrationSettings.evolutionConnectionStatus ||
          "not_configured",
        messagingWebhookHealth:
          integrationSettings.messagingWebhookHealth ||
          integrationSettings.evolutionWebhookHealth ||
          "unknown",
        messagingLastWebhookAt:
          integrationSettings.messagingLastWebhookAt ||
          integrationSettings.evolutionLastWebhookAt ||
          "",
      };

      const secretFields = {
        googleWebhookKey: integrationSettings.googleWebhookKey ?? "",
        metaVerifyToken: integrationSettings.metaVerifyToken ?? "",
        metaAccessToken: integrationSettings.metaAccessToken ?? "",
        apiWebhookKey: integrationSettings.apiWebhookKey ?? "",
        twilioAccountSid: integrationSettings.twilioAccountSid ?? "",
        twilioAuthToken: integrationSettings.twilioAuthToken ?? "",
        twilioPhoneNumber: integrationSettings.twilioPhoneNumber ?? "",
        whatsAppAccessToken: integrationSettings.whatsAppAccessToken ?? "",
        whatsAppPhoneNumberId: integrationSettings.whatsAppPhoneNumberId ?? "",
        evolutionApiKey: integrationSettings.evolutionApiKey ?? "",
        evolutionInstanceToken: integrationSettings.evolutionInstanceToken ?? "",
        evolutionWebhookSecret: integrationSettings.evolutionWebhookSecret ?? "",
      };

      await setDoc(doc(db, "settings", "integrations"), publicFields, {
        merge: true,
      });
      await setDoc(doc(db, "settings", "integrations_secrets"), secretFields, {
        merge: true,
      });

      const routingRef = doc(db, "settings", "routing");
      await setDoc(routingRef, routingSettings);

      await logAuditEvent({
        action: "Update Integration Settings",
        details: "Updated API & Voice integration configurations.",
        user: user.username,
      });
      toast("Settings and routing configurations saved successfully!", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Error saving settings: ", err);
      toast("Failed to save settings: " + msg, "error");
    }
  };

  const handleSaveRemoteConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(
        doc(db, "settings", "remoteConfig"),
        {
          ...remoteSettings,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      await logAuditEvent({
        action: "Update Remote Config Settings",
        details: JSON.stringify(remoteSettings),
        user: user.username,
      });
      toast(
        "Remote Configuration saved successfully! Live devices will receive the new configuration.",
        "success",
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Failed to save Remote Config settings:", err);
      toast("Failed to save Remote Config settings: " + msg, "error");
    }
  };

  const handleTriggerSimulation = async () => {
    setSimulatorLogs([]);
    setSimulatedResult(null);

    const log = (msg: string) => setSimulatorLogs((prev) => [...prev, msg]);

    log(`POST Webhook request initiated to /api/webhooks/leads...`);
    await new Promise((r) => setTimeout(r, 400));

    let assignedTo = "";
    let assignedToName = "Unassigned";
    if (routingSettings.enableRoundRobin) {
      const telecallers = users.filter((u) => !isManagerial(u.role));
      const pool =
        routingSettings.activeAgents && routingSettings.activeAgents.length > 0
          ? telecallers.filter((tc) => routingSettings.activeAgents.includes(tc.id))
          : telecallers;

      if (pool.length > 0) {
        const lastLead = leads[0];
        const lastAgentId = lastLead ? lastLead.assignedTo : "";
        const lastIndex = pool.findIndex((tc) => tc.id === lastAgentId);
        const nextIndex = (lastIndex + 1) % pool.length;
        const targetAgent = pool[nextIndex];
        assignedTo = targetAgent.id;
        assignedToName = targetAgent.username;
        log(`[Routing] Round-robin active: assigning lead to telecaller "${assignedToName}"`);
      } else {
        log(`[Routing] No active telecallers in routing pool. Lead left unassigned.`);
      }
    }

    if (simulatorPlatform === "ivr") {
      log(`POST Webhook request initiated to /api/webhooks/ivr...`);
      await new Promise((r) => setTimeout(r, 400));
      log(`Incoming voice call payload detected from Caller Phone: "${simulatorForm.phone}"`);

      if (!simulatorForm.ivrAgentId) {
        log(`[ERROR] Verification failed: Target Telecaller Agent must be selected to route the call.`);
        return;
      }

      log(`Searching leads collection for Caller Phone: "${simulatorForm.phone}"...`);
      await new Promise((r) => setTimeout(r, 400));

      const matchedLead = leads.find((l) => {
        const cleanLPhone = l.phone.replace(/[^0-9]/g, "");
        const cleanSPhone = simulatorForm.phone.replace(/[^0-9]/g, "");
        return cleanLPhone.includes(cleanSPhone) || cleanSPhone.includes(cleanLPhone);
      });

      let callerName = simulatorForm.name;
      let leadId = "";
      if (matchedLead) {
        callerName = matchedLead.name;
        leadId = matchedLead.id;
        log(`[MATCH FOUND] Caller matches Lead ID: "${leadId}" (${callerName})`);
      } else {
        log(`[NO MATCH] No existing lead matches phone "${simulatorForm.phone}". Call registered as new caller.`);
      }

      log(`Routing call via IVR system to Telecaller ID: "${simulatorForm.ivrAgentId}"...`);
      await new Promise((r) => setTimeout(r, 500));

      try {
        await simulateIncomingIvrCall(simulatorForm.ivrAgentId, {
          callerPhone: simulatorForm.phone,
          callerName,
          leadId,
        });
        log(`[SUCCESS] Inbound IVR call triggered! Ringing banner activated on Telecaller screen.`);
        setSimulatedResult({
          name: callerName,
          phone: simulatorForm.phone,
          notes: `IVR Webhook Ingest. Routed to Agent ID: ${simulatorForm.ivrAgentId}. Source: IVR_Inbound_Call`,
        });
        await logAuditEvent({
          action: "Ingest Inbound Call (IVR)",
          details: `Caller: ${callerName}, Phone: ${simulatorForm.phone}, Routed to: ${simulatorForm.ivrAgentId}`,
          user: "ivr_system_webhook",
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        log(`[ERROR] Failed to initiate IVR simulation: ${msg}`);
      }
      return;
    }

    if (simulatorPlatform === "google") {
      log(`Payload received from Google Ads Lead Form webhook.`);
      log(`Verifying API authentication key...`);
      await new Promise((r) => setTimeout(r, 300));

      if (simulatorForm.googleKey !== integrationSettings.googleWebhookKey) {
        log(
          `[ERROR] Verification failed: Invalid Google Webhook Key: "${simulatorForm.googleKey}". Expected: "${integrationSettings.googleWebhookKey}"`
        );
        return;
      }
      log(`Authentication success. Webhook key verified.`);
      log(`Parsing Google Ads columns data...`);
      log(`Found field FULL_NAME = "${simulatorForm.name}"`);
      log(`Found field PHONE_NUMBER = "${simulatorForm.phone}"`);
      log(`Found field EMAIL_ADDRESS = "${simulatorForm.email}"`);

      const newLeadObj = {
        name: simulatorForm.name,
        phone: simulatorForm.phone,
        email: simulatorForm.email,
        notes: `Google Ads Webhook Ingest. Campaign ID: ${simulatorForm.googleCampaignId}. Source: Google_Ads_Lead_Form`,
        projectId: "",
        plotId: "",
        assignedTo,
        assignedToName,
        status: "new",
        priority: "warm",
      };

      log(`Writing new customer record to Firestore collection "leads"...`);
      await new Promise((r) => setTimeout(r, 500));

      try {
        const addedLead = await addLead(newLeadObj);
        log(`[SUCCESS] Lead ingested successfully! Firestore Document ID: ${'id' in addedLead ? addedLead.id : "Unknown"}`);
        setSimulatedResult(addedLead);
        await logAuditEvent({
          action: "Ingest Lead (Google ads)",
          details: `Customer: ${newLeadObj.name}, Phone: ${newLeadObj.phone}, Assigned to: ${newLeadObj.assignedToName}`,
          user: "google_ads_webhook",
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        log(`[ERROR] Failed to save lead record: ${msg}`);
      }
    } else {
      log(`Payload received from Meta Lead Ads webhook.`);
      log(`Verifying webhook signature...`);
      await new Promise((r) => setTimeout(r, 300));

      log(`Incoming change payload detected: Leadgen ID: "${simulatorForm.metaLeadId}", Form ID: "${simulatorForm.metaFormId}"`);
      log(`Calling Meta Graph API: GET https://graph.facebook.com/v18.0/${simulatorForm.metaLeadId}...`);
      await new Promise((r) => setTimeout(r, 500));

      if (!integrationSettings.metaAccessToken) {
        log(`[ERROR] Failed: Missing Meta Page Access Token. Please configure it in Settings first.`);
        return;
      }

      log(`Graph API authorization success using configured Access Token.`);
      log(`Meta Graph API response received. Parsing customer form field data...`);
      log(`Found form field "full_name" = "${simulatorForm.name}"`);
      log(`Found form field "phone_number" = "${simulatorForm.phone}"`);
      log(`Found form field "email" = "${simulatorForm.email}"`);

      const newLeadObj = {
        name: simulatorForm.name,
        phone: simulatorForm.phone,
        email: simulatorForm.email,
        notes: `Meta Webhook Ingest. Leadgen ID: ${simulatorForm.metaLeadId}. Form ID: ${simulatorForm.metaFormId}. Source: Meta_Lead_Ads`,
        projectId: "",
        plotId: "",
        assignedTo,
        assignedToName,
        status: "new",
        priority: "warm",
      };

      log(`Writing new customer record to Firestore collection "leads"...`);
      await new Promise((r) => setTimeout(r, 500));

      try {
        const addedLead = await addLead(newLeadObj);
        log(`[SUCCESS] Lead ingested successfully! Firestore Document ID: ${'id' in addedLead ? addedLead.id : "Unknown"}`);
        setSimulatedResult(addedLead);
        await logAuditEvent({
          action: "Ingest Lead (Meta Ads)",
          details: `Customer: ${newLeadObj.name}, Phone: ${newLeadObj.phone}, Assigned to: ${newLeadObj.assignedToName}`,
          user: "meta_ads_webhook",
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        log(`[ERROR] Failed to save lead record: ${msg}`);
      }
    }
  };

  return {
    integrationSettings,
    setIntegrationSettings,
    simulatorPlatform,
    setSimulatorPlatform,
    simulatorForm,
    setSimulatorForm,
    simulatorLogs,
    simulatedResult,
    routingSettings,
    setRoutingSettings,
    ivrJsonErrors,
    remoteSettings,
    setRemoteSettings,
    handleHeadersChange,
    handlePayloadChange,
    handleSaveIntegrationSettings,
    handleSaveRemoteConfig,
    handleTriggerSimulation,
  };
}
