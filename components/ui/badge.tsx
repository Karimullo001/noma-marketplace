import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-transparent",
        accent: "bg-accent-50 text-accent-700 border-accent-200",
        terracotta: "bg-accent-50 text-accent-700 border-accent-200",
        violet: "bg-accent-50 text-accent-700 border-accent-200",
        success: "bg-emerald-50 text-emerald-700 border-emerald-200",
        warning: "bg-amber-50 text-amber-800 border-amber-200",
        danger: "bg-rose-50 text-rose-700 border-rose-200",
        muted: "bg-muted text-muted-foreground border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
