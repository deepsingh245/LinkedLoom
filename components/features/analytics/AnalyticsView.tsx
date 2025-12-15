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

import { api } from "@/lib/api"
import * as React from "react"

export function AnalyticsView() {
    const [data, setData] = React.useState<any[]>([])
    const [metrics, setMetrics] = React.useState({ impressions: "0", followers: "0", engagement: "0%", views: "0" })

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/analytics/dashboard')
                setData(res.data.chartData)
                setMetrics(res.data.metrics)
            } catch (e) {
                console.error("Failed to load analytics", e)
                // Keep default empty state or show error
                // For demo/fallback, we can set mock data here if API fails
            }
        }
        fetchData()
    }, [])

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard title="Total Impressions" value={metrics?.impressions} change="+12% from last week" />
                <MetricCard title="New Followers" value={metrics?.followers} change="+4% from last week" />
                <MetricCard title="Engagement Rate" value={metrics?.engagement} change="-0.2% from last week" />
                <MetricCard title="Profile Views" value={metrics?.views} change="+22% from last week" />
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="engagement">Engagement</TabsTrigger>
                    <TabsTrigger value="demographics">Demographics</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Performance Over Time</CardTitle>
                            <CardDescription>Views and Likes for the past 7 days.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[400px]">
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
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="engagement" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Daily Engagement</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[400px]">
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
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function MetricCard({ title, value, change }: { title: string, value: string, change: string }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{change}</p>
            </CardContent>
        </Card>
    )
}
