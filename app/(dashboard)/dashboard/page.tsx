"use client";

import { Card, CardContent } from "@/components/ui/card";
import { 
    Calendar, 
    Heart, 
    Library, 
    Plus,
    Eye
} from "lucide-react";
import Link from "next/link";
import { useData } from "@/components/data-provider";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
    const { dashboardData, scheduledPosts, loading } = useData();

    // Calculate dynamic values
    const totalContent = (dashboardData?.totalPosts ?? 0) + (dashboardData?.totalDrafts ?? 0);
    const postsThisWeek = dashboardData?.postsThisWeek ?? 0;
    const nextPost = scheduledPosts?.length > 0 ? scheduledPosts[0] : null;
    const nextDate = nextPost?.scheduledFor 
        ? new Date(nextPost.scheduledFor).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : "No upcoming";

    return (
        <div className="p-6 space-y-8 animate-fade-in pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="font-display text-3xl font-bold tracking-tight text-[#f0f0f8] mb-1">Dashboard</h2>
                    <p className="text-[#8888a0] font-medium">Welcome back! Here&apos;s what&apos;s happening today.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/create">
                        <Button className="bg-linear-to-br from-[#63d496] to-[#3db87a] text-[#0a1a10] hover:-translate-y-px hover:shadow-[0_12px_28px_rgba(99,212,150,0.35)] active:translate-y-0 transition-all font-sans font-bold border-none h-11 px-6 rounded-xl shadow-lg ring-1 ring-white/10">
                            <Plus className="mr-2 h-5 w-5 stroke-[2.5]" />
                            Create Post
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard 
                    title="Total Content" 
                    value={`${totalContent}`} 
                    change={`${postsThisWeek} created this week`} color="#63d496" icon={Library} 
                    loading={loading}
                />
                <StatsCard 
                    title="Total Views" 
                    value={dashboardData?.metrics?.views || "0"} 
                    change={`${dashboardData?.totalLikes ?? 0} likes, ${dashboardData?.totalComments ?? 0} comments`} color="#6490d4" icon={Eye} 
                    loading={loading}
                />
                <StatsCard 
                    title="Engagement Rate" 
                    value={dashboardData?.metrics?.engagement || "0%"} 
                    change="Interactions per view" color="#c890f0" icon={Heart} 
                    loading={loading}
                />
                <StatsCard 
                    title="Scheduled" 
                    value={`${scheduledPosts?.length ?? 0}`} 
                    change={`Next: ${nextDate}`} color="#f0b464" icon={Calendar} 
                    loading={loading}
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                <Card className="col-span-3 lg:col-span-3 rounded-2xl border border-[#1e1e2a] bg-[#13131a] p-6 shadow-sm transition-all hover:border-[#2a2a3a]">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="font-display text-[16px] font-semibold text-[#e0e0f0]">Views Over Time</h3>
                        <span className="text-[11px] text-[#5a5a78] bg-[#1a1a24] px-2.5 py-1 rounded-md">Last 8 weeks</span>
                    </div>
                    <CardContent className="p-0">
                        <div className="h-50 flex items-center justify-center text-[#5a5a78] border border-dashed border-[#2a2a3a] rounded-xl bg-[#0c0c12]">
                            Chart Placeholder (Recharts coming soon)
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="col-span-2 lg:col-span-2 rounded-2xl border border-[#1e1e2a] bg-[#13131a] p-6 shadow-sm transition-all hover:border-[#2a2a3a]">
                    <h3 className="font-display text-[16px] font-semibold text-[#e0e0f0] mb-4">Upcoming Posts</h3>
                    <CardContent className="p-0">
                        <div className="space-y-0">
                            {scheduledPosts?.length > 0 ? scheduledPosts.map((post, i) => (
                                <div key={i} className="flex items-start gap-3 py-3 border-b border-[#1a1a26] last:border-0">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12.5px] text-[#c0c0d8] leading-[1.4] mb-1.25 line-clamp-2">{post.content}</p>
                                        <p className="text-[11px] text-[#4a4a68]">
                                            {post.scheduledFor 
                                                ? new Date(post.scheduledFor).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                : "No date"}
                                        </p>
                                    </div>
                                    <div className="bg-[#0d1828] border border-[#1a2840] text-[#6490d4] text-[11px] font-semibold tracking-[0.3px] px-2.5 py-0.75 rounded-full shrink-0">Scheduled</div>
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
        <Card className="rounded-[20px] border border-[#1e1e2a] bg-[#13131a] p-5 shadow-sm transition-all hover:border-[#2a2a3a] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
            <div className="flex items-start justify-between mb-3.5">
                <span className="text-[12px] font-bold text-[#5a5a78] uppercase tracking-[1px]">{title}</span>
                <div style={{ backgroundColor: `${color}15`, color: color }} className="w-8 h-8 rounded-xl flex items-center justify-center border border-white/5">
                    <IconComponent className="h-4 w-4" />
                </div>
            </div>
            {loading ? (
                <Skeleton className="h-9 w-20 mb-1 rounded-lg" />
            ) : (
                <div className="font-display text-[32px] font-bold text-[#f0f0f8] tracking-[-1px] mb-1">{value}</div>
            )}
            {loading ? (
                <Skeleton className="h-4 w-28 rounded-md" />
            ) : (
                <div style={{ color: color }} className="text-[12px] font-medium opacity-90">{change}</div>
            )}
        </Card>
    );
}

function Button({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button className={`inline-flex items-center justify-center border-none cursor-pointer transition-all ${className}`} {...props}>
            {children}
        </button>
    )
}
