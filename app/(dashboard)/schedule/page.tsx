"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Post } from "@/types";
import { Loader } from "@/components/ui/loader";
import { PostCard } from "@/components/features/dashboard/PostCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function SchedulePage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPosts = async () => {
        try {
            setLoading(true);
            const { data } = await api.get("/posts/drafts");
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
        return (
            <div className="h-full flex items-center justify-center">
                <Loader size="lg" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Content Library</h2>
                    <p className="text-muted-foreground">Manage your scheduled posts and drafts</p>
                </div>
                <Link href="/create">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        New Post
                    </Button>
                </Link>
            </div>

            {posts.length === 0 ? (
                <div className="text-center py-12 border rounded-lg bg-muted/10">
                    <h3 className="text-lg font-medium">No posts found</h3>
                    <p className="text-muted-foreground mb-4">Start creating content to see it here.</p>
                    <Link href="/create">
                        <Button variant="outline">Create First Post</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {posts.map((post) => (
                        <PostCard key={post.id} post={post} onUpdate={fetchPosts} />
                    ))}
                </div>
            )}
        </div>
    );
}
