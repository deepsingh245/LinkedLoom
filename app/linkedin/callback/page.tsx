"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase"; // Ensure firebase.ts exports auth
import { signInWithCustomToken } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { dangerToast } from "@/lib/toast";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      setError("Invalid response from LinkedIn. Missing code or state parameters.");
      return;
    }

    const processCallback = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/exchangeLinkedInToken`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ code, state }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
           throw new Error(data.error?.message || "Failed to exchange token");
        }

        if (data.success && data.customToken) {
          // Sign the user into Firebase using the custom token
          await signInWithCustomToken(auth, data.customToken);

          toast.success("Successfully logged in with LinkedIn!");
          router.push("/dashboard"); 
        } else {
          throw new Error("Failed to authenticate LinkedIn.");
        }
      } catch (err: unknown) {
        console.error("Exchange error:", err);
        let errorMessage = "An error occurred while connecting LinkedIn.";
        if (err instanceof Error) {
            errorMessage = err.message;
        }
        setError(errorMessage);
      }
    };

    processCallback();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0c0c12] text-[#f0f0f8]">
        <h1 className="text-2xl font-bold text-[#f06464] mb-4">Connection Failed</h1>
        <p className="text-[#8888a0] max-w-md text-center">{error}</p>
        <button 
          onClick={() => router.push("/login")}
          className="mt-6 px-4 py-2 bg-[#1a1a24] rounded-lg border border-[#2a2a3a] text-[#e0e0f0] hover:bg-[#2a2a3a]"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0c0c12] text-[#f0f0f8]">
      <Loader2 className="w-8 h-8 animate-spin text-[#63d496] mb-4" />
      <h1 className="text-xl font-medium">Connecting your LinkedIn account...</h1>
      <p className="text-[#8888a0] text-sm mt-2">Please wait while we complete the setup.</p>
    </div>
  );
}

export default function LinkedInCallbackPage() {
  return (
    <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0c0c12]">
            <Loader2 className="animate-spin w-8 h-8 text-[#63d496]" />
        </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}
