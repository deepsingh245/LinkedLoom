// components/AuthProvider.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from '@/lib/firebase/utils'
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
                 router.push('/login')
            }
        })
        return () => unsubscribe()
    }, [router])

    // if (loading) return <div>Loading...</div>; // Opt-out of global loading for now to avoid flickering if not desired

    return (
        <AuthContext.Provider value={user}>
            {!loading && children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
