"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signInWithCustomToken } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Routes } from "@/lib/routes"
import { successToast, dangerToast } from "@/lib/toast"

function LinkedInCallbackContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [status, setStatus] = useState("Authenticating with LinkedIn...")

    useEffect(() => {
        const token = searchParams.get("token")
        
        if (!token) {
            setStatus("No authentication token found.")
            dangerToast("LinkedIn login failed: No token.")
            setTimeout(() => router.push(Routes.LOGIN), 2000)
            return
        }

        const authenticate = async () => {
            try {
                await signInWithCustomToken(auth, token)
                successToast("Successfully logged in with LinkedIn!")
                router.push(Routes.DASHBOARD)
            } catch (error: any) {
                console.error("LinkedIn Auth Error:", error)
                setStatus("Authentication failed. Please try again.")
                dangerToast("Failed to authenticate with LinkedIn.")
                setTimeout(() => router.push(Routes.LOGIN), 2000)
            }
        }

        authenticate()
    }, [searchParams, router])

    return (
        <div className="animate-fadeUp flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(99,212,150,0.5)]"></div>
            <p className="text-lg font-medium text-foreground tracking-tight">{status}</p>
        </div>
    )
}

export default function LinkedInCallbackPage() {
    return (
        <div className="flex items-center justify-center min-h-screen h-full w-full bg-background p-4">
            <Suspense fallback={
                <div className="animate-fadeUp flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(99,212,150,0.5)]"></div>
                    <p className="text-lg font-medium text-foreground tracking-tight">Loading...</p>
                </div>
            }>
                <LinkedInCallbackContent />
            </Suspense>
        </div>
    )
}
