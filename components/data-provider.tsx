"use client"

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react"
import { useAuth } from "./auth-provider"
import { api } from "@/lib/api"
import { Post } from "@/types"
import { DashboardData } from "@/lib/firebase/interfaces"

interface DataContextType {
    posts: Post[]
    scheduledPosts: Post[]
    draftPosts: Post[]
    dashboardData: DashboardData | null
    loading: boolean
    syncing: boolean
    refreshData: () => Promise<void>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth()
    const [posts, setPosts] = useState<Post[]>([])
    const [scheduledPosts, setScheduledPosts] = useState<Post[]>([])
    const [draftPosts, setDraftPosts] = useState<Post[]>([])
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [hasLoadedInitially, setHasLoadedInitially] = useState(false)

    const fetchData = useCallback(async (isSync = false) => {
        if (!user?.uid) return
        
        if (isSync) setSyncing(true)
        else if (!hasLoadedInitially) setLoading(true)

        try {
            // Fetch everything in parallel
            const [allPosts, scheduled, drafts, analytics] = await Promise.all([
                api.firebaseService.getAllPosts(user.uid),
                api.firebaseService.getScheduledPosts(user.uid),
                api.firebaseService.getDraftPosts(user.uid),
                api.firebaseService.getAnalyticsDashboardData(user.uid)
            ])

            setPosts(allPosts || [])
            setScheduledPosts(scheduled || [])
            setDraftPosts(drafts || [])
            setDashboardData(analytics || {
                totalPosts: 0,
                totalDrafts: 0,
                totalScheduled: 0,
                totalFailed: 0,
                totalLikes: 0,
                totalComments: 0,
                totalShares: 0,
                postsThisWeek: 0,
                metrics: { 
                    views: "0", 
                    engagement: "0%",
                    impressions: "0",
                    followers: "0"
                },
                chartData: []
            })
            setHasLoadedInitially(true)
        } catch (error) {
            console.error("Error fetching data:", error)
        } finally {
            setLoading(false)
            setSyncing(false)
        }
    }, [user?.uid, hasLoadedInitially])

    useEffect(() => {
        if (user?.uid && !hasLoadedInitially) {
            fetchData()
        }
    }, [user?.uid, fetchData, hasLoadedInitially])

    const refreshData = async () => {
        await fetchData(true)
    }

    return (
        <DataContext.Provider value={{
            posts,
            scheduledPosts,
            draftPosts,
            dashboardData,
            loading,
            syncing,
            refreshData
        }}>
            {children}
        </DataContext.Provider>
    )
}

export const useData = () => {
    const context = useContext(DataContext)
    if (context === undefined) {
        throw new Error("useData must be used within a DataProvider")
    }
    return context
}
