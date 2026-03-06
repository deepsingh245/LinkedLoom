// components/AuthProvider.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import { Routes } from "@/lib/routes"

const AuthContext = createContext<User | null>(null)

export function AuthProvider({ children, user: initialUser }: { children: React.ReactNode; user?: any }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user)
            setLoading(false)
            if (!user) {
                 router.push(Routes.LOGIN)
            }
        })
        return () => unsubscribe()
    }, [router])

    return (
        <AuthContext.Provider value={user}>
            {!loading && children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
