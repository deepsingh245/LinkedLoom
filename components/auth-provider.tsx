// components/AuthProvider.tsx
'use client'

import { createContext, useContext } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ user, children }: { user: any; children: React.ReactNode }) {
    return (
        <AuthContext.Provider value={user}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
