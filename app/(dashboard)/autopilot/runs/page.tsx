import { redirect } from "next/navigation";

// Old bookmark: this section now lives on the single Autopilot page.
export default function Page() {
    redirect("/autopilot#research");
}
