import { cn } from "@/app/lib/utils";

type ChipTone = "default" | "accent" | "mint" | "amber" | "coral" | "cyan" | "violet";

const TONE_CLASSES: Record<ChipTone, string> = {
  default: "bg-[var(--surface)] text-[var(--text-2)] border-[var(--border)]",
  accent: "bg-[var(--accent-soft)] text-[var(--accent)] border-transparent",
  mint: "bg-[var(--mint-soft)] text-[var(--mint)] border-transparent",
  amber: "bg-[var(--amber-soft)] text-[var(--amber)] border-transparent",
  coral: "bg-[var(--coral-soft)] text-[var(--coral)] border-transparent",
  cyan: "bg-[var(--cyan-soft)] text-[var(--cyan)] border-transparent",
  violet: "bg-[var(--violet-soft)] text-[var(--violet)] border-transparent",
};

interface ChipProps {
  tone?: ChipTone;
  children: React.ReactNode;
  className?: string;
}

export function Chip({ tone = "default", children, className }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
