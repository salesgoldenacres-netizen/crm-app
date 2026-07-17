import { Activity } from "lucide-react";
import { User } from "@/shared/types";

interface WebhookSimulatorConsoleProps {
  simulatorPlatform: string;
  setSimulatorPlatform: (val: string) => void;
  simulatorForm: any;
  setSimulatorForm: (form: any) => void;
  users: User[];
  isManagerial: (role: string) => boolean;
  handleTriggerSimulation: () => void;
  simulatorLogs: string[];
  simulatedResult: any;
}

export default function WebhookSimulatorConsole({
  simulatorPlatform,
  setSimulatorPlatform,
  simulatorForm,
  setSimulatorForm,
  users,
  isManagerial,
  handleTriggerSimulation,
  simulatorLogs,
  simulatedResult,
}: WebhookSimulatorConsoleProps) {
  return (
    <div className="bg-theme-card rounded-xl shadow-sm border border-theme-border p-5 transition-colors animate-fadeIn">
      <h3 className="text-lg font-bold mb-4 flex items-center justify-between border-b dark:border-gray-700/50 pb-2 text-theme-text">
        <span className="flex items-center">
          <Activity className="w-5 h-5 mr-2 text-orange-500 auto-pulse" />
          Webhook Simulator &amp; Ingestion Test
        </span>
        <span className="text-[10px] bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 px-2.5 py-0.5 rounded-full font-bold">
          Simulator
        </span>
      </h3>
      <div className="flex border-b border-theme-border mb-4 bg-theme-surface/25">
        {["google", "meta", "ivr"].map((platform) => (
          <button
            key={platform}
            type="button"
            onClick={() => setSimulatorPlatform(platform)}
            className={`flex-1 py-2 text-center text-xs font-bold border-b-2 border-x-0 border-t-0 transition-all cursor-pointer bg-transparent ${
              simulatorPlatform === platform
                ? "border-indigo-600 text-indigo-650 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            {platform === "google" && "Google Ads Webhook"}
            {platform === "meta" && "Meta Lead Ads Webhook"}
            {platform === "ivr" && "Incoming IVR Call"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
        <div className="space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400">Simulation Data</h4>
          <div>
            <label className="block text-xs font-semibold text-theme-muted">Full Name</label>
            <input
              type="text"
              value={simulatorForm.name}
              onChange={(e) => setSimulatorForm({ ...simulatorForm, name: e.target.value })}
              className="mt-1 block w-full border-theme-border dark:bg-gray-900 dark:text-white rounded-md p-2 border text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-theme-muted">Phone</label>
            <input
              type="text"
              value={simulatorForm.phone}
              onChange={(e) => setSimulatorForm({ ...simulatorForm, phone: e.target.value })}
              className="mt-1 block w-full border-theme-border dark:bg-gray-900 dark:text-white rounded-md p-2 border text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-theme-muted">Email</label>
            <input
              type="email"
              value={simulatorForm.email}
              onChange={(e) => setSimulatorForm({ ...simulatorForm, email: e.target.value })}
              className="mt-1 block w-full border-theme-border dark:bg-gray-900 dark:text-white rounded-md p-2 border text-xs"
            />
          </div>
          {simulatorPlatform === "google" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-theme-muted">Campaign ID</label>
                <input
                  type="text"
                  value={simulatorForm.googleCampaignId}
                  onChange={(e) => setSimulatorForm({ ...simulatorForm, googleCampaignId: e.target.value })}
                  className="mt-1 block w-full border-theme-border dark:bg-gray-900 dark:text-white rounded-md p-2 border text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-theme-muted">
                  Google Ads Secret Key
                </label>
                <input
                  type="text"
                  value={simulatorForm.googleKey}
                  onChange={(e) => setSimulatorForm({ ...simulatorForm, googleKey: e.target.value })}
                  className="mt-1 block w-full border-theme-border dark:bg-gray-900 dark:text-white rounded-md p-2 border text-xs"
                />
              </div>
            </>
          )}
          {simulatorPlatform === "meta" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-theme-muted">
                  Leadgen ID (Facebook)
                </label>
                <input
                  type="text"
                  value={simulatorForm.metaLeadId}
                  onChange={(e) => setSimulatorForm({ ...simulatorForm, metaLeadId: e.target.value })}
                  className="mt-1 block w-full border-theme-border dark:bg-gray-900 dark:text-white rounded-md p-2 border text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-theme-muted">
                  Form ID (Facebook)
                </label>
                <input
                  type="text"
                  value={simulatorForm.metaFormId}
                  onChange={(e) => setSimulatorForm({ ...simulatorForm, metaFormId: e.target.value })}
                  className="mt-1 block w-full border-theme-border dark:bg-gray-900 dark:text-white rounded-md p-2 border text-xs"
                />
              </div>
            </>
          )}
          {simulatorPlatform === "ivr" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-theme-muted">
                  Target Telecaller Agent
                </label>
                <select
                  value={simulatorForm.ivrAgentId || ""}
                  onChange={(e) => setSimulatorForm({ ...simulatorForm, ivrAgentId: e.target.value })}
                  className="mt-1 block w-full border-theme-border dark:bg-gray-900 dark:text-white rounded-md p-2 border text-xs"
                >
                  <option value="">Unassigned</option>
                  {users
                    .filter((u) => !isManagerial(u.role))
                    .map((tc) => (
                      <option key={tc.id} value={tc.id}>
                        {tc.username} ({tc.role})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-theme-muted">
                  Virtual Inbound Number
                </label>
                <input
                  type="text"
                  value={simulatorForm.ivrVirtualNumber || ""}
                  onChange={(e) => setSimulatorForm({ ...simulatorForm, ivrVirtualNumber: e.target.value })}
                  placeholder="+918047092300"
                  className="mt-1 block w-full border-theme-border dark:bg-gray-900 dark:text-white rounded-md p-2 border text-xs"
                />
              </div>
            </>
          )}
          <button
            type="button"
            onClick={handleTriggerSimulation}
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-xs font-bold transition-colors shadow-sm cursor-pointer mt-4 border-0"
          >
            Simulate Webhook Ingest POST
          </button>
        </div>
        <div className="flex flex-col h-full space-y-4">
          <div className="flex-1 flex flex-col bg-gray-950 text-emerald-400 p-4 rounded-xl font-mono text-[10px] h-[220px] overflow-y-auto border border-gray-900 shadow-inner">
            <span className="text-gray-500">--- Simulation Console Logs ---</span>
            {simulatorLogs.map((entry, idx) => (
              <div key={idx} className="mt-1">
                <span className="text-gray-600">[{new Date().toLocaleTimeString()}]</span> {entry}
              </div>
            ))}
          </div>
          <div className="bg-theme-surface p-4 rounded-xl border border-theme-border h-[100px] overflow-y-auto">
            <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Generated Lead Result</span>
            {simulatedResult ? (
              <div className="text-xs font-semibold">
                <div className="text-indigo-650 dark:text-indigo-400">
                  {simulatedResult.name} ({simulatedResult.phone})
                </div>
                <div className="text-theme-muted mt-1">
                  Source:{" "}
                  <span className="font-bold uppercase text-[9px] bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 px-1 py-0.5 rounded dark:text-indigo-400">
                    {simulatedResult.notes?.split("Source:")?.[1]?.trim() || "Webhook"}
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-xs text-gray-400 font-medium">
                Run a simulation to generate a Firestore lead record.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
