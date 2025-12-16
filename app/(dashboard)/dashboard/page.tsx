'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { User } from "@/types";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { Post } from "@/types";

export default function DashboardPage() {
    const user = useAuth() as unknown as User;
    const [scheduledPosts, setScheduledPosts] = useState<Post[]>([]);
    const [dashboardData, setDashboardData] = useState({
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0
    })
    const getDashboardData = async () => {
        const data = await api.get('analytics/dashboard');
        setDashboardData(data.data.overview);
    }

    const getScheduledPosts = async () => {
        const data = await api.get('posts/scheduled');
        setScheduledPosts(data.data);
    }

    useEffect(() => {
        getDashboardData()
        getScheduledPosts()
    }, [])
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <Button asChild>
                    <Link href="/create">
                        <Plus className="mr-2 h-4 w-4" /> Create New Post
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard title="Total Posts" value={`${dashboardData?.totalPosts}`} change="" />
                <StatsCard title="Total Views" value={`${dashboardData?.totalLikes}`} change="" />
                <StatsCard title="Engagement Rate" value={`${dashboardData?.totalComments}`} change="" />
                <StatsCard title="Scheduled" value={`${scheduledPosts?.length}`} change="" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                            Chart Placeholder (Recharts coming soon)
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Upcoming Posts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {scheduledPosts?.map((post) => (
                                <div className="flex items-center">
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium leading-none">{post.content}</p>
                                        <p className="text-xs text-muted-foreground">{post.scheduledFor?.toDateString()}</p>
                                    </div>
                                    <div className="ml-auto font-medium text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full dark:bg-yellow-900 dark:text-yellow-100">Scheduled</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function StatsCard({ title, value, change }: { title: string, value: string, change: string }) {
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
