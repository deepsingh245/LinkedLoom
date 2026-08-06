"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, LinkedinIcon } from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import { signInWithCustomToken } from "firebase/auth";

function LinkedInCallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("Connecting your LinkedIn account...");

    useEffect(() => {
        const exchangeToken = async () => {
            const code = searchParams.get("code");
            const state = searchParams.get("state");
            const error = searchParams.get("error");
            const errorDescription = searchParams.get("error_description");

            if (error) {
                setStatus("error");
                setMessage(errorDescription || "LinkedIn authorization failed.");
                return;
            }

            if (!code || !state) {
                setStatus("error");
                setMessage("Authorization code or state parameter missing.");
                return;
            }

            try {
                const redirectUri = window.location.origin + "/integrations/linkedin/callback";
                const res = await api.firebaseService.exchangeLinkedInToken(code, state, redirectUri);

                const alreadyLoggedIn = !!auth.currentUser;

                if (res.customToken && !alreadyLoggedIn) {
                    await signInWithCustomToken(auth, res.customToken);
                    setStatus("success");
                    setMessage("Logged in with LinkedIn successfully!");
                    toast.success("LinkedIn login successful!");
                    setTimeout(() => router.push("/dashboard"), 2000);
                } else {
                    // Connect flow — user already logged in; backend wrote linkedin field to Firestore
                    setStatus("success");
                    setMessage("LinkedIn account connected successfully!");
                    toast.success("LinkedIn connected!");
                    setTimeout(() => router.push("/settings/profile"), 2000);
                }
            } catch (err: unknown) {
                console.error("LinkedIn Token Exchange Error:", err);
                setStatus("error");
                setMessage(err instanceof Error ? err.message : "Failed to connect LinkedIn account.");
                toast.error("LinkedIn connection failed.");
            }
        };

        exchangeToken();
    }, [searchParams, router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-100">
                <CardHeader>
                    <CardTitle className="text-center flex items-center justify-center gap-2">
                        <LinkedinIcon className="w-5 h-5 text-[#0077b5]" />
                        LinkedIn Integration
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

export default function LinkedInCallbackPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center min-h-screen bg-background">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            }
        >
            <LinkedInCallbackContent />
        </Suspense>
    );
}
