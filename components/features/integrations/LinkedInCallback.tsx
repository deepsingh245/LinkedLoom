"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { Routes } from "@/lib/routes";
import { toast } from "sonner";

/**
 * LinkedIn OAuth landing page (served at /linkedin/callback and /integrations/linkedin/callback).
 *  - Connect (user was logged in): the server attached LinkedIn to that same account. We never sign in again,
 *    so the user can't be switched to another account.
 *  - Login: the server returns a custom token for the matching (or newly created) account and we sign in with it.
 */
export function LinkedInCallback() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("Connecting your LinkedIn account...");
    // The authorization code is single-use: React strict mode runs effects twice in development.
    const started = useRef(false);

    useEffect(() => {
        if (started.current) return;
        started.current = true;

        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const oauthError = searchParams.get("error");

        const fail = (text: string) => {
            setStatus("error");
            setMessage(text);
        };

        if (oauthError) return fail(searchParams.get("error_description") || "LinkedIn authorization failed.");
        if (!code || !state) return fail("Invalid response from LinkedIn. Missing code or state parameters.");
        if (!api.firebaseService.isOwnLinkedInState(state)) return fail("This LinkedIn response doesn't match the sign-in you started in this browser. Please start again.");

        (async () => {
            try {
                const redirectUri = window.location.origin + window.location.pathname;
                const res = await api.firebaseService.exchangeLinkedInToken(code, state, redirectUri);

                if (res.mode === "login" && res.customToken) {
                    await signInWithCustomToken(auth, res.customToken);
                    setStatus("success");
                    setMessage("Logged in with LinkedIn.");
                    toast.success("LinkedIn login successful!");
                    setTimeout(() => router.replace(Routes.DASHBOARD), 1200);
                } else {
                    setStatus("success");
                    setMessage("LinkedIn connected to your account.");
                    toast.success("LinkedIn connected!");
                    setTimeout(() => router.replace(Routes.SETTINGS_CONNECTIONS), 1200);
                }
            } catch (error) {
                console.error("LinkedIn exchange error:", error);
                fail(error instanceof Error ? error.message : "Failed to connect LinkedIn.");
            }
        })();
    }, [searchParams, router]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-center">LinkedIn</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
                    {status === "loading" && <Loader2 className="h-10 w-10 animate-spin text-primary" />}
                    {status === "success" && <CheckCircle2 className="h-10 w-10 text-emerald-600" />}
                    {status === "error" && <XCircle className="h-10 w-10 text-destructive" />}
                    <p className="text-sm text-muted-foreground" role={status === "error" ? "alert" : "status"}>{message}</p>
                    {status === "error" && (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => router.replace(auth.currentUser ? Routes.SETTINGS_CONNECTIONS : Routes.LOGIN)}>
                                {auth.currentUser ? "Back to Connections" : "Back to login"}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
