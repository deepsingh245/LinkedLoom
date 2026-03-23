import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-br from-[#63d496] to-[#3db87a] text-[#0a1a10] hover:-translate-y-[1px] hover:shadow-[0_8px_24px_rgba(99,212,150,0.35)] active:translate-y-0 transition-all font-sans font-semibold border-none",
        gradient: "bg-gradient-to-r from-primary to-secondary text-on-primary-container font-bold hover:opacity-80 transition-all duration-300 active:scale-95 border-none",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-[#2a2a3a] bg-[#1a1a24] text-[#c0c0d8] hover:border-[#3a3a50] hover:bg-[#1e1e2c] hover:text-[#e0e0f0] font-sans font-medium transition-all",
        secondary:
          "border border-[#2a2a3a] bg-[#1a1a24] text-[#c0c0d8] hover:border-[#3a3a50] hover:bg-[#1e1e2c] hover:text-[#e0e0f0] font-sans font-medium transition-all",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        lime: "bg-[#b8ff52] text-black hover:bg-[#a6e64a] font-bold shadow-[0_0_20px_rgba(184,255,82,0.3)] hover:shadow-[0_0_30px_rgba(184,255,82,0.5)] transition-all border-none",
      },
      size: {
        default: "h-auto px-[20px] py-[10px] text-[14px] rounded-[10px]",
        sm: "h-auto px-[18px] py-[9px] text-[13.5px] rounded-[10px]",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
