import { toast } from "sonner"
import { CheckCircle2, AlertCircle, Info } from "lucide-react"

// Custom styled toasts using Sonner
export const successToast = (message: string) => {
    toast.success(message, {
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        className: "border-green-500/20 bg-green-50/50 dark:bg-green-900/10",
        duration: 3000,
        richColors: true,
        position: "top-center",
    })
}

export const dangerToast = (message: string) => {
    toast.error(message, {
        icon: <AlertCircle className="h-4 w-4 text-red-500" />,
        className: "border-red-500/20 bg-red-50/50 dark:bg-red-900/10",
        duration: 4000,
        richColors: true,
        position: "top-center",
    })
}

export const defaultToast = (message: string) => {
    toast(message, {
        icon: <Info className="h-4 w-4 text-blue-500" />,
        duration: 3000,
        richColors: true,
        position: "top-center",
    })
}
