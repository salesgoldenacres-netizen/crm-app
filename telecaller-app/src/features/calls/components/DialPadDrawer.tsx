import React, { useState, useRef } from "react";
import { Delete, Phone, UserPlus, User as UserIcon, X } from "lucide-react";
import { useToast } from "@/shared/components/Toast";
import { Lead, Project } from "@/shared/types";
import Drawer from "@/shared/components/ui/Drawer";

// DTMF Frequency Map for realistic dial pad sounds
const DTMF_FREQS: Record<string, [number, number]> = {
  "1": [697, 1209],
  "2": [697, 1336],
  "3": [697, 1477],
  "4": [770, 1209],
  "5": [770, 1336],
  "6": [770, 1477],
  "7": [852, 1209],
  "8": [852, 1336],
  "9": [852, 1477],
  "*": [941, 1209],
  "0": [941, 1336],
  "#": [941, 1477],
};

interface DialPadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  leads?: Lead[];
  onStartCall: (lead: Lead) => void;
  projects?: Record<string, Project>;
  addLead: (lead: any) => Promise<any>;
}

export default function DialPadDrawer({
  isOpen,
  onClose,
  leads = [],
  onStartCall,
  projects = {},
  addLead,
}: DialPadDrawerProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [quickCreateName, setQuickCreateName] = useState("");
  const [quickCreateProject, setQuickCreateProject] = useState("");
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const { toast } = useToast();

  const handlePhoneNumberChange = (newVal: string) => {
    setPhoneNumber(newVal);
    if (!newVal.trim()) {
      setSelectedLead(null);
      setShowQuickCreate(false);
    } else if (selectedLead && selectedLead.phone !== newVal) {
      setSelectedLead(null);
    }
  };

  // Compute search results on the fly
  const query = phoneNumber.replace(/[^0-9]/g, "");
  const searchResults =
    phoneNumber.trim() && query.length >= 3
      ? leads
          .filter((lead) => {
            const cleanPhone = (lead.phone || "").replace(/[^0-9]/g, "");
            return (
              cleanPhone.includes(query) ||
              (lead.name || "")
                .toLowerCase()
                .includes(phoneNumber.toLowerCase())
            );
          })
          .slice(0, 5)
      : [];

  // DTMF Tone Generator
  const playTone = (digit: string) => {
    try {
      const freqs = DTMF_FREQS[digit];
      if (!freqs) return;

      if (!audioCtxRef.current) {
        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc1.frequency.value = freqs[0];
      osc2.frequency.value = freqs[1];

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();

      osc1.stop(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn("AudioContext failed:", e);
    }
  };

  const handleKeyPress = (digit: string) => {
    playTone(digit);
    handlePhoneNumberChange(phoneNumber + digit);
  };

  const handleBackspace = () => {
    handlePhoneNumberChange(phoneNumber.slice(0, -1));
  };

  const handleClear = () => {
    handlePhoneNumberChange("");
  };

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setPhoneNumber(lead.phone);
  };

  const handleQuickCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCreateName.trim()) {
      toast("Please enter a name for the lead", "error");
      return;
    }
    try {
      const newLead = await addLead({
        name: quickCreateName,
        phone: phoneNumber,
        projectId: quickCreateProject || Object.keys(projects)[0] || "",
        notes: "Created via global Dial Pad drawer.",
        status: "new",
      });
      setSelectedLead(newLead);
      setShowQuickCreate(false);
      setQuickCreateName("");
      toast("Lead created successfully!", "success");
    } catch (err: any) {
      toast(`Failed to create lead: ${err.message}`, "error");
    }
  };

  const handleCall = () => {
    if (!phoneNumber.trim()) {
      toast("Please enter a phone number to call", "error");
      return;
    }

    let targetLead = selectedLead;

    if (!targetLead) {
      const cleanInput = phoneNumber.replace(/[^0-9]/g, "");
      const match = leads.find(
        (l) => (l.phone || "").replace(/[^0-9]/g, "") === cleanInput
      );
      if (match) {
        targetLead = match;
      }
    }

    if (!targetLead) {
      targetLead = {
        id: "temp-" + Date.now(),
        name: "Unknown Caller",
        phone: phoneNumber,
        status: "new",
        callLogs: [],
      };
    }

    onStartCall(targetLead);
    onClose();
  };

  const footer = (
    <div className="w-full">
      <button
        type="button"
        onClick={handleCall}
        className="w-full py-3.5 bg-theme-success hover:opacity-90 active:scale-[0.98] rounded-theme font-bold text-sm text-white transition-all shadow-lg flex items-center justify-center space-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring border-0 cursor-pointer"
      >
        <Phone className="w-4 h-4 fill-current" aria-hidden="true" />
        <span>Call Number</span>
      </button>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Keypad Dialer"
      position="right"
      size="sm"
      className="max-w-sm"
      footer={footer}
    >
      {/* Specialized telephony UX — layout/behavior preserved; chrome tokenized */}
      <div className="space-y-4">
        {/* Display Output */}
        <div className="relative bg-theme-surface rounded-theme p-4 border border-theme-border flex flex-col justify-between h-24">
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => handlePhoneNumberChange(e.target.value)}
            className="bg-transparent border-none text-center text-xl font-bold w-full focus:outline-none focus:ring-0 text-theme-text tracking-widest"
            placeholder="Enter number..."
            aria-label="Phone number"
          />

          <div className="flex justify-between items-center text-[10px] text-theme-muted font-semibold px-2">
            <span className="truncate max-w-[180px]">
              {selectedLead
                ? selectedLead.name
                : showQuickCreate
                  ? "New Lead Creator"
                  : "Unknown Contact"}
            </span>
            {phoneNumber && (
              <button
                type="button"
                onClick={handleClear}
                className="text-theme-muted hover:text-theme-text hover:underline transition-all cursor-pointer border-0 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring rounded-theme"
              >
                Clear
              </button>
            )}
          </div>

          {phoneNumber && (
            <button
              type="button"
              onClick={handleBackspace}
              className="absolute right-3 top-4 text-theme-muted hover:text-theme-text p-1 rounded-lg hover:bg-theme-card cursor-pointer border-0 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
              title="Backspace"
              aria-label="Backspace"
            >
              <Delete className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Lead Matches Search Results */}
        {!selectedLead && searchResults.length > 0 && (
          <div className="bg-theme-surface/60 rounded-theme border border-theme-border p-2 space-y-1">
            <div className="text-[9px] font-bold text-theme-muted uppercase tracking-wider px-2 py-1">
              Matching Contacts
            </div>
            {searchResults.map((lead) => (
              <button
                key={lead.id}
                type="button"
                onClick={() => handleSelectLead(lead)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-theme-card flex items-center justify-between text-xs transition-colors cursor-pointer border-0 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-theme-text truncate">{lead.name}</p>
                  <p className="text-[10px] text-theme-muted">{lead.phone}</p>
                </div>
                <UserIcon
                  className="w-3.5 h-3.5 text-theme-muted shrink-0 ml-2"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        )}

        {/* Quick Create Lead Panel */}
        {phoneNumber && !selectedLead && searchResults.length === 0 && (
          <div className="bg-theme-surface/60 rounded-theme border border-theme-border p-3 space-y-2">
            {!showQuickCreate ? (
              <button
                type="button"
                onClick={() => setShowQuickCreate(true)}
                className="w-full py-2 bg-theme-accent-muted hover:opacity-90 text-theme-accent border border-theme-accent/20 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
              >
                <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Create Lead for Phone</span>
              </button>
            ) : (
              <form onSubmit={handleQuickCreateLead} className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-theme-accent uppercase tracking-wider">
                    New Lead details
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowQuickCreate(false)}
                    className="text-theme-muted hover:text-theme-text p-1 rounded-theme cursor-pointer border-0 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
                    aria-label="Cancel quick create"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={quickCreateName}
                  onChange={(e) => setQuickCreateName(e.target.value)}
                  className="w-full text-xs bg-theme-card border border-theme-border rounded-lg p-2 text-theme-text focus:ring-1 focus:ring-theme-ring outline-none"
                />
                <select
                  value={quickCreateProject}
                  onChange={(e) => setQuickCreateProject(e.target.value)}
                  className="w-full text-xs bg-theme-card border border-theme-border rounded-lg p-2 text-theme-text focus:ring-1 focus:ring-theme-ring outline-none"
                >
                  {Object.values(projects).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="w-full py-2 bg-theme-accent hover:opacity-90 text-theme-accent-fg rounded-lg text-xs font-bold transition-all cursor-pointer border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
                >
                  Save & Assign Lead
                </button>
              </form>
            )}
          </div>
        )}

        {/* Keypad Grid */}
        <div className="grid grid-cols-3 gap-3.5 max-w-[260px] mx-auto pt-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map(
            (digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeyPress(digit)}
                className="w-16 h-16 rounded-full bg-theme-surface hover:bg-theme-card active:opacity-80 text-theme-text text-xl font-bold flex flex-col items-center justify-center transition-all cursor-pointer shadow border border-theme-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
                aria-label={`Dial ${digit}`}
              >
                <span>{digit}</span>
                <span className="text-[8px] text-theme-muted font-medium" aria-hidden="true">
                  {digit === "2"
                    ? "ABC"
                    : digit === "3"
                      ? "DEF"
                      : digit === "4"
                        ? "GHI"
                        : digit === "5"
                          ? "JKL"
                          : digit === "6"
                            ? "MNO"
                            : digit === "7"
                              ? "PQRS"
                              : digit === "8"
                                ? "TUV"
                                : digit === "9"
                                  ? "WXYZ"
                                  : " "}
                </span>
              </button>
            )
          )}
        </div>
      </div>
    </Drawer>
  );
}
