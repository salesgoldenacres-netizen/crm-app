import { Activity } from "lucide-react";
import { User } from "@/shared/types";
import { Card, CardBody, CardHeader } from "@/shared/components/ui/Card";
import Badge from "@/shared/components/ui/Badge";
import Button from "@/shared/components/ui/Button";
import { FIELD_CONTROL_CLASS, FIELD_LABEL_CLASS } from "@/shared/components/ui/formField";

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
    <Card className="animate-fadeIn">
      <CardHeader>
        <h3 className="type-card-title flex items-center gap-2 text-theme-text">
          <Activity className="w-5 h-5 text-theme-warning" aria-hidden="true" />
          Webhook Simulator &amp; Ingestion Test
        </h3>
        <Badge variant="warning">Simulator</Badge>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="flex border-b border-theme-border bg-theme-surface/40 rounded-t-theme">
          {["google", "meta", "ivr"].map((platform) => (
            <button
              key={platform}
              type="button"
              onClick={() => setSimulatorPlatform(platform)}
              className={`flex-1 py-2.5 min-h-11 text-center text-xs font-semibold border-b-2 border-x-0 border-t-0 transition-colors cursor-pointer bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
                simulatorPlatform === platform
                  ? "border-theme-accent text-theme-accent"
                  : "border-transparent text-theme-muted hover:text-theme-text"
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
            <h4 className="font-semibold text-xs uppercase tracking-wider text-theme-muted">
              Simulation Data
            </h4>
            <div>
              <label className={FIELD_LABEL_CLASS}>Full Name</label>
              <input
                type="text"
                value={simulatorForm.name}
                onChange={(e) =>
                  setSimulatorForm({ ...simulatorForm, name: e.target.value })
                }
                className={FIELD_CONTROL_CLASS}
              />
            </div>
            <div>
              <label className={FIELD_LABEL_CLASS}>Phone</label>
              <input
                type="text"
                value={simulatorForm.phone}
                onChange={(e) =>
                  setSimulatorForm({ ...simulatorForm, phone: e.target.value })
                }
                className={FIELD_CONTROL_CLASS}
              />
            </div>
            <div>
              <label className={FIELD_LABEL_CLASS}>Email</label>
              <input
                type="email"
                value={simulatorForm.email}
                onChange={(e) =>
                  setSimulatorForm({ ...simulatorForm, email: e.target.value })
                }
                className={FIELD_CONTROL_CLASS}
              />
            </div>
            {simulatorPlatform === "google" && (
              <>
                <div>
                  <label className={FIELD_LABEL_CLASS}>Campaign ID</label>
                  <input
                    type="text"
                    value={simulatorForm.googleCampaignId}
                    onChange={(e) =>
                      setSimulatorForm({
                        ...simulatorForm,
                        googleCampaignId: e.target.value,
                      })
                    }
                    className={FIELD_CONTROL_CLASS}
                  />
                </div>
                <div>
                  <label className={FIELD_LABEL_CLASS}>
                    Google Ads Secret Key
                  </label>
                  <input
                    type="text"
                    value={simulatorForm.googleKey}
                    onChange={(e) =>
                      setSimulatorForm({
                        ...simulatorForm,
                        googleKey: e.target.value,
                      })
                    }
                    className={FIELD_CONTROL_CLASS}
                  />
                </div>
              </>
            )}
            {simulatorPlatform === "meta" && (
              <>
                <div>
                  <label className={FIELD_LABEL_CLASS}>
                    Leadgen ID (Facebook)
                  </label>
                  <input
                    type="text"
                    value={simulatorForm.metaLeadId}
                    onChange={(e) =>
                      setSimulatorForm({
                        ...simulatorForm,
                        metaLeadId: e.target.value,
                      })
                    }
                    className={FIELD_CONTROL_CLASS}
                  />
                </div>
                <div>
                  <label className={FIELD_LABEL_CLASS}>Form ID (Facebook)</label>
                  <input
                    type="text"
                    value={simulatorForm.metaFormId}
                    onChange={(e) =>
                      setSimulatorForm({
                        ...simulatorForm,
                        metaFormId: e.target.value,
                      })
                    }
                    className={FIELD_CONTROL_CLASS}
                  />
                </div>
              </>
            )}
            {simulatorPlatform === "ivr" && (
              <>
                <div>
                  <label className={FIELD_LABEL_CLASS}>
                    Target Telecaller Agent
                  </label>
                  <select
                    value={simulatorForm.ivrAgentId || ""}
                    onChange={(e) =>
                      setSimulatorForm({
                        ...simulatorForm,
                        ivrAgentId: e.target.value,
                      })
                    }
                    className={FIELD_CONTROL_CLASS}
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
                  <label className={FIELD_LABEL_CLASS}>
                    Virtual Inbound Number
                  </label>
                  <input
                    type="text"
                    value={simulatorForm.ivrVirtualNumber || ""}
                    onChange={(e) =>
                      setSimulatorForm({
                        ...simulatorForm,
                        ivrVirtualNumber: e.target.value,
                      })
                    }
                    placeholder="+918047092300"
                    className={FIELD_CONTROL_CLASS}
                  />
                </div>
              </>
            )}
            <Button
              type="button"
              className="w-full mt-4"
              onClick={handleTriggerSimulation}
            >
              Simulate Webhook Ingest POST
            </Button>
          </div>
          <div className="flex flex-col h-full space-y-4">
            <div className="flex-1 flex flex-col bg-theme-surface text-theme-success p-4 rounded-theme font-mono text-[10px] h-[220px] overflow-y-auto border border-theme-border">
              <span className="text-theme-muted">
                --- Simulation Console Logs ---
              </span>
              {simulatorLogs.map((entry, idx) => (
                <div key={idx} className="mt-1">
                  <span className="text-theme-muted">
                    [{new Date().toLocaleTimeString()}]
                  </span>{" "}
                  {entry}
                </div>
              ))}
            </div>
            <div className="bg-theme-surface p-4 rounded-theme border border-theme-border h-[100px] overflow-y-auto">
              <span className="block text-[10px] font-semibold text-theme-muted uppercase mb-1">
                Generated Lead Result
              </span>
              {simulatedResult ? (
                <div className="text-xs font-semibold">
                  <div className="text-theme-accent">
                    {simulatedResult.name} ({simulatedResult.phone})
                  </div>
                  <div className="text-theme-muted mt-1">
                    Source:{" "}
                    <Badge variant="primary" className="align-middle">
                      {simulatedResult.notes?.split("Source:")?.[1]?.trim() ||
                        "Webhook"}
                    </Badge>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-theme-muted font-medium">
                  Run a simulation to generate a Firestore lead record.
                </span>
              )}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
