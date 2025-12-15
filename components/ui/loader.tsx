import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: "sm" | "default" | "lg" | "xl";
}

export function Loader({ className, size = "default", ...props }: LoaderProps) {
    const sizeClasses = {
        sm: "h-4 w-4",
        default: "h-8 w-8",
        lg: "h-12 w-12",
        xl: "h-16 w-16",
    };

    return (
        <div className={cn("flex justify-center items-center", className)} {...props}>
            <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
        </div>
    );
}

export function PageLoader() {
    return (
        <div className="flex h-[50vh] w-full items-center justify-center">
            <Loader size="lg" />
        </div>
    )
}
