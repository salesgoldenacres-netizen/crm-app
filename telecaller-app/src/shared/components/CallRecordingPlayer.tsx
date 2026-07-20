import { useState, useEffect, useRef } from "react";

interface CallRecordingPlayerProps {
  duration: string;
}

export default function CallRecordingPlayer({ duration }: CallRecordingPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const togglePlay = () => {
    if (isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      intervalRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 100) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setIsPlaying(false);
            return 0;
          }
          return p + 5;
        });
      }, 300);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="mt-2 bg-theme-surface p-2.5 rounded-lg border border-theme-border flex items-center space-x-3 text-xs w-full max-w-sm">
      <button
        type="button"
        onClick={togglePlay}
        className="p-1.5 rounded-full bg-theme-accent hover:opacity-90 text-theme-accent-fg cursor-pointer transition-transform transform active:scale-95 flex items-center justify-center border-0"
        aria-label={isPlaying ? "Pause recording" : "Play recording"}
      >
        {isPlaying ? (
          <div className="w-2.5 h-2.5 flex space-x-0.5 items-center justify-center">
            <div className="w-0.5 h-2 bg-white animate-pulse"></div>
            <div className="w-0.5 h-2 bg-white animate-pulse"></div>
          </div>
        ) : (
          <svg
            className="w-2.5 h-2.5 fill-current text-white"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <div className="flex-1 space-y-1">
        <div className="flex justify-between text-[10px] text-theme-muted">
          <span className="font-semibold text-theme-muted">
            Call Recording - Simulated
          </span>
          <span className="font-bold text-theme-text">{duration}</span>
        </div>
        <div className="w-full bg-theme-border rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-theme-accent h-1.5 transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
