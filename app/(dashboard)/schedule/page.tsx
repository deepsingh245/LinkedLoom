"use client"

import { useState } from "react"
import { Calendar as CalendarIcon, Filter, List, Grid, Search, Plus, LayoutGrid, Clock, FileText, Type } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { Routes } from "@/lib/routes"
import { PostCard } from "@/components/features/dashboard/PostCard"
import { useData } from "@/components/data-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

import { Post } from "@/types"

export default function SchedulePage() {
    const { posts, scheduledPosts, draftPosts, loading, refreshData } = useData();
    const [searchQuery, setSearchQuery] = useState("")
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")
    const [filterType, setFilterType] = useState<"all" | "image" | "text">("all")

    const processPosts = (items: Post[]) => {
        let filtered = items?.filter(post => 
            post.content?.toLowerCase().includes(searchQuery.toLowerCase())
        ) || [];

        if (filterType === "image") {
            filtered = filtered.filter(post => post.imageUrl);
        } else if (filterType === "text") {
            filtered = filtered.filter(post => !post.imageUrl);
        }

        return [...filtered].sort((a, b) => {
            const dateA = new Date(a.date || a.createdAt || 0).getTime();
            const dateB = new Date(b.date || b.createdAt || 0).getTime();
            return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
        });
    };

    if (loading) {
        return (
            <div className="p-8 space-y-8 animate-fade-in max-w-400 mx-auto">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-48 bg-[#1e1e2a]" />
                    <Skeleton className="h-11 w-32 bg-[#1e1e2a] rounded-xl" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-64 rounded-2xl bg-[#1e1e2a]" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8 animate-fade-in max-w-400 mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-display font-bold text-[#f0f0f8] tracking-tight">Schedule</h1>
                    <p className="text-[#8888a0] mt-1 font-medium">Manage and organize your publishing strategy</p>
                </div>
                
                <Link href={Routes.CREATE_POST}>
                    <Button className="bg-linear-to-br from-[#63d496] to-[#3db87a] text-[#0a1a10] hover:-translate-y-px hover:shadow-[0_12px_28px_rgba(99,212,150,0.35)] active:translate-y-0 transition-all font-sans font-bold border-none h-11 px-6 rounded-xl shadow-lg ring-1 ring-white/10 flex items-center gap-2">
                        <Plus className="w-5 h-5 mr-2 stroke-[2.5]" />
                        Create New Post
                    </Button>
                </Link>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#13131a] p-4 rounded-2xl border border-[#1e1e2a] shadow-sm">
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a78] group-focus-within:text-primary transition-colors" />
                    <Input 
                        placeholder="Search posts..." 
                        className="pl-10 bg-[#0c0c12] border-[#1e1e2a] text-[#f0f0f8] h-11 rounded-xl focus:ring-primary/20 focus:border-primary/50 transition-all font-medium"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="flex-1 md:flex-none bg-[#0c0c12] border-[#1e1e2a] text-[#8888a0] hover:text-[#f0f0f8] hover:bg-[#1a1a24] h-11 rounded-xl transition-all font-semibold shadow-sm">
                                <Filter className="w-4 h-4 mr-2" />
                                Filter
                                {filterType !== 'all' && <Badge className="ml-2 bg-[#63d496]/20 text-[#63d496] text-[10px] h-4 min-w-4 px-1">{filterType}</Badge>}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 bg-[#1a1a24] border-[#2a2a3a] text-white">
                            <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-[#2a2a3a]" />
                            <DropdownMenuCheckboxItem checked={filterType === 'all'} onCheckedChange={() => setFilterType('all')}>All Content</DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem checked={filterType === 'image'} onCheckedChange={() => setFilterType('image')}>Posts with Images</DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem checked={filterType === 'text'} onCheckedChange={() => setFilterType('text')}>Text Only</DropdownMenuCheckboxItem>
                            <DropdownMenuSeparator className="bg-[#2a2a3a]" />
                            <DropdownMenuLabel>Sort Order</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setSortOrder('newest')} className="flex items-center justify-between">Newest First {sortOrder === 'newest' && <div className="w-1.5 h-1.5 rounded-full bg-[#63d496]" />}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortOrder('oldest')} className="flex items-center justify-between">Oldest First {sortOrder === 'oldest' && <div className="w-1.5 h-1.5 rounded-full bg-[#63d496]" />}</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="h-11 bg-[#0c0c12] p-1 rounded-xl border border-[#1e1e2a] flex gap-1">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className={cn("h-9 w-9 rounded-lg transition-all", viewMode === "grid" ? "bg-[#63d496] text-[#0a1a10]" : "text-[#5a5a78] hover:text-[#f0f0f8]")}
                            onClick={() => setViewMode("grid")}
                        >
                            <Grid className="w-4 h-4" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className={cn("h-9 w-9 rounded-lg transition-all", viewMode === "list" ? "bg-[#63d496] text-[#0a1a10]" : "text-[#5a5a78] hover:text-[#f0f0f8]")}
                             onClick={() => setViewMode("list")}
                        >
                            <List className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="scheduled" className="w-full space-y-8">
                <TabsList className="bg-[#1a1a24] border border-[#1e1e2a] p-1 h-12 rounded-2xl">
                    <TabsTrigger value="all" className="rounded-xl px-8 h-10 data-[state=active]:bg-[#1e1e2a] data-[state=active]:text-[#63d496] font-bold transition-all flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4" />
                        All Content
                    </TabsTrigger>
                    <TabsTrigger value="scheduled" className="rounded-xl px-8 h-10 data-[state=active]:bg-[#1e1e2a] data-[state=active]:text-[#6490d4] font-bold transition-all flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Scheduled
                    </TabsTrigger>
                    <TabsTrigger value="drafts" className="rounded-xl px-8 h-10 data-[state=active]:bg-[#1e1e2a] data-[state=active]:text-[#f0b464] font-bold transition-all flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Drafts
                    </TabsTrigger>
                </TabsList>
                
                {/* ... existing content ... */}

                <TabsContent value="all" className="mt-0 outline-none">
                    <PostDisplay posts={processPosts(posts)} refreshData={refreshData} searchQuery={searchQuery} viewMode={viewMode} />
                </TabsContent>

                <TabsContent value="scheduled" className="mt-0 outline-none">
                    <PostDisplay posts={processPosts(scheduledPosts)} refreshData={refreshData} searchQuery={searchQuery} viewMode={viewMode} label="No scheduled posts" />
                </TabsContent>

                <TabsContent value="drafts" className="mt-0 outline-none">
                    <PostDisplay posts={processPosts(draftPosts)} refreshData={refreshData} searchQuery={searchQuery} viewMode={viewMode} label="No drafts found" />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function PostDisplay({ posts, refreshData, searchQuery, viewMode, label = "No posts found" }: { posts: Post[], refreshData: () => void, searchQuery: string, viewMode: "grid" | "list", label?: string }) {
    if (posts.length > 0) {
        if (viewMode === "grid") {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {posts.map((post) => (
                        <PostCard key={post.id} post={post} onUpdate={refreshData} />
                    ))}
                </div>
            )
        } else {
            return (
                <div className="space-y-4">
                    {posts.map((post) => (
                        <div key={post.id} className="group relative flex items-center justify-between p-4 bg-[#13131a]/50 border border-[#1e1e2a] rounded-2xl hover:border-primary/30 transition-all cursor-pointer">
                            <div className="flex items-center gap-4 flex-1">
                                {post.imageUrl ? (
                                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-[#2a2a3a]">
                                        <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 rounded-xl bg-[#1a1a24] border border-[#2a2a3a] flex items-center justify-center text-[#5a5a78]">
                                        <Type className="w-6 h-6" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-[#f0f0f8] line-clamp-1 group-hover:text-primary transition-colors">{post.content}</p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-[#5a5a78]">
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {post.date ? new Date(post.date).toLocaleDateString() : 'No date'}</span>
                                        <span>•</span>
                                        <span className="uppercase font-bold tracking-wider">{post.status}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link href={Routes.CREATE_POST}>
                                    <Button variant="ghost" size="sm" className="h-8 rounded-lg hover:bg-white/5 text-[#8888a0]">Edit</Button>
                                </Link>
                                <div className="h-8 w-px bg-[#1e1e2a] mx-2" />
                                <Badge variant="outline" className="border-[#1e1e2a] text-[#5a5a78]">{post.status}</Badge>
                            </div>
                        </div>
                    ))}
                </div>
            )
        }
    }

    return (
        <Card className="flex flex-col items-center justify-center p-20 bg-[#13131a] border border-[#1e1e2a] rounded-3xl shadow-sm hover:border-[#2a2a3a] transition-all">
            <div className="w-20 h-20 bg-[#1a1a24] rounded-3xl flex items-center justify-center mb-8 border border-[#2a2a3a] shadow-2xl group-hover:scale-110 transition-transform">
                <CalendarIcon className="w-10 h-10 text-[#5a5a78]" />
            </div>
            <h3 className="text-2xl font-bold text-[#f0f0f8] mb-3">{label}</h3>
            <p className="text-[#8888a0] text-center max-w-sm mb-10 leading-relaxed font-medium">
                {searchQuery ? "We couldn't find any posts matching your search criteria." : "Start organizing your content strategy by creating your first post."}
            </p>
            {!searchQuery && (
                <Link href={Routes.CREATE_POST}>
                    <Button variant="outline" className="border-[#2a2a3a] text-[#f0f0f8] hover:bg-[#1e1e2a] hover:border-primary/50 h-12 px-10 rounded-xl font-bold transition-all">
                        Create your first post
                    </Button>
                </Link>
            )}
        </Card>
    )
}
