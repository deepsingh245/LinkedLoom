"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { LinkedInCallback } from "@/components/features/integrations/LinkedInCallback";

export default function LinkedInCallbackPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <LinkedInCallback />
        </Suspense>
    );
}
