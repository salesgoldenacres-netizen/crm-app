import { useState, useEffect } from "react";

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  size: number;
  height: number;
  color: string;
  delay: number;
  duration: number;
  rotation: number;
}

interface ConfettiEffectProps {
  active: boolean;
}

export default function ConfettiEffect({ active }: ConfettiEffectProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (!active) {
      const t = setTimeout(() => {
        setPieces([]);
      }, 0);
      return () => clearTimeout(t);
    }
    const arr = Array.from({ length: 80 }).map((_, i) => {
      const size = 5 + Math.random() * 8;
      const height = size * (Math.random() > 0.5 ? 1.5 : 1);
      return {
        id: i,
        x: Math.random() * 100,
        y: -20 - Math.random() * 20,
        size,
        height,
        color: [
          "#0f5c4c",
          "#c9a227",
          "#147a64",
          "#e8c84a",
          "#0a4a3d",
          "#10b981",
        ][Math.floor(Math.random() * 6)],
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 2,
        rotation: Math.random() * 360,
      };
    });

    const timer1 = setTimeout(() => {
      setPieces(arr);
    }, 0);

    const timer2 = setTimeout(() => {
      setPieces([]);
    }, 5000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [active]);

  if (!active || pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-sm animate-fall"
          style={{
            left: `${p.x}%`,
            top: `${p.y}px`,
            width: `${p.size}px`,
            height: `${p.height}px`,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            animationIterationCount: 1,
            animationFillMode: "forwards",
          }}
        />
      ))}
    </div>
  );
}
