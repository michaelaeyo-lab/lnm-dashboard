import { cn } from "@/app/lib/utils";
import {
  AlertCircle,
  FileText,
  Inbox,
  Search,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  alert: AlertCircle,
  file: FileText,
  inbox: Inbox,
  search: Search,
};

interface EmptyProps {
  icon?: string | LucideIcon;
  title: string;
  sub?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Empty({ icon = "inbox", title, sub, children, className }: EmptyProps) {
  const Icon = typeof icon === "string" ? ICON_MAP[icon] ?? Inbox : icon;

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-16 text-center", className)}>
      <div
        className="rounded-[var(--radius-lg)] p-3"
        style={{ background: "var(--surface)", color: "var(--text-3)" }}
      >
        <Icon size={24} />
      </div>
      <div>
        <div className="text-sm font-medium" style={{ color: "var(--text-1)" }}>{title}</div>
        {sub && <div className="text-xs mt-1" style={{ color: "var(--text-3)" }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}
