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
import { useAuth } from "@/components/providers/auth-provider"
import { usePosts, useScheduledPosts, useDraftPosts } from "@/lib/query/hooks/use-posts"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { SmartImage } from "@/components/ui/smart-image"

import { Post } from "@/types"

export default function SchedulePage() {
    const { user } = useAuth();
    const { data: posts = [], isLoading: postsLoading } = usePosts(user?.uid);
    const { data: scheduledPosts = [], isLoading: scheduledLoading } = useScheduledPosts(user?.uid);
    const { data: draftPosts = [] } = useDraftPosts(user?.uid);
    const loading = postsLoading || scheduledLoading;
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
            <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-6 animate-fade-in">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-11 w-32 rounded-xl" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-64 rounded-2xl" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-6 animate-fade-in text-[#20242b]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-[26px] font-semibold tracking-[-0.04em] text-[#20242b] md:text-[30px]">Content Library</h1>
                    <p className="mt-1 text-sm text-[#748087]">Manage drafts, scheduled posts, and published content.</p>
                </div>
                
                <Link href={Routes.CREATE_POST}>
                    <Button className="h-9 rounded-lg bg-[#357d72] px-3 text-xs font-semibold text-white hover:bg-[#286c63]">
                        <Plus className="h-4 w-4" />
                        Create post
                    </Button>
                </Link>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3.5 rounded-xl border border-[#e2e6ea] shadow-none">
                <div className="relative w-full sm:w-96 group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                    <Input 
                        placeholder="Search posts..." 
                        className="pl-10 bg-background border-border text-foreground h-11 rounded-xl focus:ring-primary/20 focus:border-primary/50 transition-all font-medium"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="flex-1 md:flex-none bg-background border-border text-muted-foreground hover:text-foreground hover:bg-accent h-11 rounded-xl transition-all font-semibold shadow-sm">
                                <Filter className="w-4 h-4 mr-2" />
                                Filter
                                {filterType !== 'all' && <Badge className="ml-2 bg-primary/20 text-primary text-[10px] h-4 min-w-4 px-1">{filterType}</Badge>}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 bg-popover border-border text-popover-foreground">
                            <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuCheckboxItem checked={filterType === 'all'} onCheckedChange={() => setFilterType('all')}>All Content</DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem checked={filterType === 'image'} onCheckedChange={() => setFilterType('image')}>Posts with Images</DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem checked={filterType === 'text'} onCheckedChange={() => setFilterType('text')}>Text Only</DropdownMenuCheckboxItem>
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuLabel>Sort Order</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setSortOrder('newest')} className="flex items-center justify-between">Newest First {sortOrder === 'newest' && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortOrder('oldest')} className="flex items-center justify-between">Oldest First {sortOrder === 'oldest' && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="h-11 bg-background p-1 rounded-xl border border-border flex gap-1">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className={cn("h-9 w-9 rounded-lg transition-all", viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                            onClick={() => setViewMode("grid")}
                        >
                            <Grid className="w-4 h-4" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className={cn("h-9 w-9 rounded-lg transition-all", viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                             onClick={() => setViewMode("list")}
                        >
                            <List className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="scheduled" className="w-full space-y-5">
                <TabsList className="bg-[#eff3f2] border border-[#e2e6ea] p-1 h-11 rounded-xl w-full sm:w-fit">
                    <TabsTrigger value="all" className="flex-1 sm:flex-none rounded-lg px-3 sm:px-5 h-9 data-[state=active]:bg-white data-[state=active]:text-[#286c63] data-[state=active]:shadow-sm font-semibold transition-all flex items-center justify-center gap-1.5 min-w-0 text-xs sm:text-sm">
                        <LayoutGrid className="w-4 h-4 shrink-0" />
                        <span className="truncate">All Content</span>
                    </TabsTrigger>
                    <TabsTrigger value="scheduled" className="flex-1 sm:flex-none rounded-lg px-3 sm:px-5 h-9 data-[state=active]:bg-white data-[state=active]:text-[#286c63] data-[state=active]:shadow-sm font-semibold transition-all flex items-center justify-center gap-1.5 min-w-0 text-xs sm:text-sm">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span className="truncate">Scheduled</span>
                    </TabsTrigger>
                    <TabsTrigger value="drafts" className="flex-1 sm:flex-none rounded-lg px-3 sm:px-5 h-9 data-[state=active]:bg-white data-[state=active]:text-[#286c63] data-[state=active]:shadow-sm font-semibold transition-all flex items-center justify-center gap-1.5 min-w-0 text-xs sm:text-sm">
                        <FileText className="w-4 h-4 shrink-0" />
                        <span className="truncate">Drafts</span>
                    </TabsTrigger>
                </TabsList>
                
                {/* ... existing content ... */}

                <TabsContent value="all" className="mt-0 outline-none">
                    <PostDisplay posts={processPosts(posts)} searchQuery={searchQuery} viewMode={viewMode} />
                </TabsContent>

                <TabsContent value="scheduled" className="mt-0 outline-none">
                    <PostDisplay posts={processPosts(scheduledPosts)} searchQuery={searchQuery} viewMode={viewMode} label="No scheduled posts" />
                </TabsContent>

                <TabsContent value="drafts" className="mt-0 outline-none">
                    <PostDisplay posts={processPosts(draftPosts)} searchQuery={searchQuery} viewMode={viewMode} label="No drafts found" />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function PostDisplay({ posts, searchQuery, viewMode, label = "No posts found" }: { posts: Post[], searchQuery: string, viewMode: "grid" | "list", label?: string }) {
    if (posts.length > 0) {
        if (viewMode === "grid") {
            return (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
                    {posts.map((post) => (
                        <PostCard key={post.id} post={post} />
                    ))}
                </div>
            )
        } else {
            return (
                <div className="space-y-4">
                    {posts.map((post) => (
                        <div key={post.id} className="group relative flex items-center justify-between p-4 bg-card border border-border rounded-2xl hover:border-primary/30 transition-all cursor-pointer">
                            <div className="flex items-center gap-4 flex-1">
                                {post.imageUrl ? (
                                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-border">
                                        <SmartImage src={post.imageUrl} alt="" className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground">
                                        <Type className="w-6 h-6" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{post.content}</p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {post.date ? new Date(post.date).toLocaleDateString() : 'No date'}</span>
                                        <span>•</span>
                                        <span className="uppercase font-bold tracking-wider">{post.status}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link href={Routes.CREATE_POST}>
                                    <Button variant="ghost" size="sm" className="h-8 rounded-lg hover:bg-accent text-muted-foreground">Edit</Button>
                                </Link>
                                <div className="h-8 w-px bg-border mx-2" />
                                <Badge variant="outline" className="border-border text-muted-foreground">{post.status}</Badge>
                            </div>
                        </div>
                    ))}
                </div>
            )
        }
    }

    return (
        <Card className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#dfe5e7] bg-white p-8 text-center shadow-none transition hover:border-[#cbdcd6]">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#e2e6ea] bg-[#f3f6f5] text-[#78848b]">
                <CalendarIcon className="h-5 w-5" />
            </div>
            <h3 className="mb-1 text-sm font-semibold text-[#38434a]">{label}</h3>
            <p className="mb-5 max-w-sm text-xs leading-5 text-[#7c878e]">
                {searchQuery ? "We couldn't find any posts matching your search criteria." : "Start organizing your content strategy by creating your first post."}
            </p>
            {!searchQuery && (
                <Link href={Routes.CREATE_POST}>
                    <Button variant="outline" className="h-9 rounded-lg border-[#dfe5e7] px-3 text-xs font-semibold text-[#46525a] hover:bg-[#f7f9f9]">
                        Create your first post
                    </Button>
                </Link>
            )}
        </Card>
    )
}
