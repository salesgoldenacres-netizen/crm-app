import { useState } from "react";
import { Copy, MessageSquare, Check } from "lucide-react";
import Textarea from "@/shared/components/ui/Textarea";
import Button from "@/shared/components/ui/Button";
import Modal from "@/shared/components/ui/Modal";

interface TemplateItem {
  id: string;
  title: string;
  description: string;
  text: string;
}

const TEMPLATES: TemplateItem[] = [
  {
    id: "intro",
    title: "Plot Details & Layout Intro",
    description:
      "First connect introduction sharing project specifications and coordinates.",
    text: `Dear {name},\n\nHope you are doing well!\n\nHere are the details for the premium residential plot you inquired about:\nProject: {project}\nPlot Number: {plot}\n\nYou can view the interactive project layout map online at:\nhttps://golden-acres-projects.web.app\n\nLet me know if you would like to schedule a site visit this week!\n\nRegards,\nGolden Acres Team`,
  },
  {
    id: "site-visit",
    title: "Site Visit Confirmation & Travel",
    description:
      "Send transport confirmation details to the client before a visit.",
    text: `Hi {name},\n\nThis is to confirm your site visit for {project} scheduled for this weekend.\n\nOur executive will coordinates with you shortly to finalize the pickup details. Please let us know if you need to adjust the timings.\n\nBest regards,\nGolden Acres Team`,
  },
  {
    id: "booking-payment",
    title: "Booking & Reservation Instructions",
    description: "Send bank payment instructions to secure a plot reservation.",
    text: `Hello {name},\n\nThank you for choosing {project}! We have temporarily reserved Plot {plot} for you.\n\nTo confirm the booking, please process the initial advance payment. Let us know once the transfer is done so we can issue your booking receipt.\n\nLooking forward to welcoming you!\n\nBest regards,\nGolden Acres Team`,
  },
  {
    id: "follow-up",
    title: "Callback Follow-up Greeting",
    description:
      "Friendly re-engagement text when a client callback is scheduled.",
    text: `Dear {name},\n\nThis is a friendly follow-up from Golden Acres regarding your plot interest in {project}.\n\nLet me know if this is a good time to connect for a quick 2-minute update.\n\nRegards,\nGolden Acres Team`,
  },
];

interface TemplateCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName?: string;
  phone?: string;
  projectName?: string;
  plotNumber?: string;
}

export default function TemplateCenterModal({
  isOpen,
  onClose,
  clientName = "",
  phone = "",
  projectName = "",
  plotNumber = "",
}: TemplateCenterModalProps) {
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [editedText, setEditedText] = useState("");
  const [copied, setCopied] = useState(false);

  // Update text when selection or props change via state-derivation during render
  const [lastSyncedTemplateKey, setLastSyncedTemplateKey] = useState("");
  const currentKey = `${selectedTemplateIndex}_${clientName}_${projectName}_${plotNumber}`;

  if (currentKey !== lastSyncedTemplateKey) {
    setLastSyncedTemplateKey(currentKey);
    if (TEMPLATES[selectedTemplateIndex]) {
      const rawText = TEMPLATES[selectedTemplateIndex].text;
      const interpolated = rawText
        .replace(/{name}/g, clientName || "Customer")
        .replace(/{project}/g, projectName || "Golden Acres Project")
        .replace(/{plot}/g, plotNumber || "—");
      setEditedText(interpolated);
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(editedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    let cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone;
    }
    const encodedText = encodeURIComponent(editedText);
    const url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    window.open(url, "_blank");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Template Center"
      size="2xl"
      variant="sheet"
      className="h-[85vh] sm:h-auto sm:max-h-[600px]"
      footer={
        <div className="w-full flex justify-between items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            className="flex-1 gap-1.5"
            aria-live="polite"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-theme-success" aria-hidden="true" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" aria-hidden="true" />
                <span>Copy Text</span>
              </>
            )}
          </Button>

          {phone && (
            <Button
              type="button"
              variant="primary"
              onClick={handleWhatsApp}
              className="flex-1 gap-1.5"
            >
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
              <span>Send WhatsApp</span>
            </Button>
          )}
        </div>
      }
    >
      {/* Bleed past Modal body padding so the split panes edge-to-edge */}
      <div className="-mx-6 -my-5 flex flex-col sm:flex-row min-h-[min(60vh,420px)] sm:min-h-[360px] h-full">
        {/* Sidebar Templates List */}
        <div className="w-full sm:w-80 bg-theme-surface border-b sm:border-b-0 sm:border-r border-theme-border flex flex-col overflow-hidden">
          <div className="p-4 border-b border-theme-border bg-theme-card">
            <p className="text-[10px] font-medium text-theme-muted">
              Select a message layout
            </p>
          </div>

          <div
            className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin"
            role="listbox"
            aria-label="Message templates"
          >
            {TEMPLATES.map((tpl, idx) => (
              <button
                key={tpl.id}
                type="button"
                role="option"
                aria-selected={selectedTemplateIndex === idx}
                onClick={() => setSelectedTemplateIndex(idx)}
                className={`w-full text-left p-3 rounded-theme transition-colors cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
                  selectedTemplateIndex === idx
                    ? "bg-theme-accent-muted border-theme-accent/40 text-theme-accent"
                    : "bg-theme-card hover:bg-theme-surface border-theme-border text-theme-text"
                }`}
              >
                <h4 className="text-xs font-semibold truncate">{tpl.title}</h4>
                <p
                  className={`text-[10px] font-medium leading-normal mt-1 truncate ${
                    selectedTemplateIndex === idx
                      ? "text-theme-accent/80"
                      : "text-theme-muted"
                  }`}
                >
                  {tpl.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Editor & Preview Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-theme-card min-h-0">
          <div className="p-4 border-b border-theme-border">
            <span className="type-label font-semibold uppercase text-theme-accent tracking-wider">
              Template Preview
            </span>
            <h3 className="text-sm font-semibold text-theme-text truncate max-w-[250px]">
              {TEMPLATES[selectedTemplateIndex]?.title}
            </h3>
          </div>

          <div className="flex-1 p-4 flex flex-col space-y-3 min-h-0 overflow-y-auto">
            <div className="flex justify-between items-center text-[10px] font-semibold text-theme-muted bg-theme-surface p-2 rounded-theme border border-theme-border">
              <span>
                Recipient: {clientName || "Customer"} ({phone || "No phone"})
              </span>
            </div>

            <Textarea
              label="Message text"
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              placeholder="Enter message text..."
              rows={10}
              wrapperClassName="flex-1 min-h-0"
              className="h-full min-h-[160px] font-medium leading-relaxed"
              helperText="Placeholders {name}, {project}, {plot} are filled from the lead"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
