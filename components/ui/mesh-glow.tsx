import { cn } from "@/lib/utils";
import React from "react";

export function MeshGlow({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mesh-glow absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10", className)} {...props} />
  );
}
