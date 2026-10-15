"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Eye, FileText, Heart, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { useAnalyticsDashboard } from "@/lib/query/hooks/use-analytics";
import { Routes } from "@/lib/routes";
import { useRouter } from "next/navigation";

const tooltipStyle = {
    backgroundColor: "#fff",
    border: "1px solid #e2e6ea",
    borderRadius: 10,
    boxShadow: "0 8px 24px rgba(32,36,43,.08)",
    color: "#303a40",
    fontSize: 11,
};

function EmptyAnalyticsState({ onCreate }: { onCreate: () => void }) {
    return (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-[#dfe5e7] bg-[#fbfcfc] px-5 text-center">
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f3f0] text-[#357d72]"><BarChart3 className="h-5 w-5" /></span>
            <h3 className="text-sm font-semibold text-[#38434a]">No publishing data yet</h3>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#7c878e]">Publish a post to start building your engagement and publishing activity history.</p>
            <Button onClick={onCreate} className="mt-3 h-9 rounded-lg bg-[#357d72] px-3 text-xs text-white hover:bg-[#286c63]"><Plus className="mr-2 h-4 w-4" />Create a post</Button>
        </div>
    );
}

export function AnalyticsView() {
    const { user } = useAuth();
    const { data, isLoading } = useAnalyticsDashboard(user?.uid);
    const router = useRouter();
    const hasPublishingData = (data?.totalPosts ?? 0) > 0;
    const chartData = data?.chartData ?? [];

    const metrics = [
        { title: "Published posts", value: String(data?.totalPosts ?? 0), note: `${data?.postsThisWeek ?? 0} created this week`, icon: FileText, tone: "#357d72", tint: "#e8f3f0" },
        { title: "Total views", value: data?.metrics?.views ?? "0", note: "Across published content", icon: Eye, tone: "#5578a8", tint: "#edf2fa" },
        { title: "Engagement rate", value: data?.metrics?.engagement ?? "0%", note: "Interactions per view", icon: Heart, tone: "#a6647b", tint: "#f7eef1" },
        { title: "Drafts", value: String(data?.totalDrafts ?? 0), note: "Waiting in your library", icon: FileText, tone: "#a67b37", tint: "#f7f2e9" },
    ];

    return (
        <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-5 text-[#20242b] md:space-y-7">
            <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#7d898f]">Insights / Analytics</div>
                    <h1 className="text-[26px] font-semibold tracking-[-0.035em] text-[#20242b] md:text-[30px]">Analytics &amp; Learning Signals</h1>
                    <p className="mt-1 text-sm text-[#748087]">Track publishing activity and audience engagement over the week.</p>
                </div>
                <span className="rounded-md border border-[#e4ebe8] bg-white px-2.5 py-1.5 text-[10px] font-medium text-[#667770]">Updated from your publishing data</span>
            </section>

            <section aria-label="Analytics metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map(({ title, value, note, icon: Icon, tone, tint }) => (
                    <Card key={title} className="rounded-xl border border-[#e2e6ea] bg-white p-4 shadow-none">
                        <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-medium text-[#6c777f]">{title}</p>
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: tint, color: tone }}><Icon className="h-4 w-4" /></span>
                        </div>
                        {isLoading ? <Skeleton className="mt-2 h-7 w-20 rounded-md" /> : <p className="mt-2 text-[25px] font-semibold leading-none tracking-[-0.04em] text-[#20242b]">{value}</p>}
                        {isLoading ? <Skeleton className="mt-2 h-3 w-28 rounded" /> : <p className="mt-2 truncate text-[11px] text-[#89939a]">{note}</p>}
                    </Card>
                ))}
            </section>

            {isLoading ? (
                <Card className="rounded-xl border border-[#e2e6ea] bg-white p-4 shadow-none md:p-5">
                    <Skeleton className="mb-5 h-9 w-48 rounded-lg" />
                    <Skeleton className="h-[360px] w-full rounded-lg" />
                </Card>
            ) : (
                <Tabs defaultValue="engagement" className="space-y-4">
                    <TabsList className="h-10 w-fit gap-1 rounded-lg border border-[#e2e6ea] bg-white p-1">
                        <TabsTrigger value="engagement" className="h-full rounded-md px-4 text-[11px] font-semibold text-[#7b858c] data-[state=active]:bg-[#e8f3f0] data-[state=active]:text-[#286c63]">Engagement</TabsTrigger>
                        <TabsTrigger value="publishing" className="h-full rounded-md px-4 text-[11px] font-semibold text-[#7b858c] data-[state=active]:bg-[#e8f3f0] data-[state=active]:text-[#286c63]">Publishing activity</TabsTrigger>
                    </TabsList>

                    <TabsContent value="engagement" className="mt-0">
                        <Card className="overflow-hidden rounded-xl border border-[#e2e6ea] bg-white shadow-none">
                            <CardHeader className="border-b border-[#edf0f2] bg-white px-4 py-4 md:px-5">
                                <CardTitle className="text-sm font-semibold text-[#303a40]">Engagement over time</CardTitle>
                                <CardDescription className="mt-1 text-[11px] text-[#89939a]">Likes, comments, and shares recorded on published posts by weekday.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 md:p-5">
                                {!hasPublishingData ? <EmptyAnalyticsState onCreate={() => router.push(Routes.CREATE_POST)} /> : (
                                    <div className="h-[320px] w-full" role="img" aria-label="Chart showing engagement on published posts by weekday">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartData} margin={{ top: 10, right: 8, bottom: 0, left: -22 }}>
                                                <CartesianGrid stroke="#edf0f2" vertical={false} />
                                                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#89939a", fontSize: 10 }} dy={8} />
                                                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#89939a", fontSize: 10 }} />
                                                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "#cfd9d6", strokeDasharray: "3 3" }} />
                                                <Line type="monotone" dataKey="engagement" name="Interactions" stroke="#357d72" strokeWidth={2.5} dot={{ fill: "#357d72", strokeWidth: 2, r: 3, stroke: "#fff" }} activeDot={{ r: 5, strokeWidth: 0 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="publishing" className="mt-0">
                        <Card className="overflow-hidden rounded-xl border border-[#e2e6ea] bg-white shadow-none">
                            <CardHeader className="border-b border-[#edf0f2] bg-white px-4 py-4 md:px-5">
                                <CardTitle className="text-sm font-semibold text-[#303a40]">Published posts by weekday</CardTitle>
                                <CardDescription className="mt-1 text-[11px] text-[#89939a]">See when published content has been going out.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 md:p-5">
                                {!hasPublishingData ? <EmptyAnalyticsState onCreate={() => router.push(Routes.CREATE_POST)} /> : (
                                    <div className="h-[320px] w-full" role="img" aria-label="Chart showing published posts by weekday">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData} margin={{ top: 10, right: 8, bottom: 0, left: -22 }}>
                                                <CartesianGrid stroke="#edf0f2" vertical={false} />
                                                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#89939a", fontSize: 10 }} dy={8} />
                                                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#89939a", fontSize: 10 }} />
                                                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(53,125,114,.06)" }} />
                                                <Bar dataKey="posts" name="Published posts" fill="#5578a8" radius={[5, 5, 0, 0]} maxBarSize={36} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
