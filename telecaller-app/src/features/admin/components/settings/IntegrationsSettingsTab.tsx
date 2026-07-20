import { Globe, SlidersHorizontal, Activity, Users } from "lucide-react";

import { useIntegrationsSettings } from "@/features/admin/hooks/useIntegrationsSettings";
import WebhookSimulatorConsole from "@/features/admin/components/WebhookSimulatorConsole";
import CloudFunctionCodeReference from "@/features/admin/components/CloudFunctionCodeReference";
import EvolutionIntegrationsPanel from "./EvolutionIntegrationsPanel";
import { User, Lead } from "@/shared/types";
import Input from "@/shared/components/ui/Input";
import Select from "@/shared/components/ui/Select";
import Textarea from "@/shared/components/ui/Textarea";
import Checkbox from "@/shared/components/ui/Checkbox";
import Button from "@/shared/components/ui/Button";
import FormActions from "@/shared/components/ui/FormActions";

const SECTION_LABEL =
  "type-label font-semibold text-theme-muted uppercase tracking-wider";
const SECTION_ACCENT =
  "type-label font-semibold text-theme-accent uppercase tracking-wider";
const CARD_TITLE =
  "text-sm font-semibold mb-4 flex items-center text-theme-text border-b border-theme-border pb-2";
const NESTED_PANEL =
  "space-y-3 bg-theme-surface/50 p-3 rounded-theme border border-theme-border";

interface IntegrationsSettingsTabProps {
  user: User;
  users: User[];
  leads: Lead[];
  addLead: (leadData: any) => Promise<any>;
  logAuditEvent: (eventData: any) => Promise<any>;
  isManagerial: (role: string) => boolean;
  simulateIncomingIvrCall: (agentId: string, payload: any) => Promise<any>;
}

export default function IntegrationsSettingsTab({
  user,
  users,
  leads,
  addLead,
  logAuditEvent,
  isManagerial,
  simulateIncomingIvrCall,
}: IntegrationsSettingsTabProps) {
  const {
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
  } = useIntegrationsSettings({
    user,
    users,
    leads,
    addLead,
    logAuditEvent,
    isManagerial,
    simulateIncomingIvrCall,
  });

  const hasIvrJsonError =
    ivrJsonErrors.headers !== null || ivrJsonErrors.payload !== null;

  return (
    <div className="space-y-6 animate-fadeIn text-sm">
      <EvolutionIntegrationsPanel
        integrationSettings={integrationSettings}
        setIntegrationSettings={setIntegrationSettings}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-theme-card rounded-theme shadow-sm border border-theme-border p-5 transition-colors animate-fadeIn">
            <h3 className={CARD_TITLE}>
              <Globe className="w-5 h-5 mr-2 text-theme-accent" aria-hidden="true" />
              Webhook &amp; API Configuration
            </h3>
            <form onSubmit={handleSaveIntegrationSettings} className="space-y-6">
              <div className="space-y-4">
                <h4 className={SECTION_LABEL}>Webhook Ingestion</h4>
                <Input
                  label="Google Webhook Key"
                  type="text"
                  value={integrationSettings.googleWebhookKey || ""}
                  onChange={(e) =>
                    setIntegrationSettings({
                      ...integrationSettings,
                      googleWebhookKey: e.target.value,
                    })
                  }
                  placeholder="e.g. google_lead_secret_key"
                />
                <Input
                  label="Meta Verify Token"
                  type="text"
                  value={integrationSettings.metaVerifyToken || ""}
                  onChange={(e) =>
                    setIntegrationSettings({
                      ...integrationSettings,
                      metaVerifyToken: e.target.value,
                    })
                  }
                  placeholder="e.g. meta_verify_secret_token"
                />
                <Textarea
                  label="Meta Page Access Token"
                  rows={2}
                  value={integrationSettings.metaAccessToken || ""}
                  onChange={(e) =>
                    setIntegrationSettings({
                      ...integrationSettings,
                      metaAccessToken: e.target.value,
                    })
                  }
                  placeholder="EAAGb..."
                  className="font-mono text-xs"
                />
                <Input
                  label="Generic API Webhook Key"
                  type="text"
                  value={integrationSettings.apiWebhookKey || ""}
                  onChange={(e) =>
                    setIntegrationSettings({
                      ...integrationSettings,
                      apiWebhookKey: e.target.value,
                    })
                  }
                  placeholder="e.g. generic_webhook_secret_key"
                />
              </div>

              <div className="space-y-4 border-t border-theme-border pt-4">
                <h4 className={SECTION_ACCENT}>Twilio Voice Dialer API</h4>
                <Input
                  label="Twilio Account SID"
                  type="text"
                  value={integrationSettings.twilioAccountSid || ""}
                  onChange={(e) =>
                    setIntegrationSettings({
                      ...integrationSettings,
                      twilioAccountSid: e.target.value,
                    })
                  }
                  placeholder="AC..."
                />
                <Input
                  label="Twilio Auth Token"
                  type="password"
                  value={integrationSettings.twilioAuthToken || ""}
                  onChange={(e) =>
                    setIntegrationSettings({
                      ...integrationSettings,
                      twilioAuthToken: e.target.value,
                    })
                  }
                  placeholder="••••••••••••••••••••••••••••••••"
                />
                <Input
                  label="Twilio Caller ID Phone Number"
                  type="text"
                  value={integrationSettings.twilioPhoneNumber || ""}
                  onChange={(e) =>
                    setIntegrationSettings({
                      ...integrationSettings,
                      twilioPhoneNumber: e.target.value,
                    })
                  }
                  placeholder="e.g. +1415xxxxxxx"
                />
              </div>

              <div className="space-y-4 border-t border-theme-border pt-4">
                <h4 className={`${SECTION_ACCENT} flex items-center`}>
                  <Activity className="w-4 h-4 mr-1" aria-hidden="true" />
                  Voice IVR Integrations
                </h4>
                <Checkbox
                  label="Enable Inbound / Outbound Calls"
                  checked={!!integrationSettings.enableIvr}
                  onChange={(e) =>
                    setIntegrationSettings({
                      ...integrationSettings,
                      enableIvr: e.target.checked,
                    })
                  }
                />

                {integrationSettings.enableIvr && (
                  <>
                    <Select
                      label="Voice Provider Platform"
                      value={integrationSettings.ivrProvider || "mock"}
                      onChange={(e) =>
                        setIntegrationSettings({
                          ...integrationSettings,
                          ivrProvider: e.target.value,
                        })
                      }
                      options={[
                        {
                          value: "mock",
                          label: "Sandbox Dialer (In-app simulation)",
                        },
                        { value: "twilio", label: "Twilio Voice Dialer API" },
                        { value: "exotel", label: "Exotel Cloud Telephony" },
                        {
                          value: "custom",
                          label: "Generic External Hook URL (JSON POST)",
                        },
                      ]}
                    />

                    {integrationSettings.ivrProvider === "exotel" && (
                      <div className={NESTED_PANEL}>
                        <span className={SECTION_ACCENT}>Exotel Credentials</span>
                        <Input
                          label="Exotel Account SID"
                          type="text"
                          value={integrationSettings.exotelSid || ""}
                          onChange={(e) =>
                            setIntegrationSettings({
                              ...integrationSettings,
                              exotelSid: e.target.value,
                            })
                          }
                        />
                        <Input
                          label="Exotel Token"
                          type="password"
                          value={integrationSettings.exotelToken || ""}
                          onChange={(e) =>
                            setIntegrationSettings({
                              ...integrationSettings,
                              exotelToken: e.target.value,
                            })
                          }
                        />
                        <Input
                          label="Exotel Virtual Number"
                          type="text"
                          value={integrationSettings.exotelVirtualNumber || ""}
                          onChange={(e) =>
                            setIntegrationSettings({
                              ...integrationSettings,
                              exotelVirtualNumber: e.target.value,
                            })
                          }
                        />
                      </div>
                    )}

                    {integrationSettings.ivrProvider === "custom" && (
                      <div className={NESTED_PANEL}>
                        <span className={SECTION_ACCENT}>
                          Custom Outbound POST Configs
                        </span>
                        <Input
                          label="Target Bridge API Link"
                          type="text"
                          value={integrationSettings.ivrCustomOutboundUrl || ""}
                          onChange={(e) =>
                            setIntegrationSettings({
                              ...integrationSettings,
                              ivrCustomOutboundUrl: e.target.value,
                            })
                          }
                          placeholder="https://my-phone-bridge.com/api/call"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            label="Method"
                            value={integrationSettings.ivrCustomMethod || "POST"}
                            onChange={(e) =>
                              setIntegrationSettings({
                                ...integrationSettings,
                                ivrCustomMethod: e.target.value,
                              })
                            }
                            options={[
                              { value: "POST", label: "POST" },
                              { value: "GET", label: "GET" },
                              { value: "PUT", label: "PUT" },
                            ]}
                          />
                          <Input
                            label="Auth Header"
                            type="text"
                            value={integrationSettings.ivrCustomAuthHeader || ""}
                            onChange={(e) =>
                              setIntegrationSettings({
                                ...integrationSettings,
                                ivrCustomAuthHeader: e.target.value,
                              })
                            }
                            placeholder="Bearer secret..."
                          />
                        </div>
                        <Textarea
                          id="ivrCustomHeadersTextarea"
                          label="Headers (JSON)"
                          rows={3}
                          value={integrationSettings.ivrCustomHeaders || ""}
                          onChange={(e) => handleHeadersChange(e.target.value)}
                          placeholder='{ "Content-Type": "application/json" }'
                          error={ivrJsonErrors.headers || undefined}
                          className="font-mono text-xs"
                        />
                        <Textarea
                          id="ivrCustomPayloadTextarea"
                          label="Payload Template (JSON)"
                          rows={4}
                          value={integrationSettings.ivrCustomPayload || ""}
                          onChange={(e) => handlePayloadChange(e.target.value)}
                          placeholder='{ "agent": "{{agentPhone}}", "client": "{{clientPhone}}" }'
                          error={ivrJsonErrors.payload || undefined}
                          className="font-mono text-xs"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="space-y-4 border-t border-theme-border pt-4">
                <h4
                  className={`${SECTION_LABEL} flex items-center text-theme-warning`}
                >
                  <Users
                    className="w-4 h-4 mr-1 text-theme-warning"
                    aria-hidden="true"
                  />
                  Round-Robin Routing
                </h4>
                <Checkbox
                  label="Enable Auto-Allocation"
                  checked={routingSettings.enableRoundRobin}
                  onChange={(e) =>
                    setRoutingSettings({
                      ...routingSettings,
                      enableRoundRobin: e.target.checked,
                    })
                  }
                />
                {routingSettings.enableRoundRobin && (
                  <div>
                    <span className="type-label font-semibold text-theme-muted block mb-1.5">
                      Include Agents in Pool
                    </span>
                    <div
                      role="group"
                      aria-label="Agents in round-robin pool"
                      className="space-y-2 max-h-24 overflow-y-auto bg-theme-surface p-2.5 rounded-theme border border-theme-border"
                    >
                      {users
                        .filter((u) => !isManagerial(u.role))
                        .map((tc) => {
                          const isChecked = (
                            routingSettings.activeAgents || []
                          ).includes(tc.id);
                          return (
                            <Checkbox
                              key={tc.id}
                              label={`${tc.username} (${tc.role})`}
                              checked={isChecked}
                              onChange={(e) => {
                                const updatedAgents = e.target.checked
                                  ? [
                                      ...(routingSettings.activeAgents || []),
                                      tc.id,
                                    ]
                                  : (
                                      routingSettings.activeAgents || []
                                    ).filter((id: string) => id !== tc.id);
                                setRoutingSettings({
                                  ...routingSettings,
                                  activeAgents: updatedAgents,
                                });
                              }}
                            />
                          );
                        })}
                      {users.filter((u) => !isManagerial(u.role)).length ===
                        0 && (
                        <p className="text-[10px] text-theme-muted italic">
                          No telecallers available
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <FormActions className="mt-4 justify-stretch">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={hasIvrJsonError}
                  className="w-full"
                >
                  Save Configuration
                </Button>
              </FormActions>
            </form>
          </div>

          <div className="bg-theme-surface/40 rounded-theme p-5 border border-theme-border text-xs leading-relaxed space-y-2 mt-4 animate-fadeIn text-theme-muted">
            <h4 className="font-semibold text-theme-text flex items-center">
              <Globe
                className="w-4 h-4 mr-1 text-theme-accent"
                aria-hidden="true"
              />{" "}
              Active Webhook URL
            </h4>
            <code className="block bg-theme-surface p-2 rounded-theme text-theme-accent select-all break-all text-[10px] border border-theme-border font-mono">
              https://golden-acres-projects.web.app/api/webhooks/leads
            </code>
            <p>
              Use this URL in Meta Developer Console and Google Ads Lead Form to
              pipe live leads.
            </p>
          </div>

          <div className="bg-theme-card rounded-theme shadow-sm border border-theme-border p-5 transition-colors mt-4 animate-fadeIn">
            <h3 className={CARD_TITLE}>
              <SlidersHorizontal
                className="w-5 h-5 mr-2 text-theme-accent"
                aria-hidden="true"
              />
              Live Remote Configuration
            </h3>
            <form onSubmit={handleSaveRemoteConfig} className="space-y-4">
              <Textarea
                label="Announcement Text"
                rows={3}
                value={remoteSettings.announcement_text}
                onChange={(e) =>
                  setRemoteSettings({
                    ...remoteSettings,
                    announcement_text: e.target.value,
                  })
                }
                placeholder="Live announcement banner text for all telecallers"
              />

              <Checkbox
                label="Show Announcement Banner"
                checked={remoteSettings.show_announcement}
                onChange={(e) =>
                  setRemoteSettings({
                    ...remoteSettings,
                    show_announcement: e.target.checked,
                  })
                }
              />

              <Input
                label="Default Rate per SqFt (₹)"
                type="number"
                value={remoteSettings.default_rate_per_sqft}
                onChange={(e) =>
                  setRemoteSettings({
                    ...remoteSettings,
                    default_rate_per_sqft: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="e.g. 3500"
              />

              <Input
                label="Follow-up Reminder Window (Days)"
                type="number"
                value={remoteSettings.follow_up_reminder_days}
                onChange={(e) =>
                  setRemoteSettings({
                    ...remoteSettings,
                    follow_up_reminder_days: parseInt(e.target.value) || 1,
                  })
                }
                placeholder="e.g. 1"
              />

              <FormActions className="mt-2 justify-stretch">
                <Button type="submit" variant="primary" className="w-full">
                  Publish Remote Config
                </Button>
              </FormActions>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <WebhookSimulatorConsole
            simulatorPlatform={simulatorPlatform}
            setSimulatorPlatform={setSimulatorPlatform}
            simulatorForm={simulatorForm}
            setSimulatorForm={setSimulatorForm}
            users={users}
            isManagerial={isManagerial}
            handleTriggerSimulation={handleTriggerSimulation}
            simulatorLogs={simulatorLogs}
            simulatedResult={simulatedResult}
          />

          <CloudFunctionCodeReference />
        </div>
      </div>
    </div>
  );
}
