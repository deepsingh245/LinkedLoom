"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Post } from "@/types"; // Import Post from types
import { Routes } from "@/lib/routes";
import { Loader } from "@/components/ui/loader";
import { PostCard } from "@/components/features/dashboard/PostCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider"; // Import useAuth
import { User } from "firebase/auth"; // Import User type if not already globally available

export default function SchedulePage() {
    const user = useAuth(); // Get user from auth context
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPosts = async () => {
        try {
            setLoading(true);
            // Use the new firebaseService function
            const data = await api.firebaseService.getDraftPosts(user.uid);
            setPosts(data);
        } catch (error) {
            console.error("Failed to fetch posts", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.uid) { // Only fetch if user is available
            fetchPosts();
        }
    }, [user.uid]); // Re-run effect when user.uid or fetchPosts changes

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader size="lg" />
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Content Library</h2>
                    <p className="text-gray-400">Manage your scheduled posts and drafts</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/create">
                        <Button className="btn-primary h-10 px-5 font-medium rounded-xl">
                            <Plus className="mr-2 h-4 w-4" />
                            New Post
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1e1e2a] text-white whitespace-nowrap transition-colors">
                    All Posts
                </button>
                <button className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-[#1a1a24] whitespace-nowrap transition-colors">
                    Scheduled
                </button>
                <button className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-[#1a1a24] whitespace-nowrap transition-colors">
                    Drafts
                </button>
                <button className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-[#1a1a24] whitespace-nowrap transition-colors">
                    Published
                </button>
            </div>

            {posts.length === 0 ? (
                <div className="text-center py-12 border rounded-lg bg-muted/10">
                    <h3 className="text-lg font-medium">No posts found</h3>
                    <p className="text-muted-foreground mb-4">Start creating content to see it here.</p>
                    <Link href={Routes.CREATE_POST}>
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
