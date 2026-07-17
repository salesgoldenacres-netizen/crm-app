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
    <div className="mt-2 bg-gray-100 dark:bg-gray-800 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700/80 flex items-center space-x-3 text-xs w-full max-w-sm">
      <button
        type="button"
        onClick={togglePlay}
        className="p-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white cursor-pointer transition-transform transform active:scale-95 flex items-center justify-center"
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
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <div className="flex-1 space-y-1">
        <div className="flex justify-between text-[10px] text-gray-500">
          <span className="font-semibold text-gray-600 dark:text-gray-400">
            Call Recording - Simulated
          </span>
          <span className="font-bold">{duration}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-indigo-600 dark:bg-indigo-400 h-1.5 transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
