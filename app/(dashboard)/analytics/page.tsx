import { AnalyticsView } from "@/components/features/analytics/AnalyticsView";

export default function AnalyticsPage() {
    return (
        <div className="h-full flex flex-col space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
            <AnalyticsView />
        </div>
    )
}
