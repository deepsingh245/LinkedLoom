"use client";

import React, { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { Post } from "@/types";
import { Routes } from "@/lib/routes";
import { Loader } from "@/components/ui/loader";
import { PostCard } from "@/components/features/dashboard/PostCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { User } from "firebase/auth"; 
import { cn } from "@/lib/utils";

type TabValues = "all" | "scheduled" | "drafts" | "published";

const SchedulePage: React.FC = () => {
    const user = useAuth() as User | null;
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabValues>("all");

    const fetchPosts = async () => {
        if (!user?.uid) return;
        try {
            setLoading(true);
            const data = await api.firebaseService.getAllPosts(user.uid);
            setPosts(data);
        } catch (error) {
            console.error("Failed to fetch posts", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.uid) {
            fetchPosts();
        } else if (user === null) {
            setLoading(false);
        }
    }, [user?.uid]);

    const filteredPosts = useMemo(() => {
        if (activeTab === "all") return posts;
        return posts.filter(p => p.status?.toLowerCase() === activeTab.replace("drafts", "draft").replace("published", "published").replace("scheduled", "scheduled"));
    }, [posts, activeTab]);

    if (loading) {
        return (
            <div className="h-[80vh] flex items-center justify-center">
                <Loader size="lg" />
            </div>
        )
    }

    const tabs: { label: string, value: TabValues }[] = [
        { label: "All Posts", value: "all" },
        { label: "Scheduled", value: "scheduled" },
        { label: "Drafts", value: "drafts" },
        { label: "Published", value: "published" },
    ];

    return (
        <div className="p-6 space-y-8 animate-fade-in pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Content Library</h2>
                    <p className="text-gray-400">Manage your scheduled posts and drafts</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/create">
                        <Button className="bg-gradient-to-br from-[#63d496] to-[#3db87a] text-[#0a1a10] hover:-translate-y-[1px] hover:shadow-[0_8px_24px_rgba(99,212,150,0.35)] active:translate-y-0 transition-all font-sans font-semibold border-none h-10 px-5 rounded-xl">
                            <Plus className="mr-2 h-4 w-4" />
                            New Post
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {tabs.map(tab => (
                    <button 
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                            activeTab === tab.value 
                                ? "bg-[#1e1e2a] text-white" 
                                : "text-gray-400 hover:text-white hover:bg-[#1a1a24]"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {filteredPosts.length === 0 ? (
                <div className="text-center py-12 border border-[#1e1e2a] bg-[#13131a] rounded-xl flex flex-col items-center justify-center min-h-[300px]">
                    <h3 className="text-lg font-medium text-white mb-2">No posts found</h3>
                    <p className="text-[#a0a0b0] mb-6">Start creating content to see it here.</p>
                    <Link href={Routes.CREATE_POST}>
                        <Button variant="outline" className="border-[#2a2a35] text-white hover:bg-[#1e1e2a]">Create First Post</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredPosts.map((post) => (
                        <PostCard key={post.id} post={post} onUpdate={fetchPosts} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default SchedulePage;
