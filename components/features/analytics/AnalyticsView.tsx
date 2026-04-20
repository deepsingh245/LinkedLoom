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
import { useData } from "@/components/data-provider";

const EmptyAnalyticsState = ({ router }: { router: ReturnType<typeof useRouter> }) => (
    <div className="flex flex-col items-center justify-center h-100 border-2 border-dashed border-[#1e1e2a] rounded-xl relative z-10 bg-[#0c0c12]/50 group hover:border-primary/30 transition-all duration-500">
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
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
            <Plus className="w-5 h-5 mr-2 stroke-3" />
            Start a New Post
        </Button>
    </div>
);

export function AnalyticsView() {
    const { dashboardData, loading } = useData();
    const router = useRouter();
    const isChartEmpty = !loading && (!dashboardData || (dashboardData.totalPosts === 0 && (!dashboardData.chartData || dashboardData.chartData.length === 0)));

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
                    
                    <div className="card bg-[#13131a] border border-[#1e1e2a] rounded-xl p-6 h-125 relative overflow-hidden">
                        <div className="space-y-2 mb-8">
                            <Skeleton className="h-7 w-48 bg-[#1e1e2a]" />
                            <Skeleton className="h-4 w-72 bg-[#1e1e2a]" />
                        </div>
                        <div className="flex items-end gap-2 h-75 mt-10">
                            {[40, 70, 45, 90, 65, 80, 55, 85].map((height, i) => (
                                <Skeleton key={i} className="flex-1 bg-[#1e1e2a]/50" style={{ height: `${height}%` }} />
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
                <StatsMetric title="Total Impressions" value={dashboardData?.metrics?.impressions || "0"} change="Total Reach" color="text-[#63d496]" />
                <StatsMetric title="Total Views" value={dashboardData?.metrics?.views || "0"} change="Active Views" color="text-[#6490d4]" />
                <StatsMetric title="Engagement Rate" value={dashboardData?.metrics?.engagement || "0%"} change="Avg. Interaction" color="text-[#c890f0]" />
                <StatsMetric title="Followers Grown" value={dashboardData?.metrics?.followers || "0"} change="Net Growth" color="text-[#f0b464]" />
            </div>

            <Tabs defaultValue="engagement" className="space-y-6">
                <TabsList className="bg-[#1a1a24] border border-[#2a2a3a] p-1 h-11 rounded-xl">
                    <TabsTrigger value="engagement" className="rounded-lg px-6 data-[state=active]:bg-primary data-[state=active]:text-black font-semibold transition-all">Engagement</TabsTrigger>
                    <TabsTrigger value="growth" className="rounded-lg px-6 data-[state=active]:bg-primary data-[state=active]:text-black font-semibold transition-all">Growth</TabsTrigger>
                </TabsList>

                <TabsContent value="engagement">
                    <Card className="bg-[#13131a]/50 border-[#1e1e2a] backdrop-blur-sm overflow-hidden rounded-2xl">
                        <CardHeader className="border-b border-white/5 bg-white/2 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl font-display font-bold text-[#f0f0f8]">Engagement Over Time</CardTitle>
                                    <CardDescription className="text-[#8888a0] mt-1">Detailed breakdown of likes, comments, and shares</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#63d496]/10 border border-[#63d496]/20">
                                        <div className="w-2 h-2 rounded-full bg-[#63d496]" />
                                        <span className="text-[11px] font-bold text-[#63d496] uppercase tracking-wider">Active</span>
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
                                                    <stop offset="5%" stopColor="#63d496" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#63d496" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2a" vertical={false} />
                                            <XAxis 
                                                dataKey="name" 
                                                stroke="#4a4a68" 
                                                fontSize={11} 
                                                tickLine={false} 
                                                axisLine={false}
                                                dy={10}
                                            />
                                            <YAxis 
                                                stroke="#4a4a68" 
                                                fontSize={11} 
                                                tickLine={false} 
                                                axisLine={false}
                                                tickFormatter={(value) => `${value}`}
                                            />
                                            <Tooltip 
                                                contentStyle={{ 
                                                    backgroundColor: '#1a1a24', 
                                                    border: '1px solid #2a2a3a',
                                                    borderRadius: '12px',
                                                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                                    color: '#f0f0f8'
                                                }}
                                                itemStyle={{ color: '#63d496' }}
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="engagement" 
                                                stroke="#63d496" 
                                                strokeWidth={3}
                                                dot={{ fill: '#63d496', strokeWidth: 2, r: 4, stroke: '#0c0c12' }}
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
                    <Card className="bg-[#13131a]/50 border-[#1e1e2a] backdrop-blur-sm overflow-hidden rounded-2xl">
                        <CardHeader className="border-b border-white/5 bg-white/2 p-6">
                            <CardTitle className="text-xl font-display font-bold text-[#f0f0f8]">Audience Growth</CardTitle>
                            <CardDescription className="text-[#8888a0] mt-1">Weekly new followers across platforms</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-8 px-6 pb-6">
                            {isChartEmpty ? (
                                <EmptyAnalyticsState router={router} />
                            ) : (
                                <div className="h-100 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2a" vertical={false} />
                                            <XAxis 
                                                dataKey="name" 
                                                stroke="#4a4a68" 
                                                fontSize={11} 
                                                tickLine={false} 
                                                axisLine={false}
                                                dy={10}
                                            />
                                            <YAxis 
                                                stroke="#4a4a68" 
                                                fontSize={11} 
                                                tickLine={false} 
                                                axisLine={false} 
                                            />
                                            <Tooltip 
                                                cursor={{fill: 'rgba(255,255,255,0.03)'}}
                                                contentStyle={{ 
                                                    backgroundColor: '#1a1a24', 
                                                    border: '1px solid #2a2a3a',
                                                    borderRadius: '12px',
                                                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                                    color: '#f0f0f8'
                                                }}
                                            />
                                            <Bar dataKey="views" fill="#6490d4" radius={[4, 4, 0, 0]} barSize={40} />
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
        <Card className="p-6 bg-[#13131a]/50 border-[#1e1e2a] hover:border-white/10 transition-all rounded-2xl backdrop-blur-sm group">
            <p className="text-[11px] font-bold text-[#5a5a78] uppercase tracking-wider mb-2 group-hover:text-[#8888a0] transition-colors">{title}</p>
            <div className="flex justify-between items-end">
                <h3 className="text-3xl font-display font-bold text-[#f0f0f8] tracking-tight">{value}</h3>
                <span className={`text-[12px] font-bold ${color} bg-white/5 px-2.5 py-1 rounded-lg`}>{change}</span>
            </div>
            <div className="mt-4 h-1 w-full bg-[#1a1a24] rounded-full overflow-hidden">
                <div className={`h-full bg-current ${color} opacity-30`} style={{ width: '65%' }} />
            </div>
        </Card>
    )
}
