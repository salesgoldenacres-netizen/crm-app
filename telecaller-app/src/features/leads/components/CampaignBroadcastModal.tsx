import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Lead, User } from "@/shared/types";
import { publishNoteAdded } from "@/shared/contracts";
import Input from "@/shared/components/ui/Input";
import Textarea from "@/shared/components/ui/Textarea";
import Button from "@/shared/components/ui/Button";
import Modal from "@/shared/components/ui/Modal";
import FormActions from "@/shared/components/ui/FormActions";

interface CampaignBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCampaignLeadIds: string[];
  leads: Lead[];
  logAuditEvent: (data: { action: string; details: string; user: string }) => Promise<void> | void;
  user: User;
}

interface CampaignForm {
  channel: string;
  subject: string;
  templateText: string;
}

/**
 * Bulk campaign dispatcher.
 * Writes typed `note_added` timeline events — never `callLogs` /
 * `[WhatsApp Sent]` masquerading as WhatsApp messaging history.
 */
export default function CampaignBroadcastModal({
  isOpen,
  onClose,
  selectedCampaignLeadIds,
  leads,
  logAuditEvent,
  user,
}: CampaignBroadcastModalProps) {
  const [campaignForm, setCampaignForm] = useState<CampaignForm>({
    channel: "whatsapp",
    subject: "",
    templateText: "",
  });
  const [campaignDispatchIndex, setCampaignDispatchIndex] = useState(-1);
  const [templateError, setTemplateError] = useState<string | undefined>();
  const [subjectError, setSubjectError] = useState<string | undefined>();

  const handleSendCampaign = async () => {
    if (!campaignForm.templateText.trim()) {
      setTemplateError("Enter a message template before sending");
      return;
    }
    if (campaignForm.channel === "email" && !campaignForm.subject.trim()) {
      setSubjectError("Enter an email subject");
      return;
    }
    setTemplateError(undefined);
    setSubjectError(undefined);

    const dispatchBatchId = new Date().toISOString();
    for (let i = 0; i < selectedCampaignLeadIds.length; i++) {
      setCampaignDispatchIndex(i);
      const lead = leads.find((l) => l.id === selectedCampaignLeadIds[i]);
      if (lead) {
        const message = campaignForm.templateText
          .replace(/\{\{name\}\}/g, lead.name || "Customer")
          .replace(/\{\{phone\}\}/g, lead.phone || "")
          .replace(/\{\{email\}\}/g, lead.email || "");
        const channel = campaignForm.channel.toUpperCase();
        const preview = message.substring(0, 100);
        // Audit note only — never callLogs / [WhatsApp Sent] / whatsapp_* timeline.
        void publishNoteAdded({
          leadId: selectedCampaignLeadIds[i],
          note: `Campaign (${channel}): ${preview}`,
          actorName: `Admin (${user.username})`,
          sourceId: `campaign:${selectedCampaignLeadIds[i]}:${campaignForm.channel}:${dispatchBatchId}`,
          idempotencyKey: `campaign_${campaignForm.channel}_${selectedCampaignLeadIds[i]}_${dispatchBatchId}`,
          metadata: {
            channel: campaignForm.channel,
            kind: "campaign_dispatch",
          },
        });
      }
      await new Promise((r) => setTimeout(r, 80));
    }
    await logAuditEvent({
      action: "Launch Bulk Campaign",
      details: `Dispatched ${campaignForm.channel} campaign to ${selectedCampaignLeadIds.length} leads.`,
      user: user.username,
    });
  };

  const progressValue = Math.min(
    campaignDispatchIndex + 1,
    selectedCampaignLeadIds.length
  );
  const progressMax = selectedCampaignLeadIds.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Launch Bulk Campaign (${selectedCampaignLeadIds.length} leads)`}
      size="xl"
      className="max-w-2xl"
      footer={
        <FormActions>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={campaignDispatchIndex >= 0}
            onClick={handleSendCampaign}
          >
            <MessageCircle className="w-4 h-4 mr-2" aria-hidden="true" />
            {campaignDispatchIndex >= 0
              ? "Dispatching..."
              : `Send ${campaignForm.channel.toUpperCase()} to ${selectedCampaignLeadIds.length} Leads`}
          </Button>
        </FormActions>
      }
    >
      <div className="space-y-5 text-sm">
        <div>
          <span
            id="campaign-channel-label"
            className="type-label font-semibold text-theme-muted block mb-2"
          >
            Communication Channel
          </span>
          <div
            className="flex space-x-3"
            role="group"
            aria-labelledby="campaign-channel-label"
          >
            {[
              { val: "whatsapp", label: "WhatsApp" },
              { val: "sms", label: "SMS" },
              { val: "email", label: "Email" },
            ].map((ch) => (
              <button
                key={ch.val}
                type="button"
                aria-pressed={campaignForm.channel === ch.val}
                onClick={() => {
                  setSubjectError(undefined);
                  setCampaignForm({ ...campaignForm, channel: ch.val });
                }}
                className={`px-4 py-2 rounded-theme text-xs font-semibold border cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
                  campaignForm.channel === ch.val
                    ? "bg-theme-accent-muted text-theme-accent border-theme-accent/40"
                    : "bg-theme-surface text-theme-muted border-theme-border hover:bg-theme-surface"
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        {campaignForm.channel === "email" && (
          <Input
            label="Email Subject"
            type="text"
            required
            value={campaignForm.subject}
            error={subjectError}
            onChange={(e) => {
              setSubjectError(undefined);
              setCampaignForm({
                ...campaignForm,
                subject: e.target.value,
              });
            }}
            placeholder="e.g. Exclusive Plot Offers at Golden Acres"
            helperText="Shown as the email subject line"
          />
        )}

        <Textarea
          label="Message Template"
          required
          helperText="Use {{name}}, {{phone}}, {{email}} as placeholders"
          value={campaignForm.templateText}
          error={templateError}
          onChange={(e) => {
            setTemplateError(undefined);
            setCampaignForm({
              ...campaignForm,
              templateText: e.target.value,
            });
          }}
          rows={5}
          placeholder={`Hi {{name}},\n\nWe have an exclusive plot availability at Golden Acres. Would you like to schedule a site visit?\n\nRegards,\nGolden Acres Team`}
          className="font-mono"
        />

        {campaignForm.templateText && (
          <div
            className="bg-theme-surface rounded-theme p-4 border border-theme-border space-y-2"
            aria-live="polite"
          >
            <div className="type-label font-semibold text-theme-muted uppercase tracking-wider">
              Preview (First Lead)
            </div>
            <div className="text-xs text-theme-text whitespace-pre-wrap font-medium">
              {(() => {
                const firstLead = leads.find(
                  (l) => l.id === selectedCampaignLeadIds[0]
                );
                if (!firstLead) return campaignForm.templateText;
                return campaignForm.templateText
                  .replace(/\{\{name\}\}/g, firstLead.name || "Customer")
                  .replace(/\{\{phone\}\}/g, firstLead.phone || "")
                  .replace(/\{\{email\}\}/g, firstLead.email || "");
              })()}
            </div>
          </div>
        )}

        {campaignDispatchIndex >= 0 && (
          <div className="space-y-2" role="status">
            <div className="flex justify-between text-xs font-semibold text-theme-muted">
              <span>Dispatching…</span>
              <span>
                {progressValue} / {progressMax}
              </span>
            </div>
            <div
              className="w-full bg-theme-surface rounded-theme h-2 overflow-hidden border border-theme-border"
              role="progressbar"
              aria-valuenow={progressValue}
              aria-valuemin={0}
              aria-valuemax={progressMax}
              aria-label="Campaign dispatch progress"
            >
              <div
                className="bg-theme-accent h-full transition-all duration-300"
                style={{
                  width: `${Math.round((progressValue / progressMax) * 100)}%`,
                }}
              />
            </div>
            {campaignDispatchIndex >= selectedCampaignLeadIds.length - 1 && (
              <div className="type-label font-semibold text-theme-success text-center mt-2">
                All {selectedCampaignLeadIds.length} messages dispatched
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
