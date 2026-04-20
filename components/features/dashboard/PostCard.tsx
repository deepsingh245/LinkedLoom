"use client";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Post } from "@/types";
import { format } from "date-fns";
import { Calendar, Edit, MoreVertical, Trash2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SchedulePostDialog } from "./SchedulePostDialog";
import { SharedAlertDialog } from "@/components/shared/SharedAlertDialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
;

interface PostCardProps {
    post: Post;
    onUpdate: () => void;
}

export function PostCard({ post, onUpdate }: PostCardProps) {
    const [showSchedule, setShowSchedule] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const router = useRouter();

    const handleEdit = () => {
        localStorage.setItem("draft_post", JSON.stringify(post));
        router.push("/create");
    };

    const handleDelete = async () => {
        try {
            await api.firebaseService.deletePost(String(post.id));
            toast.success("Post deleted");
            onUpdate();
        } catch (error) {
            toast.error("Failed to delete post");
        }
    };

    const getBadgeVariant = (status: string): "default" | "outline" | "published" | "scheduled" | "draft" => {
        const lower = status.toLowerCase();
        if (lower === 'published') return 'published';
        if (lower === 'scheduled') return 'scheduled';
        if (lower === 'draft') return 'draft';
        return 'outline';
    };

    return (
        <>
            <div className="card hover-effect flex flex-col h-full bg-[#13131a] border-[#1e1e2a] rounded-xl overflow-hidden group">
                <div className="flex flex-row items-center justify-between p-4 pb-2 border-b border-[#1e1e2a]/50">
                    <div className="flex gap-2">
                        <Badge variant={getBadgeVariant(post.status)}>
                            {post.status}
                        </Badge>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-white">
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleEdit}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShowSchedule(true)}>
                                <Calendar className="mr-2 h-4 w-4" />
                                Schedule
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setShowDelete(true)}
                                className="text-red-600 focus:text-red-600"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                {post.imageUrl && (
                    <div className="px-4 pt-3">
                        <div className="rounded-lg overflow-hidden border border-[#1e1e2a] aspect-video">
                            <img src={post.imageUrl} alt="Post image" className="w-full h-full object-cover" />
                        </div>
                    </div>
                )}
                <div className="flex-1 p-4">
                    <p className="line-clamp-4 text-sm text-gray-400 whitespace-pre-wrap">
                        {post.content || "No content..."}
                    </p>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground p-4 border-t border-[#1e1e2a]/50 bg-[#0e0e16]/50 mt-auto">
                    {post.status.toLowerCase() === 'scheduled' ? (
                        <div className="flex items-center text-primary">
                            <Calendar className="mr-1.5 h-3.5 w-3.5" />
                            {post.date ? format(new Date(post.date), "MMM d, yyyy \u2022 h:mm a") : 'Date not set'}
                        </div>
                    ) : (
                        <div className="flex items-center">
                            <Calendar className="mr-1.5 h-3.5 w-3.5 opacity-70" />
                            <span>{post.date ? new Date(post.date).toLocaleDateString() : 'Date not set'}</span>
                        </div>
                    )}
                </div>
            </div>

            <SchedulePostDialog
                post={post}
                open={showSchedule}
                onOpenChange={setShowSchedule}
                onPostUpdated={onUpdate}
            />

            <SharedAlertDialog
                open={showDelete}
                onOpenChange={setShowDelete}
                title="Delete Post"
                description="Are you sure you want to delete this post? This action cannot be undone."
                confirmText="Delete"
                onConfirm={handleDelete}
            />
        </>
    );
}
