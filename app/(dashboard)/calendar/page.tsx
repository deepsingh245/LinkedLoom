"use client";

import { useState } from "react";
import { Post } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { EditPostDialog } from "@/components/features/dashboard/EditPostDialog";
import { useData } from "@/components/data-provider";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

export default function CalendarPage() {
    const { scheduledPosts, loading, refreshData } = useData();
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [showEdit, setShowEdit] = useState(false);

    const posts = scheduledPosts || [];

    const selectedPosts = posts.filter(post =>
        post.scheduledFor &&
        new Date(post.scheduledFor).toDateString() === date?.toDateString()
    );

    if (loading) {
        return (
            <div className="p-8 space-y-8 animate-fade-in max-w-400 mx-auto">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-48 bg-[#1e1e2a]" />
                </div>
                <div className="grid md:grid-cols-[350px_1fr] gap-8">
                    <Skeleton className="h-100 rounded-2xl bg-[#1e1e2a]" />
                    <Skeleton className="h-150 rounded-2xl bg-[#1e1e2a]" />
                </div>
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8 animate-fade-in max-w-400 mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-display font-bold text-[#f0f0f8] tracking-tight">Calendar</h1>
                    <p className="text-[#8888a0] mt-1 font-medium">Visual timeline of your scheduled content</p>
                </div>
            </div>

            <div className="grid md:grid-cols-[350px_1fr] gap-8 h-full">
                <Card className="h-fit bg-[#13131a]/50 border-[#1e1e2a] backdrop-blur-sm rounded-2xl overflow-hidden shadow-xl">
                    <CardHeader className="bg-white/5 border-b border-white/5 p-5">
                        <CardTitle className="text-lg font-bold text-[#f0f0f8]">Select Date</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 bg-[#0c0c12]/50">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            className="bg-transparent border-0 w-full"
                            modifiers={{
                                booked: posts.map(p => p.scheduledFor ? new Date(p.scheduledFor) : null).filter((d): d is Date => !!d)
                            }}
                            modifiersStyles={{
                                booked: { fontWeight: 'bold', color: '#63d496', background: 'rgba(99,212,150,0.1)', borderRadius: '8px' }
                            }}
                        />
                    </CardContent>
                </Card>

                <Card className="flex-1 flex flex-col bg-[#13131a]/50 border-[#1e1e2a] backdrop-blur-sm rounded-2xl overflow-hidden shadow-xl">
                    <CardHeader className="bg-white/5 border-b border-white/5 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl font-bold text-[#f0f0f8]">
                                    {date ? format(date, "EEEE, MMMM do") : "Select a date"}
                                </CardTitle>
                                <CardDescription className="text-[#8888a0] mt-1">
                                    {selectedPosts.length} post{selectedPosts.length !== 1 && 's'} scheduled
                                </CardDescription>
                            </div>
                            <Badge className="bg-[#63d496]/10 text-[#63d496] border-[#63d496]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg">
                                Timeline
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto p-6 space-y-4 min-h-100">
                        {selectedPosts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                <div className="p-4 bg-[#1a1a24] rounded-2xl border border-[#2a2a3a]">
                                    <Clock className="w-8 h-8 text-[#5a5a78]" />
                                </div>
                                <div>
                                    <p className="text-[#f0f0f8] font-bold text-lg">No posts scheduled</p>
                                    <p className="text-[#8888a0] max-w-60 mt-1">Plan your content for this day to see it appear here.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {selectedPosts.map(post => (
                                    <div
                                        key={post.id}
                                        className="group relative flex items-center justify-between p-5 bg-[#0c0c12]/80 border border-[#1e1e2a] rounded-2xl hover:border-primary/30 transition-all cursor-pointer overflow-hidden"
                                        onClick={() => { setSelectedPost(post); setShowEdit(true); }}
                                    >
                                        <div className="absolute inset-0 bg-linear-to-r from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-[#1a1a24] flex items-center justify-center border border-[#2a2a3a] text-[#5a5a78] group-hover:text-primary transition-colors">
                                                <CalendarIcon className="w-5 h-5" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-bold text-[#f0f0f8] group-hover:text-white transition-colors line-clamp-1">{post.content}</p>
                                                <div className="flex items-center gap-3 text-xs text-[#5a5a78]">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {post.scheduledFor && format(new Date(post.scheduledFor), "h:mm a")}
                                                    </span>
                                                    {post.topic && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="capitalize">{post.topic}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <Badge className="relative font-bold text-[10px] bg-[#1a2840] text-[#6490d4] border-[#223a5e] px-3 py-1 rounded-full">{post.status}</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {selectedPost && (
                <EditPostDialog
                    post={selectedPost}
                    open={showEdit}
                    onOpenChange={setShowEdit}
                    onPostUpdated={refreshData}
                />
            )}
        </div>
    );
}
