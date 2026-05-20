import { Badge } from "./badge";

const STATUS_CONFIG: Record<string, { label: string; tone: "mint" | "amber" | "coral" | "accent" | "default" | "cyan" | "violet" }> = {
  draft: { label: "Draft", tone: "default" },
  generating: { label: "Generating", tone: "accent" },
  reviewing: { label: "Reviewing", tone: "amber" },
  approved: { label: "Approved", tone: "mint" },
  rejected: { label: "Rejected", tone: "coral" },
  writing: { label: "Writing", tone: "cyan" },
  published: { label: "Published", tone: "violet" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, tone: "default" as const };
  return (
    <Badge tone={config.tone} mono={false} className={className}>
      <span
        className="inline-block w-[6px] h-[6px] rounded-full flex-shrink-0"
        style={{ background: `var(--${config.tone === "default" ? "text-3" : config.tone})` }}
      />
      {config.label}
    </Badge>
  );
}
