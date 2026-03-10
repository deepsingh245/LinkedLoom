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

export function AnalyticsView() {
    const user = useAuth() as User;
    const [dashboardData, setDashboardData] = React.useState<DashboardData | null>(null)

    React.useEffect(() => {
        const fetchData = async () => {
            if (!user?.uid) return;
            try {
                const data = await api.firebaseService.getAnalyticsDashboardData(user.uid)
                if (data) {
                    setDashboardData(data)
                }
            } catch (e) {
                console.error("Failed to load analytics", e)
            }
        }
        fetchData()
    }, [user])

    const chartData = dashboardData?.chartData || [];

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
