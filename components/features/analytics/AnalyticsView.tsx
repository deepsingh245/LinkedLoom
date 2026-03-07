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

export function AnalyticsView() {
    const user = useAuth();
    const [data, setData] = React.useState<any[]>([])
    const [metrics, setMetrics] = React.useState({ impressions: "0", followers: "0", engagement: "0%", views: "0" })

    React.useEffect(() => {
        const fetchData = async () => {
            if (!user?.uid) return;
            try {
                const dashboardData = await api.firebaseService.getAnalyticsDashboardData(user.uid)
                if (dashboardData) {
                    setData(dashboardData.chartData || [])
                    setMetrics(dashboardData.metrics || { impressions: "0", followers: "0", engagement: "0%", views: "0" })
                }
            } catch (e) {
                console.error("Failed to load analytics", e)
            }
        }
        fetchData()
    }, [user])

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard title="Total Impressions" value={metrics?.impressions} change="+12% from last week" />
                <MetricCard title="New Followers" value={metrics?.followers} change="+4% from last week" />
                <MetricCard title="Engagement Rate" value={metrics?.engagement} change="-0.2% from last week" />
                <MetricCard title="Profile Views" value={metrics?.views} change="+22% from last week" />
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-[#1e1e2a] border border-[#2a2a35] p-1 rounded-xl">
                    <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-[#2a2a35] data-[state=active]:text-white transition-all">Overview</TabsTrigger>
                    <TabsTrigger value="engagement" className="rounded-lg data-[state=active]:bg-[#2a2a35] data-[state=active]:text-white transition-all">Engagement</TabsTrigger>
                    <TabsTrigger value="demographics" className="rounded-lg data-[state=active]:bg-[#2a2a35] data-[state=active]:text-white transition-all">Demographics</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-6">
                    <div className="card bg-[#13131a] border-[#1e1e2a] rounded-xl overflow-hidden p-6 relative">
                        {/* Glow Effect */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>

                        <div className="mb-6 relative z-10">
                            <h3 className="text-xl font-bold tracking-tight text-white mb-1">Performance Over Time</h3>
                            <p className="text-sm text-gray-400">Views and Likes for the past 7 days.</p>
                        </div>
                        <div className="h-[400px] relative z-10 w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="name" className="text-sm font-medium" />
                                    <YAxis className="text-sm font-medium" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                                    />
                                    <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} />
                                    <Line type="monotone" dataKey="likes" stroke="hsl(var(--chart-2))" strokeWidth={2} />
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
                            <h3 className="text-xl font-bold tracking-tight text-white mb-1">Daily Engagement</h3>
                        </div>
                        <div className="h-[400px] relative z-10 w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                                    />
                                    <Bar dataKey="likes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function MetricCard({ title, value, change }: { title: string, value: string, change: string }) {
    const isPositive = change.startsWith('+');

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
