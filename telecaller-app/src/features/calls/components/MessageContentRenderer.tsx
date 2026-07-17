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
          className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-all flex-shrink-0 hover:scale-105 active:scale-95 ${
            isMe
              ? "bg-white/20 hover:bg-white/30 text-white"
              : "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
          }`}
        >
          {isPlaying ? (
            <div className="flex space-x-0.5 justify-center items-center">
              <div
                className={`w-0.5 h-2 ${isMe ? "bg-white" : "bg-indigo-600 dark:bg-indigo-400"}`}
              ></div>
              <div
                className={`w-0.5 h-2 ${isMe ? "bg-white" : "bg-indigo-600 dark:bg-indigo-400"}`}
              ></div>
            </div>
          ) : (
            <span className="text-[10px] pl-[2px] text-current">▶</span>
          )}
        </button>
        <div className="flex-1 min-w-[120px]">
          {/* Waveform visual */}
          <div className="flex items-end space-x-0.5 h-5">
            {[25, 50, 35, 75, 60, 30, 55, 65, 40, 55, 30, 70, 45, 25].map((h, i) => {
              const isActive = i <= activeBarCount;
              const barColor = isMe
                ? isActive
                  ? "bg-white"
                  : "bg-white/30"
                : isActive
                  ? "bg-indigo-600 dark:bg-indigo-400"
                  : "bg-indigo-200 dark:bg-indigo-800";
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
            <span className={`text-[8px] ${isMe ? "text-indigo-200" : "text-slate-400 dark:text-slate-500"}`}>
              {isPlaying ? "Playing..." : "Voice Note"}
            </span>
            <span className={`text-[8px] ${isMe ? "text-indigo-200" : "text-slate-400 dark:text-slate-500"}`}>
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
        className={`p-2.5 rounded-xl border flex items-center space-x-3 w-full ${
          isMe
            ? "bg-white/10 border-white/20 text-white"
            : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
        }`}
      >
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            isMe ? "bg-white/10 text-white" : "bg-red-50 dark:bg-red-955/40 text-red-500"
          }`}
        >
          <FileText className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold truncate leading-tight">{docName}</p>
          <p className={`text-[9px] mt-0.5 ${isMe ? "text-indigo-200" : "text-slate-400"}`}>
            PDF Brochure • 4.8 MB
          </p>
        </div>
        <a
          href={fileUrl}
          download={docName.endsWith(".pdf") ? docName : `${docName}.pdf`}
          className={`p-1.5 rounded-lg cursor-pointer ${
            isMe
              ? "hover:bg-white/15 text-white"
              : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
          }`}
          title="Download"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <div className="rounded-lg overflow-hidden border border-slate-200/60 dark:border-slate-700/80 max-h-36 bg-slate-100 dark:bg-slate-800">
          <img
            src={src}
            alt={mapName}
            className="w-full h-full object-cover hover:scale-105 transition-all duration-300"
          />
        </div>
        <p className="text-[10px] font-bold truncate text-gray-700 dark:text-gray-300">{mapName}</p>
      </div>
    );
  }

  return <p className="leading-relaxed whitespace-pre-wrap">{content}</p>;
}
