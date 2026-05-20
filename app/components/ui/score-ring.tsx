"use client";

import { cn } from "@/app/lib/utils";

interface ScoreRingProps {
  score: number;
  size?: number;
  className?: string;
}

function toneForScore(score: number) {
  if (score >= 80) return "var(--mint)";
  if (score >= 60) return "var(--amber)";
  return "var(--coral)";
}

export function ScoreRing({ score, size = 62, className }: ScoreRingProps) {
  const strokeWidth = size > 80 ? 5 : 4;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const tone = toneForScore(score);

  return (
    <div className={cn("relative inline-flex items-center justify-center flex-shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span
        className="absolute font-mono font-semibold tabular-nums"
        style={{
          fontSize: size > 80 ? 20 : 14,
          color: tone,
        }}
      >
        {score}
      </span>
    </div>
  );
}
