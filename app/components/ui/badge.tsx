import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/app/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[4px] px-[7px] py-[2px] text-[10.5px] font-medium leading-[1.5] whitespace-nowrap",
  {
    variants: {
      tone: {
        default: "bg-[var(--surface)] text-[var(--text-2)] border border-[var(--border)]",
        accent: "bg-[var(--accent-soft)] text-[var(--accent)]",
        mint: "bg-[var(--mint-soft)] text-[var(--mint)]",
        amber: "bg-[var(--amber-soft)] text-[var(--amber)]",
        coral: "bg-[var(--coral-soft)] text-[var(--coral)]",
        cyan: "bg-[var(--cyan-soft)] text-[var(--cyan)]",
        violet: "bg-[var(--violet-soft)] text-[var(--violet)]",
      },
      mono: {
        true: "font-[var(--font-mono)]",
        false: "",
      },
    },
    defaultVariants: {
      tone: "default",
      mono: true,
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, tone, mono, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, mono, className }))} {...props} />
  );
}

export { Badge, badgeVariants };
