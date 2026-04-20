import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-[20px] px-2.5 py-[3px] text-[11px] font-semibold tracking-[0.3px] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary border-transparent text-primary-foreground hover:bg-primary/80",
        pill: "bg-surface-container border border-primary/20 rounded-full px-4 py-1.5 shadow-[0_0_20px_rgba(105,246,184,0.1)] text-primary uppercase text-[10px] sm:text-xs font-bold tracking-widest",
        published:
          "border border-[#1a4030] bg-[#0d2318] text-[#63d496]",
        draft:
          "border border-[#2a2a18] bg-[#1a1a10] text-[#c8b464]",
        scheduled:
          "border border-[#1a2840] bg-[#0d1828] text-[#6490d4]",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
