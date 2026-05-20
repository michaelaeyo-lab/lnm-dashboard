import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/app/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--surface)] text-[var(--text-1)] border border-[var(--border)] hover:bg-[var(--surface-hover)]",
        primary:
          "bg-[var(--accent)] text-white hover:opacity-90",
        ghost:
          "text-[var(--text-2)] hover:bg-[var(--surface)] hover:text-[var(--text-1)]",
        destructive:
          "bg-[var(--coral-soft)] text-[var(--coral)] hover:opacity-90",
        success:
          "bg-[var(--mint-soft)] text-[var(--mint)] hover:opacity-90",
      },
      size: {
        default: "h-[34px] px-3",
        sm: "h-[28px] px-2.5 text-[12px]",
        lg: "h-[38px] px-4 text-[14px]",
        icon: "h-[28px] w-[28px] p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, leading, trailing, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
        {leading}
        {children}
        {trailing}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
