import { notFound } from "next/navigation";

// AI Autopilot is behind a feature flag until it's ready for users.
export default function AutopilotLayout({ children }: { children: React.ReactNode }) {
    if (process.env.NEXT_PUBLIC_AUTOPILOT_ENABLED !== "true") notFound();
    return <>{children}</>;
}
