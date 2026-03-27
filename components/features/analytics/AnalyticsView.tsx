"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts';

import { useAuth } from "@/components/auth-provider";
import { User } from "firebase/auth";
import { api } from "@/lib/api";
import * as React from "react";
import { DashboardData } from "@/lib/firebase/interfaces";
import { BarChart3, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Routes } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const EmptyAnalyticsState = ({ router }: { router: any }) => (
    <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed border-[#1e1e2a] rounded-xl relative z-10 bg-[#0c0c12]/50 group hover:border-primary/30 transition-all duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
        <div className="p-5 bg-[#1a1a24] border border-[#2a2a3a] rounded-2xl mb-6 shadow-xl group-hover:scale-110 transition-transform duration-500">
            <BarChart3 className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2 tracking-tight">No Publishing Data Yet</h3>
        <p className="text-[#8888a0] text-center px-6 max-w-[320px] mb-8 leading-relaxed text-sm">
            Your publishing activity will appear here. Start a new post to see your analytics.
        </p>
        <Button 
            className="bg-primary hover:bg-primary/90 text-black font-bold h-11 px-8 rounded-xl shadow-[0_8px_30px_rgb(99,212,150,0.2)] hover:shadow-[0_8px_30px_rgb(99,212,150,0.4)] transition-all active:scale-95"
            onClick={() => router.push(Routes.CREATE_POST)}
        >
            <Plus className="w-5 h-5 mr-2 stroke-[3]" />
            Start a New Post
        </Button>
    </div>
);

export function AnalyticsView() {
    const { user } = useAuth();
    const router = useRouter();
    const [dashboardData, setDashboardData] = React.useState<DashboardData | null>(null)
    const [loading, setLoading] = React.useState(true);
    
    const isChartEmpty = !loading && dashboardData?.totalPosts === 0;

    React.useEffect(() => {
        const fetchData = async () => {
            if (!user?.uid) return;
            try {
                setLoading(true);
                const data = await api.firebaseService.getAnalyticsDashboardData(user.uid)
                if (data) {
                    setDashboardData(data)
                }
            } catch (e) {
                console.error("Failed to load analytics", e)
            } finally {
                setLoading(false);
            }
        }
        fetchData()
    }, [user])

    const chartData = dashboardData?.chartData || [];

    if (loading) {
        return (
            <div className="p-6 space-y-8 animate-fade-in pb-10">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="p-6 bg-[#13131a] border border-[#1e1e2a] rounded-xl relative overflow-hidden">
                            <Skeleton className="h-4 w-24 bg-[#1e1e2a] mb-4" />
                            <div className="flex justify-between items-end">
                                <Skeleton className="h-10 w-16 bg-[#1e1e2a]" />
                                <Skeleton className="h-6 w-12 rounded-full bg-[#1e1e2a]" />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-6">
                    <div className="bg-[#1e1e2a] h-11 w-64 rounded-xl border border-[#2a2a35] p-1 flex gap-1">
                        <Skeleton className="h-full flex-1 bg-[#2a2a35] rounded-lg" />
                        <Skeleton className="h-full flex-1 bg-transparent rounded-lg" />
                    </div>
                    
                    <div className="card bg-[#13131a] border border-[#1e1e2a] rounded-xl p-6 h-[500px] relative overflow-hidden">
                        <div className="space-y-2 mb-8">
                            <Skeleton className="h-7 w-48 bg-[#1e1e2a]" />
                            <Skeleton className="h-4 w-72 bg-[#1e1e2a]" />
                        </div>
                        <Skeleton className="h-[350px] w-full bg-[#1e1e2a]/50 rounded-lg" />
                        <div className="absolute inset-x-6 bottom-10 flex items-center justify-between pointer-events-none">
                            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                                <Skeleton key={i} className="h-4 w-8 bg-[#1e1e2a]" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 animate-fade-in pb-10">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard title="Total Published" value={String(dashboardData?.totalPosts || 0)} change="All time" isPositive={true} />
                <MetricCard title="Scheduled Posts" value={String(dashboardData?.totalScheduled || 0)} change="Upcoming" isPositive={true} />
                <MetricCard title="Draft Posts" value={String(dashboardData?.totalDrafts || 0)} change="In progress" isPositive={true} />
                <MetricCard title="Failed Posts" value={String(dashboardData?.totalFailed || 0)} change="Require attention" isPositive={false} />
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-[#1e1e2a] border border-[#2a2a35] p-1 rounded-xl">
                    <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-[#2a2a35] data-[state=active]:text-white transition-all">Publishing Overview</TabsTrigger>
                    <TabsTrigger value="engagement" className="rounded-lg data-[state=active]:bg-[#2a2a35] data-[state=active]:text-white transition-all">Weekly Bar Chart</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-6">
                    <div className="card bg-[#13131a] border-[#1e1e2a] rounded-xl overflow-hidden p-6 relative">
                        {/* Glow Effect */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>

                        <div className="mb-6 relative z-10">
                            <h3 className="text-xl font-bold tracking-tight text-white mb-1">Posts Published Over Time</h3>
                            <p className="text-sm text-gray-400">Total number of published posts grouped by day of the week.</p>
                        </div>
                        <div className="h-[400px] relative z-10 w-full mt-4">
                            {isChartEmpty ? (
                                <EmptyAnalyticsState router={router} />
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis dataKey="name" className="text-sm font-medium" />
                                        <YAxis className="text-sm font-medium" allowDecimals={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                                        />
                                        <Line type="monotone" dataKey="posts" name="Posts Published" stroke="hsl(var(--primary))" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="engagement" className="space-y-6">
                    <div className="card bg-[#13131a] border-[#1e1e2a] rounded-xl overflow-hidden p-6 relative">
                         {/* Glow Effect */}
                         <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>

                        <div className="mb-6 relative z-10">
                            <h3 className="text-xl font-bold tracking-tight text-white mb-1">Daily Publishing Bar</h3>
                        </div>
                        <div className="h-[400px] relative z-10 w-full mt-4">
                            {isChartEmpty ? (
                                <EmptyAnalyticsState router={router} />
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis dataKey="name" />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                                        />
                                        <Bar dataKey="posts" name="Posts Published" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function MetricCard({ title, value, change, isPositive }: { title: string, value: string, change: string, isPositive: boolean }) {
    return (
        <div className="card p-6 bg-[#13131a] border-[#1e1e2a] rounded-xl hover:border-primary/50 transition-all duration-300 relative overflow-hidden group">
            {/* Glow Effect on Hover */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

            <div className="flex flex-col relative z-10">
                <span className="text-sm font-medium text-gray-400 mb-2">{title}</span>
                <div className="flex items-end justify-between items-center">
                    <span className="text-3xl font-bold text-white tracking-tight">{value}</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {change}
                    </span>
                </div>
            </div>
        </div>
    )
}
