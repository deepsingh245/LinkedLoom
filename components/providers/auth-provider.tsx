// components/providers/auth-provider.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import { Routes } from "@/lib/routes"
import { UserProfile } from '@/types'
import { subscribeToUserProfile } from '@/lib/firebase/user'

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        let unsubscribeProfile: (() => void) | null = null

        const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
            if (unsubscribeProfile) {
                unsubscribeProfile()
                unsubscribeProfile = null
            }

            setUser(firebaseUser)

            if (firebaseUser) {
                unsubscribeProfile = subscribeToUserProfile(firebaseUser.uid, (userProfile) => {
                    setProfile(userProfile)
                    setLoading(false)
                })
            } else {
                setProfile(null)
                setLoading(false)
                router.push(Routes.LOGIN)
            }
        })

        return () => {
            unsubscribeAuth()
            if (unsubscribeProfile) unsubscribeProfile()
        }
    }, [router])

    return (
        <AuthContext.Provider value={{ user, profile, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
