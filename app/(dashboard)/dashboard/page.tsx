"use client";

import Link from "next/link";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, Eye, Heart, Library, PenLine, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { useAnalyticsDashboard } from "@/lib/query/hooks/use-analytics";
import { useScheduledPosts } from "@/lib/query/hooks/use-posts";
import { Routes } from "@/lib/routes";

const number = new Intl.NumberFormat("en-US");

export default function DashboardPage() {
    const { user, profile } = useAuth();
    const { data, isLoading: analyticsLoading } = useAnalyticsDashboard(user?.uid);
    const { data: scheduledPosts = [], isLoading: postsLoading } = useScheduledPosts(user?.uid);
    const loading = analyticsLoading || postsLoading;
    const totalContent = (data?.totalPosts ?? 0) + (data?.totalDrafts ?? 0);
    const nextPost = scheduledPosts[0];
    const welcomeName = profile?.displayName?.split(" ")[0] || "there";

    const metrics = [
        { label: "Total content", value: number.format(totalContent), note: `${data?.postsThisWeek ?? 0} published this week`, icon: Library, tint: "#e8f3f0", color: "#357d72" },
        { label: "Total views", value: data?.metrics?.views || "0", note: `${number.format(data?.totalLikes ?? 0)} likes`, icon: Eye, tint: "#edf2fa", color: "#5578a8" },
        { label: "Engagement rate", value: data?.metrics?.engagement || "0%", note: "Interactions per view", icon: Heart, tint: "#f7eef1", color: "#a6647b" },
        { label: "Scheduled", value: number.format(scheduledPosts.length), note: nextPost?.scheduledFor ? `Next ${formatDate(nextPost.scheduledFor)}` : "No upcoming posts", icon: CalendarDays, tint: "#f7f2e9", color: "#a67b37" },
    ];

    return (
        <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-5 text-[#20242b] md:space-y-7">
            <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#7d898f]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#4c9a70]" />Operations overview
                    </div>
                    <h1 className="text-[26px] font-semibold tracking-[-0.035em] text-[#20242b] md:text-[30px]">Good day, {welcomeName}</h1>
                    <p className="mt-1 text-sm text-[#748087]">Here&apos;s your LinkedIn publishing activity at a glance.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button asChild variant="outline" className="h-9 rounded-lg border-[#dfe4e7] bg-white px-3 text-xs text-[#46515a] hover:bg-[#f5f7f7]">
                        <Link href={Routes.CALENDAR}><CalendarDays className="mr-2 h-4 w-4" />Calendar</Link>
                    </Button>
                    <Button asChild className="h-9 rounded-lg bg-[#357d72] px-3 text-xs font-semibold text-white hover:bg-[#286c63]">
                        <Link href={Routes.CREATE_POST}><Plus className="mr-2 h-4 w-4" />Create post</Link>
                    </Button>
                </div>
            </section>

            <section aria-label="Publishing metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map(({ label, value, note, icon: Icon, tint, color }) => (
                    <Card key={label} className="rounded-xl border border-[#e2e6ea] bg-white p-4 shadow-none md:p-5">
                        <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-medium text-[#6c777f]">{label}</p>
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: tint, color }}><Icon className="h-4 w-4" /></span>
                        </div>
                        {loading ? <Skeleton className="mt-3 h-8 w-20 rounded-md" /> : <p className="mt-2 text-[27px] font-semibold leading-none tracking-[-0.04em] text-[#20242b]">{value}</p>}
                        {loading ? <Skeleton className="mt-2 h-3 w-28 rounded" /> : <p className="mt-2 truncate text-[11px] text-[#89939a]">{note}</p>}
                    </Card>
                ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
                <Card className="min-w-0 rounded-xl border border-[#e2e6ea] bg-white p-4 shadow-none md:p-5">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-semibold text-[#283139]">Publishing activity</h2>
                            <p className="mt-1 text-[11px] text-[#89939a]">Posts and engagement over the last 7 days</p>
                        </div>
                        <Badge variant="outline" className="rounded-md border-[#e5e9eb] bg-[#fafbfb] text-[10px] font-medium text-[#68747c]">Last 7 days</Badge>
                    </div>
                    {loading ? (
                        <Skeleton className="h-[230px] w-full rounded-lg" />
                    ) : data?.chartData?.length ? (
                        <div className="h-[230px] w-full" role="img" aria-label="Chart of daily publishing engagement">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.chartData} margin={{ top: 10, right: 8, bottom: 0, left: -22 }}>
                                    <defs>
                                        <linearGradient id="overviewEngagement" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#357d72" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#357d72" stopOpacity={0.015} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke="#edf0f2" vertical={false} />
                                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#89939a", fontSize: 10 }} dy={8} />
                                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#89939a", fontSize: 10 }} />
                                    <Tooltip cursor={{ stroke: "#cfd9d6", strokeDasharray: "3 3" }} contentStyle={{ border: "1px solid #e2e6ea", borderRadius: 10, boxShadow: "0 8px 24px rgba(32,36,43,.08)", fontSize: 12 }} />
                                    <Area type="monotone" dataKey="engagement" name="Interactions" stroke="#357d72" strokeWidth={2} fill="url(#overviewEngagement)" activeDot={{ r: 4, fill: "#357d72", stroke: "#fff", strokeWidth: 2 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex h-[230px] flex-col items-center justify-center rounded-lg border border-dashed border-[#dfe5e7] bg-[#fbfcfc] text-center">
                            <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-[#e8f3f0] text-[#357d72]"><PenLine className="h-4 w-4" /></span>
                            <p className="text-xs font-semibold text-[#46515a]">Your activity will appear here</p>
                            <p className="mt-1 max-w-[240px] text-[11px] text-[#89939a]">Publish or schedule a post to start building your activity history.</p>
                        </div>
                    )}
                </Card>

                <Card className="min-w-0 rounded-xl border border-[#e2e6ea] bg-white p-4 shadow-none md:p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-semibold text-[#283139]">Upcoming queue</h2>
                            <p className="mt-1 text-[11px] text-[#89939a]">Your next scheduled posts</p>
                        </div>
                        <Link href={Routes.CALENDAR} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#357d72] hover:text-[#286c63]">View calendar<ArrowRight className="h-3.5 w-3.5" /></Link>
                    </div>
                    {loading ? (
                        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[58px] w-full rounded-lg" />)}</div>
                    ) : scheduledPosts.length ? (
                        <div className="divide-y divide-[#edf0f2]">
                            {scheduledPosts.slice(0, 4).map((post, index) => (
                                <article key={post.id ?? `${post.scheduledFor}-${index}`} className="flex gap-3 py-3 first:pt-1 last:pb-1">
                                    <div className="mt-0.5 flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-lg bg-[#f3f6f5] text-[#55736d]">
                                        <span className="text-[8px] font-bold uppercase leading-none">{post.scheduledFor ? new Date(post.scheduledFor).toLocaleDateString("en-US", { month: "short" }) : "—"}</span>
                                        <span className="mt-0.5 text-[11px] font-semibold leading-none">{post.scheduledFor ? new Date(post.scheduledFor).getDate() : "—"}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="line-clamp-2 text-[11px] leading-[1.45] text-[#38434a]">{post.content}</p>
                                        <p className="mt-1 text-[10px] text-[#89939a]">{post.scheduledFor ? formatDate(post.scheduledFor) : "Date not set"}</p>
                                    </div>
                                    <Badge variant="scheduled" className="h-fit shrink-0 px-2 py-0.5 text-[9px]">Scheduled</Badge>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="flex min-h-[190px] flex-col items-center justify-center rounded-lg border border-dashed border-[#dfe5e7] bg-[#fbfcfc] px-5 text-center">
                            <CalendarDays className="mb-2 h-5 w-5 text-[#8b9c98]" />
                            <p className="text-xs font-semibold text-[#46515a]">Your queue is clear</p>
                            <p className="mt-1 max-w-[230px] text-[11px] text-[#89939a]">Schedule a post and it will show up here.</p>
                            <Button asChild variant="outline" size="sm" className="mt-3 h-8 rounded-lg border-[#dfe4e7] bg-white text-[11px] text-[#46515a]">
                                <Link href={Routes.CREATE_POST}><Plus className="mr-1.5 h-3.5 w-3.5" />Create a post</Link>
                            </Button>
                        </div>
                    )}
                </Card>
            </section>

            <section className="flex flex-col justify-between gap-3 rounded-xl border border-[#dce9e5] bg-[#eef6f3] p-4 sm:flex-row sm:items-center md:px-5">
                <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#357d72]"><ArrowUpRight className="h-4 w-4" /></span>
                    <div>
                        <p className="text-xs font-semibold text-[#2c4b43]">Keep your publishing rhythm steady</p>
                        <p className="mt-1 text-[11px] text-[#668078]">Review your calendar and line up your next post.</p>
                    </div>
                </div>
                <Link href={Routes.CALENDAR} className="inline-flex items-center gap-1 self-start text-[11px] font-semibold text-[#357d72] hover:text-[#286c63] sm:self-auto">Open calendar<ArrowDownRight className="h-3.5 w-3.5" /></Link>
            </section>
        </div>
    );
}

function formatDate(value: Date | string) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "Date not set";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
