"use client"

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Library, Eye, Heart, Calendar } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { User } from "firebase/auth";
import { DashboardData } from "@/lib/firebase/interfaces";
import { Post } from "@/types";
import { Routes } from "@/lib/routes";

import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
    const { user } = useAuth();
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [scheduledPosts, setScheduledPosts] = useState<Post[]>([]);
    const [loadingDashboard, setLoadingDashboard] = useState(true);
    const [loadingScheduled, setLoadingScheduled] = useState(true);

    const getDashboardData = async () => {
        if (!user?.uid) return;
        setLoadingDashboard(true);
        try {
            const data = await api.firebaseService.getAnalyticsDashboardData(user.uid);
            setDashboardData(data || { 
                totalPosts: 0, 
                totalDrafts: 0, 
                totalScheduled: 0, 
                totalFailed: 0, 
                totalLikes: 0, 
                totalComments: 0, 
                totalShares: 0, 
                postsThisWeek: 0 
            });
        } catch (error) {
            console.error("Dashboard data fetch error:", error);
            setDashboardData({ 
                totalPosts: 0, 
                totalDrafts: 0, 
                totalScheduled: 0, 
                totalFailed: 0, 
                totalLikes: 0, 
                totalComments: 0, 
                totalShares: 0, 
                postsThisWeek: 0 
            });
        } finally {
            setLoadingDashboard(false);
        }
    }

    const getScheduledPosts = async () => {
        if (!user?.uid) return;
        setLoadingScheduled(true);
        try {
            const data = await api.firebaseService.getScheduledPosts(user.uid);
            setScheduledPosts(data || []);
        } catch (error) {
            console.error("Scheduled posts fetch error:", error);
            setScheduledPosts([]);
        } finally {
            setLoadingScheduled(false);
        }
    }

    useEffect(() => {
        if (user?.uid) {
            getDashboardData();
            getScheduledPosts();
        }
    }, [user?.uid])

    // Calculate dynamic values
    const totalContent = (dashboardData?.totalPosts ?? 0) + (dashboardData?.totalDrafts ?? 0);
    const postsThisWeek = dashboardData?.postsThisWeek ?? 0;
    const views = dashboardData?.metrics?.views ?? "0";
    const engagement = dashboardData?.metrics?.engagement ?? "0%";
    
    let nextDate = "None";
    if (scheduledPosts?.length > 0) {
        const nextPost = [...scheduledPosts]
            .filter(p => p.scheduledFor)
            .sort((a, b) => new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime())[0];
        if (nextPost?.scheduledFor) {
            nextDate = new Date(nextPost.scheduledFor).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    }
    
    return (
        <div className="space-y-8 p-4 md:p-8  mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-[28px] font-display font-semibold tracking-[-0.5px] text-[#f0f0f8]">
                         Good morning 👋
                    </h2>
                    <p className="text-[#5a5a78] text-[14px] mt-1">Here's what's happening with your LinkedIn presence today.</p>
                </div>
                <Button className="bg-gradient-to-br from-[#63d496] to-[#3db87a] text-[#0a1a10] hover:-translate-y-[1px] hover:shadow-[0_8px_24px_rgba(99,212,150,0.35)] active:translate-y-0 transition-all font-sans font-semibold border-none h-auto px-[20px] py-[10px] text-[14px] rounded-[10px]" asChild>
                    <Link href={Routes.CREATE_POST}>
                        <Plus className="mr-2 h-[15px] w-[15px]" /> Create New Post
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard 
                    title="Total Content" 
                    value={`${totalContent}`} 
                    change={`${postsThisWeek} created this week`} color="#63d496" icon={Library} 
                    loading={loadingDashboard}
                />
                <StatsCard 
                    title="Total Views" 
                    value={`${views}`} 
                    change={`${dashboardData?.totalLikes ?? 0} likes, ${dashboardData?.totalComments ?? 0} comments`} color="#6490d4" icon={Eye} 
                    loading={loadingDashboard}
                />
                <StatsCard 
                    title="Engagement Rate" 
                    value={`${engagement}`} 
                    change="Interactions per view" color="#c890f0" icon={Heart} 
                    loading={loadingDashboard}
                />
                <StatsCard 
                    title="Scheduled" 
                    value={`${scheduledPosts?.length ?? 0}`} 
                    change={`Next: ${nextDate}`} color="#f0b464" icon={Calendar} 
                    loading={loadingScheduled}
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                <Card className="col-span-3 lg:col-span-3 rounded-[16px] border border-[#1e1e2a] bg-[#13131a] p-6 shadow-sm transition-all hover:border-[#2a2a3a]">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="font-display text-[16px] font-semibold text-[#e0e0f0]">Views Over Time</h3>
                        <span className="text-[11px] text-[#5a5a78] bg-[#1a1a24] px-[10px] py-[4px] rounded-md">Last 8 weeks</span>
                    </div>
                    <CardContent className="p-0">
                        <div className="h-[200px] flex items-center justify-center text-[#5a5a78] border border-dashed border-[#2a2a3a] rounded-xl bg-[#0c0c12]">
                            Chart Placeholder (Recharts coming soon)
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="col-span-2 lg:col-span-2 rounded-[16px] border border-[#1e1e2a] bg-[#13131a] p-6 shadow-sm transition-all hover:border-[#2a2a3a]">
                    <h3 className="font-display text-[16px] font-semibold text-[#e0e0f0] mb-4">Upcoming Posts</h3>
                    <CardContent className="p-0">
                        <div className="space-y-0">
                            {scheduledPosts?.length > 0 ? scheduledPosts.map((post, i) => (
                                <div key={i} className="flex items-start gap-3 py-3 border-b border-[#1a1a26] last:border-0">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12.5px] text-[#c0c0d8] leading-[1.4] mb-[5px] line-clamp-2">{post.content}</p>
                                        <p className="text-[11px] text-[#4a4a68]">
                                            {post.scheduledFor 
                                                ? new Date(post.scheduledFor).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                : "No date"}
                                        </p>
                                    </div>
                                    <div className="bg-[#0d1828] border border-[#1a2840] text-[#6490d4] text-[11px] font-semibold tracking-[0.3px] px-[10px] py-[3px] rounded-full flex-shrink-0">Scheduled</div>
                                </div>
                            )) : (
                                <div className="text-sm text-[#5a5a78] text-center mt-8">No upcoming posts</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function StatsCard({ title, value, change, color, icon: IconComponent, loading }: { title: string, value: string, change: string, color: string, icon: React.ElementType, loading?: boolean }) {
    return (
        <Card className="rounded-[16px] border border-[#1e1e2a] bg-[#13131a] p-5 shadow-sm transition-all hover:border-[#2a2a3a] hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
            <div className="flex items-start justify-between mb-[14px]">
                <span className="text-[12px] font-medium text-[#5a5a78] uppercase tracking-[0.8px]">{title}</span>
                <div style={{ backgroundColor: `${color}15`, color: color }} className="w-[30px] h-[30px] rounded-lg flex items-center justify-center">
                    <IconComponent className="h-4 w-4" />
                </div>
            </div>
            {loading ? (
                <Skeleton className="h-9 w-20 mb-1" />
            ) : (
                <div className="font-display text-[30px] font-semibold text-[#f0f0f8] tracking-[-0.5px] mb-1">{value}</div>
            )}
            {loading ? (
                <Skeleton className="h-4 w-28" />
            ) : (
                <div style={{ color: color }} className="text-[12px]">{change}</div>
            )}
        </Card>
    )
}
