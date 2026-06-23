"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import { RedditIcon } from "@/components/shared/Icons";

export default function RedditCallbackPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("Connecting your Reddit account...");

    useEffect(() => {
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        const exchangeToken = async () => {
            if (error) {
                setStatus("error");
                setMessage(errorDescription || "Reddit authorization failed.");
                return;
            }

            if (!code || !state) {
                setStatus("error");
                setMessage("Authorization code or state parameter missing.");
                return;
            }

            try {
                const currentUser = auth.currentUser;
                if (!currentUser) {
                    setStatus("error");
                    setMessage("You must be logged in to connect Reddit.");
                    return;
                }

                const idToken = await currentUser.getIdToken();
                const redirectUri = window.location.origin + "/integrations/reddit/callback";

                await api.firebaseService.exchangeRedditToken(code, state, redirectUri, idToken);

                setStatus("success");
                setMessage("Reddit account connected successfully!");
                toast.success("Reddit connected!");

                setTimeout(() => {
                    router.push("/settings/profile");
                }, 2000);
            } catch (err: unknown) {
                console.error("Reddit Token Exchange Error:", err);
                setStatus("error");
                setMessage(err instanceof Error ? err.message : "Failed to connect Reddit account.");
                toast.error("Reddit connection failed.");
            }
        };

        exchangeToken();
    }, [searchParams, router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-100">
                <CardHeader>
                    <CardTitle className="text-center flex items-center justify-center gap-2">
                        <RedditIcon className="w-5 h-5 text-[#ff4500]" />
                        Reddit Integration
                    </CardTitle>
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
                                onClick={() => router.push("/settings/profile")}
                                className="mt-4 text-sm text-primary hover:underline"
                            >
                                Return to Settings
                            </button>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
