import { Keyboard } from "lucide-react";
import Modal from "@/shared/components/ui/Modal";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const shortcuts = [
    { keys: ["Shift", "K"], desc: "Switch to CRM Kanban Board pipeline" },
    { keys: ["Shift", "D"], desc: "Open Lead Analytics Dashboard" },
    { keys: ["Shift", "T"], desc: "Open Outreach Message Template Center" },
    { keys: ["Shift", "M"], desc: "View Interactive Project Maps" },
    { keys: ["Shift", "A"], desc: "Navigate to Admin Operations Panel" },
    { keys: ["F"], desc: "Toggle Full Screen Mode" },
    { keys: ["Esc"], desc: "Close open modals or drop-downs" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      size="md"
      variant="sheet"
      closeOnBackdrop={false}
      footer={
        <p className="w-full text-center type-label text-[9px] font-semibold text-theme-muted uppercase tracking-widest">
          Golden Acres Workspace Suite
        </p>
      }
    >
      <div className="flex items-center gap-2 mb-4 -mt-1">
        <div className="p-1.5 rounded-theme bg-theme-accent/10 text-theme-accent">
          <Keyboard className="w-4 h-4" aria-hidden="true" />
        </div>
        <p className="text-[11px] font-semibold text-theme-muted">
          Quick keys to navigate the Work OS
        </p>
      </div>

      <div className="space-y-3.5">
        {shortcuts.map((s, idx) => (
          <div key={idx} className="flex justify-between items-center gap-3">
            <span className="text-xs font-semibold text-theme-muted leading-normal">
              {s.desc}
            </span>
            <div className="flex items-center space-x-1 flex-shrink-0">
              {s.keys.map((k, kIdx) => (
                <kbd
                  key={kIdx}
                  className="px-2 py-1 bg-theme-surface text-theme-text border border-theme-border rounded-theme text-[10px] font-semibold shadow-sm"
                >
                  {k}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
