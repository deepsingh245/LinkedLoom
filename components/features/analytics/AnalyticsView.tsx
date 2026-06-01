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

import { BarChart3, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Routes } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { useAnalyticsDashboard } from "@/lib/query/hooks/use-analytics";

const EmptyAnalyticsState = ({ router }: { router: ReturnType<typeof useRouter> }) => (
    <div className="flex flex-col items-center justify-center h-100 border-2 border-dashed border-border rounded-xl relative z-10 bg-muted/30 group hover:border-primary/30 transition-all duration-500">
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
        <div className="p-5 bg-card border border-border rounded-2xl mb-6 shadow-xl group-hover:scale-110 transition-transform duration-500">
            <BarChart3 className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2 tracking-tight">No Publishing Data Yet</h3>
        <p className="text-muted-foreground text-center px-6 max-w-[320px] mb-8 leading-relaxed text-sm">
            Your publishing activity will appear here. Start a new post to see your analytics.
        </p>
        <Button 
            className="bg-primary hover:bg-primary/90 text-black font-bold h-11 px-8 rounded-xl shadow-[0_8px_30px_rgb(99,212,150,0.2)] hover:shadow-[0_8px_30px_rgb(99,212,150,0.4)] transition-all active:scale-95"
            onClick={() => router.push(Routes.CREATE_POST)}
        >
            <Plus className="w-5 h-5 mr-2 stroke-3" />
            Start a New Post
        </Button>
    </div>
);


export function AnalyticsView() {
    const { user } = useAuth();
    const { data: dashboardData, isLoading: loading } = useAnalyticsDashboard(user?.uid);
    const router = useRouter();
    const isChartEmpty = !loading && (!dashboardData || (dashboardData.totalPosts === 0 && (!dashboardData.chartData || dashboardData.chartData.length === 0)));

    const chartData = dashboardData?.chartData || [];

    if (loading) {
        return (
            <div className="p-6 space-y-8 animate-fade-in pb-10">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="p-6 bg-card border border-border rounded-xl relative overflow-hidden">
                            <Skeleton className="h-4 w-24 mb-4" />
                            <div className="flex justify-between items-end">
                                <Skeleton className="h-10 w-16" />
                                <Skeleton className="h-6 w-12 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-6">
                    <div className="bg-muted h-11 w-64 rounded-xl border border-border p-1 flex gap-1">
                        <Skeleton className="h-full flex-1 rounded-lg" />
                        <Skeleton className="h-full flex-1 bg-transparent rounded-lg" />
                    </div>
                    
                    <div className="card bg-card border border-border rounded-xl p-6 h-125 relative overflow-hidden">
                        <div className="space-y-2 mb-8">
                            <Skeleton className="h-7 w-48" />
                            <Skeleton className="h-4 w-72" />
                        </div>
                        <div className="flex items-end gap-2 h-75 mt-10">
                            {[40, 70, 45, 90, 65, 80, 55, 85].map((height, i) => (
                                <Skeleton key={i} className="flex-1" style={{ height: `${height}%` }} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 animate-fade-in pb-10">
            {/* Stats Overview */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatsMetric title="Total Impressions" value={dashboardData?.metrics?.impressions || "0"} change="Total Reach" color="text-chart-1" />
                <StatsMetric title="Total Views" value={dashboardData?.metrics?.views || "0"} change="Active Views" color="text-chart-2" />
                <StatsMetric title="Engagement Rate" value={dashboardData?.metrics?.engagement || "0%"} change="Avg. Interaction" color="text-chart-3" />
                <StatsMetric title="Followers Grown" value={dashboardData?.metrics?.followers || "0"} change="Net Growth" color="text-chart-4" />
            </div>

            <Tabs defaultValue="engagement" className="space-y-6">
                <TabsList className="bg-muted border border-border p-1 h-11 rounded-xl">
                    <TabsTrigger value="engagement" className="rounded-lg px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold transition-all">Engagement</TabsTrigger>
                    <TabsTrigger value="growth" className="rounded-lg px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold transition-all">Growth</TabsTrigger>
                </TabsList>

                <TabsContent value="engagement">
                    <Card className="bg-card/50 border-border backdrop-blur-sm overflow-hidden rounded-2xl">
                        <CardHeader className="border-b border-border/50 bg-muted/20 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl font-display font-bold text-foreground">Engagement Over Time</CardTitle>
                                    <CardDescription className="text-muted-foreground mt-1">Detailed breakdown of likes, comments, and shares</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                        <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Active</span>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-8 px-6 pb-6">
                            {isChartEmpty ? (
                                <EmptyAnalyticsState router={router} />
                            ) : (
                                <div className="h-100 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData}>
                                            <defs>
                                                <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                            <XAxis 
                                                dataKey="name" 
                                                stroke="var(--muted-foreground)" 
                                                fontSize={11} 
                                                tickLine={false} 
                                                axisLine={false}
                                                dy={10}
                                            />
                                            <YAxis 
                                                stroke="var(--muted-foreground)" 
                                                fontSize={11} 
                                                tickLine={false} 
                                                axisLine={false}
                                                tickFormatter={(value) => `${value}`}
                                            />
                                            <Tooltip 
                                                contentStyle={{ 
                                                    backgroundColor: 'var(--card)', 
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '12px',
                                                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                                                    color: 'var(--foreground)'
                                                }}
                                                itemStyle={{ color: 'var(--primary)' }}
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="engagement" 
                                                stroke="var(--primary)" 
                                                strokeWidth={3}
                                                dot={{ fill: 'var(--primary)', strokeWidth: 2, r: 4, stroke: 'var(--background)' }}
                                                activeDot={{ r: 6, strokeWidth: 0 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="growth">
                    <Card className="bg-card/50 border-border backdrop-blur-sm overflow-hidden rounded-2xl">
                        <CardHeader className="border-b border-border/50 bg-muted/20 p-6">
                            <CardTitle className="text-xl font-display font-bold text-foreground">Audience Growth</CardTitle>
                            <CardDescription className="text-muted-foreground mt-1">Weekly new followers across platforms</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-8 px-6 pb-6">
                            {isChartEmpty ? (
                                <EmptyAnalyticsState router={router} />
                            ) : (
                                <div className="h-100 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                            <XAxis 
                                                dataKey="name" 
                                                stroke="var(--muted-foreground)" 
                                                fontSize={11} 
                                                tickLine={false} 
                                                axisLine={false}
                                                dy={10}
                                            />
                                            <YAxis 
                                                stroke="var(--muted-foreground)" 
                                                fontSize={11} 
                                                tickLine={false} 
                                                axisLine={false} 
                                            />
                                            <Tooltip 
                                                cursor={{fill: 'var(--muted)/10'}}
                                                contentStyle={{ 
                                                    backgroundColor: 'var(--card)', 
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '12px',
                                                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                                                    color: 'var(--foreground)'
                                                }}
                                            />
                                            <Bar dataKey="views" fill="var(--chart-2)" radius={[4, 4, 0, 0]} barSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function StatsMetric({ title, value, change, color }: { title: string, value: string, change: string, color: string }) {
    return (
        <Card className="p-6 bg-card border-border hover:border-accent transition-all rounded-2xl backdrop-blur-sm group">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 group-hover:text-muted-foreground/80 transition-colors">{title}</p>
            <div className="flex justify-between items-end">
                <h3 className="text-3xl font-display font-bold text-foreground tracking-tight">{value}</h3>
                <span className={`text-[12px] font-bold ${color} bg-muted px-2.5 py-1 rounded-lg`}>{change}</span>
            </div>
            <div className="mt-4 h-1 w-full bg-muted rounded-full overflow-hidden">
                <div className={`h-full bg-current ${color} opacity-30`} style={{ width: '65%' }} />
            </div>
        </Card>
    )
}
