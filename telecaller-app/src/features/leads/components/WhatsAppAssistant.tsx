import { MessageCircle } from "lucide-react";
import { WHATSAPP_TEMPLATES } from "@/shared/constants/whatsappTemplates";
import { Lead, Project, User } from "@/shared/types";
import Select from "@/shared/components/ui/Select";
import Textarea from "@/shared/components/ui/Textarea";
import Button from "@/shared/components/ui/Button";
import FormActions from "@/shared/components/ui/FormActions";

interface WhatsAppAssistantProps {
  activeLead: Lead;
  isOpen: boolean;
  onToggle: () => void;
  projects: Record<string, Project>;
  whatsAppMessage: string;
  setWhatsAppMessage: (msg: string) => void;
  user: User;
}

/**
 * Deep-link template helper only.
 * Does NOT write `callLogs` or client `whatsapp_*` timeline events —
 * canonical WA timeline remains messaging `writeMessage` (server).
 */
export default function WhatsAppAssistant({
  activeLead,
  isOpen,
  onToggle,
  projects,
  whatsAppMessage,
  setWhatsAppMessage,
  user,
}: WhatsAppAssistantProps) {
  return (
    <div className="card-premium border border-theme-border p-6">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls="whatsapp-assistant-panel"
        className="w-full flex justify-between items-center text-left cursor-pointer border-b border-theme-border pb-2.5 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring rounded-theme"
      >
        <h4 className="type-label font-semibold text-theme-muted uppercase tracking-wider flex items-center">
          <MessageCircle className="w-4 h-4 mr-2 text-theme-accent" aria-hidden="true" />
          WhatsApp Template Assistant
        </h4>
        <span className="text-theme-accent font-semibold text-xs">
          {isOpen ? "Hide" : "Expand"}
        </span>
      </button>
      {isOpen && (
        <div
          id="whatsapp-assistant-panel"
          className="mt-4 space-y-4 animate-fadeIn"
          role="region"
          aria-label="WhatsApp template assistant"
        >
          <Select
            label="Select WhatsApp Template"
            helperText="Choose a template to preview and edit before sending"
            onChange={(e) => {
              const templateId = e.target.value;
              if (!templateId) {
                setWhatsAppMessage("");
                return;
              }
              const t = WHATSAPP_TEMPLATES.find(
                (x) => x.id === templateId
              );
              if (t) {
                const projectName =
                  (activeLead.projectId && projects[activeLead.projectId]?.name) ||
                  "Golden Acres";
                setWhatsAppMessage(
                  t.text({
                    name: activeLead.name,
                    project: projectName,
                    agent: user.username,
                    plot: activeLead.plotId || "",
                  }),
                );
              }
            }}
            defaultValue=""
          >
            <option value="">Choose a template...</option>
            {WHATSAPP_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>

          {whatsAppMessage && (
            <div className="space-y-4 animate-fadeIn">
              <Textarea
                label="Message Preview"
                rows={3}
                value={whatsAppMessage}
                onChange={(e) => setWhatsAppMessage(e.target.value)}
                helperText="Edit the message before opening WhatsApp"
              />
              <FormActions>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    const cleanPhone = activeLead.phone.replace(
                      /[^0-9]/g,
                      ""
                    );
                    const waUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(whatsAppMessage)}`;
                    window.open(waUrl, "_blank");
                  }}
                  className="w-full"
                >
                  <MessageCircle className="w-4 h-4 mr-1.5" aria-hidden="true" />
                  Open WhatsApp with template
                </Button>
              </FormActions>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
