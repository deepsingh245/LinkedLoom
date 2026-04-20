"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function LinkedInCallbackPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("Connecting your LinkedIn account...");

    useEffect(() => {
        const code = searchParams.get("code");
        const error = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        if (error) {
            setStatus("error");
            setMessage(errorDescription || "LinkedIn authorization failed.");
            return;
        }

        if (!code) {
            setStatus("error");
            setMessage("Authorization code missing.");
            return;
        }

        const exchangeToken = async () => {
            try {
                // Determine redirect URI based on current location (for dev vs prod)
                // It must match what was sent in getLinkedInAuthUrl
                // For now, we rely on the default in backend or pass current URL origin + path
                const redirectUri = window.location.origin + "/integrations/linkedin/callback";

                await api.firebaseService.exchangeLinkedInToken(code, redirectUri);
                setStatus("success");
                setMessage("LinkedIn account connected successfully!");
                toast.success("LinkedIn connected!");

                // Redirect after delay
                setTimeout(() => {
                    router.push("/dashboard/scheduler");
                }, 2000);
            } catch (err: any) {
                console.error("Token Exchange Error:", err);
                setStatus("error");
                setMessage(err.message || "Failed to connect LinkedIn account.");
                toast.error("Connection failed.");
            }
        };

        exchangeToken();
    }, [searchParams, router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-100">
                <CardHeader>
                    <CardTitle className="text-center">LinkedIn Integration</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-6 space-y-4">
                    {status === "loading" && (
                        <>
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            <p className="text-muted-foreground">{message}</p>
                        </>
                    )}
                    {status === "success" && (
                        <>
                            <CheckCircle2 className="h-10 w-10 text-green-500" />
                            <p className="text-green-600 font-medium">{message}</p>
                            <p className="text-xs text-muted-foreground">Redirecting...</p>
                        </>
                    )}
                    {status === "error" && (
                        <>
                            <XCircle className="h-10 w-10 text-destructive" />
                            <p className="text-destructive font-medium text-center">{message}</p>
                            <button
                                onClick={() => router.push("/dashboard/scheduler")}
                                className="mt-4 text-sm text-primary hover:underline"
                            >
                                Return to Dashboard
                            </button>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
