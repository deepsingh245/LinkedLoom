"use client"

import { AlertTriangle } from "lucide-react"
import { firebaseMode } from "@/lib/firebase"

/**
 * Development-only warning for the "mixed" setup (local Functions emulator + cloud Auth/Firestore),
 * in which everything saved through Cloud Functions is written to the local emulator and never shows up here.
 */
export function FirebaseModeBanner() {
    if (process.env.NODE_ENV !== "development" || firebaseMode !== "mixed") return null
    return (
        <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
                <p className="font-semibold">Saved data won&apos;t appear in this setup</p>
                <p>
                    Cloud Functions run on your local emulator and save to the <strong>local</strong> database, but this browser signs in and reads from the
                    <strong> cloud</strong> project. Add <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true</code> to
                    <code className="rounded bg-amber-100 px-1">.env.local</code>, restart <code className="rounded bg-amber-100 px-1">npm run dev</code> and sign up a
                    local test account (or point <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_API_URL</code> at deployed functions).
                </p>
            </div>
        </div>
    )
}
