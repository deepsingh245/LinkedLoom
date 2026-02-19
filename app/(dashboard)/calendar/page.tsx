"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Post } from "@/types";
import { Loader } from "@/components/ui/loader";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { EditPostDialog } from "@/components/features/dashboard/EditPostDialog";

export default function CalendarPage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [showEdit, setShowEdit] = useState(false);

    // Filter posts for the selected date
    const selectedPosts = posts.filter(post =>
        post.scheduledFor &&
        new Date(post.scheduledFor).toDateString() === date?.toDateString()
    );

    const fetchPosts = async () => {
        try {
            setLoading(true);
            const { data } = await api.get("/posts/scheduled"); // Or generic /posts if we want to show all
            setPosts(data);
        } catch (error) {
            console.error("Failed to fetch posts", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    if (loading) {
        return <Loader size="lg" />;
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Calendar</h2>
                <p className="text-muted-foreground">View your content schedule</p>
            </div>

            <div className="grid md:grid-cols-[300px_1fr] gap-8 h-full">
                <Card className="h-fit">
                    <CardContent className="p-0">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            className="rounded-md border-0 w-full"
                            modifiers={{
                                booked: posts.map(p => p.scheduledFor ? new Date(p.scheduledFor) : new Date()).filter(d => !isNaN(d.getTime()))
                            }}
                            modifiersStyles={{
                                booked: { fontWeight: 'bold', textDecoration: 'underline', color: 'var(--primary)' }
                            }}
                        />
                    </CardContent>
                </Card>

                <Card className="flex-1 flex flex-col">
                    <CardHeader>
                        <CardTitle>{date ? format(date, "EEEE, MMMM do, yyyy") : "Select a date"}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto space-y-4">
                        {selectedPosts.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">No posts scheduled for this day.</p>
                        ) : (
                            selectedPosts.map(post => (
                                <div
                                    key={post.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                                    onClick={() => { setSelectedPost(post); setShowEdit(true); }}
                                >
                                    <div className="space-y-1">
                                        <p className="font-medium line-clamp-1">{post.content}</p>
                                        <div className="text-xs text-muted-foreground">
                                            {post.scheduledFor && format(new Date(post.scheduledFor), "h:mm a")}
                                        </div>
                                    </div>
                                    <Badge>{post.status}</Badge>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            {selectedPost && (
                <EditPostDialog
                    post={selectedPost}
                    open={showEdit}
                    onOpenChange={setShowEdit}
                    onPostUpdated={fetchPosts}
                />
            )}
        </div>
    );
}
