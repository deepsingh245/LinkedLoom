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
import { Badge } from "@/components/ui/badge";

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
                    <h2 className="font-display text-3xl font-bold tracking-tight text-foreground mb-1">Dashboard</h2>
                    <p className="text-muted-foreground font-medium">Welcome back! Here&apos;s what&apos;s happening today.</p>
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
                <Card className="col-span-3 lg:col-span-3 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-accent">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="font-display text-[16px] font-semibold text-foreground">Views Over Time</h3>
                        <span className="text-[11px] text-muted-foreground bg-muted px-2.5 py-1 rounded-md">Last 8 weeks</span>
                    </div>
                    <CardContent className="p-0">
                        <div className="h-50 flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-xl bg-background/50">
                            Chart Placeholder (Recharts coming soon)
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="col-span-2 lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-accent">
                    <h3 className="font-display text-[16px] font-semibold text-foreground mb-4">Upcoming Posts</h3>
                    <CardContent className="p-0">
                        <div className="space-y-0">
                            {scheduledPosts?.length > 0 ? scheduledPosts.map((post, i) => (
                                <div key={i} className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12.5px] text-foreground/80 leading-[1.4] mb-1.25 line-clamp-2">{post.content}</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {post.scheduledFor 
                                                ? new Date(post.scheduledFor).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                : "No date"}
                                        </p>
                                    </div>
                                    <Badge variant="scheduled" className="shrink-0">Scheduled</Badge>
                                </div>
                            )) : (
                                <div className="text-sm text-muted-foreground text-center mt-8">No upcoming posts</div>
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
        <Card className="rounded-[20px] border border-border bg-card p-5 shadow-sm transition-all hover:border-accent hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between mb-3.5">
                <span className="text-[12px] font-bold text-muted-foreground/85 uppercase tracking-[1px]">{title}</span>
                <div style={{ backgroundColor: `${color}15`, color: color }} className="w-8 h-8 rounded-xl flex items-center justify-center border border-border/10">
                    <IconComponent className="h-4 w-4" />
                </div>
            </div>
            {loading ? (
                <Skeleton className="h-9 w-20 mb-1 rounded-lg" />
            ) : (
                <div className="font-display text-[32px] font-bold text-foreground tracking-[-1px] mb-1">{value}</div>
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
