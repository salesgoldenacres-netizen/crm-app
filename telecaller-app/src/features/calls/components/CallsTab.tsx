import { useState, useEffect, useRef, useMemo } from "react";
import { MessageCircle, PhoneCall } from "lucide-react";

import { useLeadsStore } from "@/features/leads/hooks/useLeadsStore";
import { useNotificationsStore } from "@/features/dashboard/hooks/useNotificationsStore";
import { useProjectsStore } from "@/features/plots/hooks/useProjectsStore";
import { useAppShell } from "@/shared/layouts/AppShell";
import { useCustomRolesStore } from "@/features/admin/hooks/adminStores";
import { isManagerial } from "@/shared/utils/roleUtils";
// safeFormatDateTime removed – not used in this file

import { usePowerDialer } from "@/features/calls/hooks/usePowerDialer";
import PowerDialerWidget from "@/features/calls/components/PowerDialerWidget";
import WhatsAppInboxView from "@/features/calls/components/WhatsAppInboxView";
import CallHistoryView from "@/features/calls/components/CallHistoryView";
import MessageContentRenderer from "@/features/calls/components/MessageContentRenderer";

import { Lead, User, CallLog } from "@/shared/types";

interface CallsTabProps {
  user: User;
  callsSubTab: string;
  setCallsSubTab: (tab: string) => void;
  simulatedWaLeadId: string;
  setSimulatedWaLeadId: (id: string) => void;
  onOpenCallLogModal: (lead: Lead) => void;
}

interface AudioNodes {
  ctx: AudioContext;
  osc: OscillatorNode;
  gain: GainNode;
  modulation: number;
}

export default function CallsTab({
  user,
  callsSubTab,
  setCallsSubTab,
  simulatedWaLeadId,
  setSimulatedWaLeadId,
  onOpenCallLogModal,
}: CallsTabProps) {
  const { leads, logCall } = useLeadsStore();
  const { notifications, addNotification } = useNotificationsStore();
  const { projects } = useProjectsStore();
  const { startCall, activeDialerLead, isCallLogModalOpen } = useAppShell();
  const { roles: customRoles } = useCustomRolesStore();

  // WhatsApp Voice Note Playback State
  const [playingVoiceNoteId, setPlayingVoiceNoteId] = useState<string | null>(null);
  const [voiceNoteProgress, setVoiceNoteProgress] = useState(0);
  const voiceNoteIntervalRef = useRef<number | null>(null);
  const voiceNoteAudioNodesRef = useRef<AudioNodes | null>(null);

  const [callHistorySearchQuery, setCallHistorySearchQuery] = useState("");

  const {
    isPowerDialerActive,
    powerDialerQueue,
    powerDialerIndex,
    powerDialerCountdown,
    isCountdownPaused,
    setIsCountdownPaused,
    handleSkipLead,
    handleQuitCampaign,
  } = usePowerDialer({
    leads,
    startCall,
    activeDialerLead,
    isCallLogModalOpen,
  });

  const playVoiceHum = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      const modulation = setInterval(() => {
        if (ctx.state === "closed") {
          clearInterval(modulation);
          return;
        }
        const randomFreq = 180 + Math.random() * 120;
        osc.frequency.setValueAtTime(randomFreq, ctx.currentTime);
      }, 150);

      voiceNoteAudioNodesRef.current = { ctx, osc, gain, modulation };
    } catch (e) {
      console.error("Web Audio API not supported or error: ", e);
    }
  };

  const stopVoiceHum = () => {
    if (voiceNoteAudioNodesRef.current) {
      const { ctx, osc, modulation } = voiceNoteAudioNodesRef.current;
      clearInterval(modulation);
      try {
        osc.stop();
        ctx.close();
      } catch (error) {
        console.debug("Oscillator stop/close ignored:", error);
      }
      voiceNoteAudioNodesRef.current = null;
    }
  };

  const togglePlayVoiceNote = (noteId: string) => {
    if (playingVoiceNoteId === noteId) {
      if (voiceNoteIntervalRef.current) clearInterval(voiceNoteIntervalRef.current);
      stopVoiceHum();
      setPlayingVoiceNoteId(null);
    } else {
      if (voiceNoteIntervalRef.current) clearInterval(voiceNoteIntervalRef.current);
      stopVoiceHum();

      setPlayingVoiceNoteId(noteId);
      setVoiceNoteProgress(0);
      playVoiceHum();

      voiceNoteIntervalRef.current = setInterval(() => {
        setVoiceNoteProgress((prev) => {
          if (prev >= 100) {
            if (voiceNoteIntervalRef.current) clearInterval(voiceNoteIntervalRef.current);
            stopVoiceHum();
            setPlayingVoiceNoteId(null);
            return 0;
          }
          return prev + 4;
        });
      }, 300);
    }
  };

  useEffect(() => {
    return () => {
      if (voiceNoteIntervalRef.current) clearInterval(voiceNoteIntervalRef.current);
      stopVoiceHum();
    };
  }, []);

  // Memoized pending callbacks list
  const pendingCallbacks = useMemo(() => {
    const pending: { lead: Lead; missedCall: CallLog }[] = [];
    const isMgr = isManagerial(user.role, customRoles);
    leads.forEach((lead) => {
      if (!isMgr && lead.assignedTo !== user.id) return;

      const logs = lead.callLogs || [];
      if (logs.length === 0) return;

      let latestMissed: CallLog | null = null;
      let latestConnectedOutbound: CallLog | null = null;

      for (const log of logs) {
        const noteLower = (log.note || "").toLowerCase();
        const isWhatsApp =
          noteLower.includes("[whatsapp") ||
          noteLower.includes("whatsapp sent") ||
          noteLower.includes("whatsapp received");
        if (isWhatsApp) continue;

        const logDate = new Date(log.date);

        const isMissed =
          (log.agent === "Customer" || log.agent === "system" || log.agent === "System (Auto)") &&
          (noteLower.includes("missed") ||
            noteLower.includes("unanswered") ||
            noteLower.includes("no answer") ||
            noteLower.includes("declined"));

        const isConnectedOutbound =
          log.agent !== "Customer" &&
          log.agent !== "system" &&
          log.agent !== "System (Auto)" &&
          (noteLower.includes("disposition: connected") ||
            noteLower.includes("connected") ||
            noteLower.includes("duration:"));

        if (isMissed) {
          if (!latestMissed || logDate > new Date(latestMissed.date)) {
            latestMissed = log;
          }
        }

        if (isConnectedOutbound) {
          if (!latestConnectedOutbound || logDate > new Date(latestConnectedOutbound.date)) {
            latestConnectedOutbound = log;
          }
        }
      }

      if (latestMissed) {
        const hasConnectedOutboundAfter =
          latestConnectedOutbound && new Date(latestConnectedOutbound.date) > new Date(latestMissed.date);
        if (!hasConnectedOutboundAfter) {
          pending.push({
            lead,
            missedCall: latestMissed,
          });
        }
      }
    });

    pending.sort((a, b) => new Date(b.missedCall.date).getTime() - new Date(a.missedCall.date).getTime());
    return pending;
  }, [leads, user.id, user.role, customRoles]);

  // Memoized chat threads (active conversations list)
  const chatThreads = useMemo(() => {
    const isMgr = isManagerial(user.role, customRoles);
    return leads
      .filter((l) => isMgr || l.assignedTo === user.id)
      .map((lead) => {
        const waLogs = (lead.callLogs || []).filter(
          (log) => log.note && (log.note.includes("[WhatsApp") || log.note.includes("[WhatsApp Sent]"))
        );
        const lastWaLog = waLogs[waLogs.length - 1];
        return {
          lead,
          lastWaLog,
        };
      });
  }, [leads, user.id, user.role, customRoles]);

  // Memoized call history logs and summary stats
  const callHistoryStats = useMemo(() => {
    interface CallHistoryItem extends CallLog {
      leadId: string;
      leadName: string;
      leadPhone: string;
      projectId?: string;
      leadObj: Lead;
    }
    const allCallLogs: CallHistoryItem[] = [];
    const isMgr = isManagerial(user.role, customRoles);
    leads.forEach((lead) => {
      if (lead.callLogs) {
        lead.callLogs.forEach((log) => {
          if (!isMgr && lead.assignedTo !== user.id && log.agent !== user.username) {
            return;
          }
          allCallLogs.push({
            ...log,
            leadId: lead.id,
            leadName: lead.name,
            leadPhone: lead.phone,
            projectId: lead.projectId,
            leadObj: lead,
          });
        });
      }
    });

    allCallLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let totalOutbound = 0;
    let connectedCount = 0;
    let rnrCount = 0;
    let busyCount = 0;
    let switchedOffCount = 0;
    let missedCount = 0;

    allCallLogs.forEach((log) => {
      const noteLower = (log.note || "").toLowerCase();
      const isWhatsApp =
        noteLower.includes("[whatsapp") ||
        noteLower.includes("whatsapp sent") ||
        noteLower.includes("whatsapp received");
      if (isWhatsApp) return;

      if (log.agent !== "Customer" && log.agent !== "system" && log.agent !== "System (Auto)") {
        const isCall =
          noteLower.includes("disposition:") || noteLower.includes("call log") || noteLower.includes("duration:");
        if (isCall) {
          totalOutbound++;
          if (noteLower.includes("disposition: connected") || noteLower.includes("connected")) {
            connectedCount++;
          } else if (
            noteLower.includes("disposition: ringing/unanswered") ||
            noteLower.includes("ringing") ||
            noteLower.includes("no answer") ||
            noteLower.includes("rnr")
          ) {
            rnrCount++;
          } else if (noteLower.includes("disposition: busy") || noteLower.includes("busy")) {
            busyCount++;
          } else if (noteLower.includes("disposition: switched off") || noteLower.includes("switched off")) {
            switchedOffCount++;
          } else {
            connectedCount++;
          }
        }
      } else if (log.agent === "system" || log.agent === "System (Auto)" || log.agent === "Customer") {
        if (
          noteLower.includes("missed") ||
          noteLower.includes("unanswered") ||
          noteLower.includes("no answer") ||
          noteLower.includes("declined")
        ) {
          missedCount++;
        }
      }
    });

    // Fallback scan of notifications for missed calls
    notifications.forEach((n) => {
      const msgLower = (n.message || "").toLowerCase();
      if (msgLower.includes("missed") || msgLower.includes("declined") || msgLower.includes("unanswered")) {
        missedCount++;
      }
    });

    return {
      allCallLogs,
      totalOutbound,
      connectedCount,
      rnrCount,
      busyCount,
      switchedOffCount,
      missedCount,
    };
  }, [leads, notifications, user.id, user.username, user.role, customRoles]);

  // Memoized search-filtered call history log results
  const filteredLogs = useMemo(() => {
    const { allCallLogs } = callHistoryStats;
    if (!callHistorySearchQuery.trim()) return allCallLogs;
    const q = callHistorySearchQuery.toLowerCase();
    return allCallLogs.filter((log) => {
      return (
        (log.note && log.note.toLowerCase().includes(q)) ||
        (log.agent && log.agent.toLowerCase().includes(q)) ||
        (log.leadName && log.leadName.toLowerCase().includes(q)) ||
        (log.leadPhone && log.leadPhone.toLowerCase().includes(q)) ||
        (log.status && log.status.toLowerCase().includes(q))
      );
    });
  }, [callHistoryStats, callHistorySearchQuery]);

  const renderMessageContent = (note: string, isMe: boolean, noteId: string) => {
    return (
      <MessageContentRenderer
        note={note}
        isMe={isMe}
        noteId={noteId}
        playingVoiceNoteId={playingVoiceNoteId}
        voiceNoteProgress={voiceNoteProgress}
        togglePlayVoiceNote={togglePlayVoiceNote}
      />
    );
  };

  return (
    <div className="space-y-6">
      <PowerDialerWidget
        isPowerDialerActive={isPowerDialerActive}
        powerDialerQueue={powerDialerQueue}
        powerDialerIndex={powerDialerIndex}
        powerDialerCountdown={powerDialerCountdown}
        isCountdownPaused={isCountdownPaused}
        setIsCountdownPaused={setIsCountdownPaused}
        handleSkipLead={handleSkipLead}
        handleQuitCampaign={handleQuitCampaign}
        activeDialerLead={activeDialerLead}
        isCallLogModalOpen={isCallLogModalOpen}
        leads={leads}
        projects={projects}
      />

      {/* Sub-tabs header for mobile screen sizes */}
      <div className="border-b border-theme-border pb-1.5 flex justify-between items-center md:hidden">
        <div className="flex space-x-6 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setCallsSubTab("whatsapp")}
            className={`whitespace-nowrap pb-2 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 cursor-pointer ${
              callsSubTab === "whatsapp"
                ? "border-theme-accent text-theme-accent"
                : "border-transparent text-theme-muted hover:text-theme-text"
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp Inbox</span>
          </button>
          <button
            onClick={() => setCallsSubTab("history")}
            className={`whitespace-nowrap pb-2 text-xs font-bold transition-all border-b-2 flex items-center space-x-1.5 cursor-pointer ${
              callsSubTab === "history"
                ? "border-theme-accent text-theme-accent"
                : "border-transparent text-theme-muted hover:text-theme-text"
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call History</span>
          </button>
        </div>
      </div>

      {callsSubTab === "whatsapp" && (
        <WhatsAppInboxView
          user={user}
          leads={leads}
          projects={projects}
          chatThreads={chatThreads}
          simulatedWaLeadId={simulatedWaLeadId}
          setSimulatedWaLeadId={setSimulatedWaLeadId}
          logCall={logCall}
          addNotification={addNotification}
        />
      )}

      {callsSubTab === "history" && (
        <CallHistoryView
          user={user}
          leads={leads}
          projects={projects}
          callHistoryStats={callHistoryStats}
          filteredLogs={filteredLogs}
          pendingCallbacks={pendingCallbacks}
          callHistorySearchQuery={callHistorySearchQuery}
          setCallHistorySearchQuery={setCallHistorySearchQuery}
          startCall={startCall}
          onOpenCallLogModal={onOpenCallLogModal}
          renderMessageContent={renderMessageContent}
        />
      )}
    </div>
  );
}
