import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[140px] w-full rounded-[10px] border border-[#2a2a3a] bg-[#0e0e16] px-[14px] py-[11px] text-[14px] font-sans leading-[1.6] text-[#e0e0f0] transition-colors placeholder:text-[#444460] focus-visible:outline-none focus-visible:border-[#63d496] focus-visible:shadow-[0_0_0_3px_rgba(99,212,150,0.1)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
