import { FileText } from "lucide-react";

interface MessageContentRendererProps {
  note: string;
  isMe: boolean;
  noteId: string;
  playingVoiceNoteId: string | null;
  voiceNoteProgress: number;
  togglePlayVoiceNote: (noteId: string) => void;
}

export default function MessageContentRenderer({
  note,
  isMe,
  noteId,
  playingVoiceNoteId,
  voiceNoteProgress,
  togglePlayVoiceNote,
}: MessageContentRendererProps) {
  const content = note.replace(/\[WhatsApp.*?\]\s*/g, "").trim();

  if (content.includes("[Voice Note]")) {
    const duration = content.replace("[Voice Note]", "").trim() || "0:18";
    const isPlaying = playingVoiceNoteId === noteId;
    const totalBars = 14;
    const activeBarCount = isPlaying ? Math.floor((voiceNoteProgress / 100) * totalBars) : -1;

    return (
      <div className="flex items-center space-x-3 py-1">
        <button
          type="button"
          onClick={() => togglePlayVoiceNote(noteId)}
          className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-all flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
            isMe
              ? "bg-white/20 hover:bg-white/30 text-white"
              : "bg-theme-accent-muted text-theme-accent hover:opacity-90"
          }`}
        >
          {isPlaying ? (
            <div className="flex space-x-0.5 justify-center items-center">
              <div
                className={`w-0.5 h-2 ${isMe ? "bg-white" : "bg-theme-accent"}`}
              />
              <div
                className={`w-0.5 h-2 ${isMe ? "bg-white" : "bg-theme-accent"}`}
              />
            </div>
          ) : (
            <span className="text-[10px] pl-[2px] text-current" aria-hidden="true">
              ▶
            </span>
          )}
        </button>
        <div className="flex-1 min-w-[120px]">
          <div className="flex items-end space-x-0.5 h-5">
            {[25, 50, 35, 75, 60, 30, 55, 65, 40, 55, 30, 70, 45, 25].map((h, i) => {
              const isActive = i <= activeBarCount;
              const barColor = isMe
                ? isActive
                  ? "bg-white"
                  : "bg-white/30"
                : isActive
                  ? "bg-theme-accent"
                  : "bg-theme-accent/30";
              return (
                <div
                  key={i}
                  className={`w-[2.5px] rounded-full transition-colors duration-150 ${barColor}`}
                  style={{ height: `${h}%` }}
                />
              );
            })}
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className={`text-[8px] ${isMe ? "text-white/70" : "text-theme-muted"}`}>
              {isPlaying ? "Playing..." : "Voice Note"}
            </span>
            <span className={`text-[8px] ${isMe ? "text-white/70" : "text-theme-muted"}`}>
              {duration}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (content.includes("[Brochure]") || content.includes("[Document]")) {
    const docName = content.replace(/\[Document\]|\[Brochure\]/g, "").trim() || "Golden-Acres-Brochure.pdf";
    const lowerName = docName.toLowerCase();
    const fileUrl = lowerName.includes("balaji")
      ? "/Sri-Balaji-Nagar.pdf"
      : lowerName.includes("anugrahaa")
        ? "/Anugrahaa-Meadows.pdf"
        : "/Golden-Acres-Melakondaiyure.pdf";

    return (
      <div
        className={`p-2.5 rounded-theme border flex items-center space-x-3 w-full ${
          isMe
            ? "bg-white/10 border-white/20 text-white"
            : "bg-theme-surface border-theme-border text-theme-text"
        }`}
      >
        <div
          className={`w-9 h-9 rounded-theme flex items-center justify-center shrink-0 ${
            isMe ? "bg-white/10 text-white" : "bg-theme-danger/10 text-theme-danger"
          }`}
        >
          <FileText className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold truncate leading-tight">{docName}</p>
          <p className={`text-[9px] mt-0.5 ${isMe ? "text-white/70" : "text-theme-muted"}`}>
            PDF Brochure • 4.8 MB
          </p>
        </div>
        <a
          href={fileUrl}
          download={docName.endsWith(".pdf") ? docName : `${docName}.pdf`}
          className={`p-1.5 rounded-theme cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring ${
            isMe
              ? "hover:bg-white/15 text-white"
              : "hover:bg-theme-surface text-theme-muted"
          }`}
          title="Download"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        </a>
      </div>
    );
  }

  if (content.includes("[Layout Map]") || content.includes("[Image]")) {
    const mapName = content.replace(/\[Image\]|\[Layout Map\]/g, "").trim() || "Project Layout Map";
    const src = mapName.toLowerCase().includes("balaji")
      ? "/sri_balaji_nagar_layout.png"
      : "/golden_acres_layout.png";

    return (
      <div className="space-y-1.5 w-full">
        <div className="rounded-theme overflow-hidden border border-theme-border max-h-36 bg-theme-surface">
          <img
            src={src}
            alt={mapName}
            className="w-full h-full object-cover"
          />
        </div>
        <p className="text-[10px] font-semibold truncate text-theme-text">{mapName}</p>
      </div>
    );
  }

  return <p className="leading-relaxed whitespace-pre-wrap">{content}</p>;
}
