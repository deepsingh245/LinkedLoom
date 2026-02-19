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
import { EditPostDialog } from "./EditPostDialog";
import { SchedulePostDialog } from "./SchedulePostDialog";
import { SharedAlertDialog } from "@/components/shared/SharedAlertDialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface PostCardProps {
    post: Post;
    onUpdate: () => void;
}

export function PostCard({ post, onUpdate }: PostCardProps) {
    const [showEdit, setShowEdit] = useState(false);
    const [showSchedule, setShowSchedule] = useState(false);
    const [showDelete, setShowDelete] = useState(false);

    const handleDelete = async () => {
        try {
            await api.firebaseService.deletePost(post.id);
            toast.success("Post deleted");
            onUpdate();
        } catch (error) {
            toast.error("Failed to delete post");
        }
    };

    return (
        <>
            <Card className="flex flex-col h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex gap-2">
                        <Badge variant={post.status === 'PUBLISHED' ? 'default' : post.status === 'SCHEDULED' ? 'secondary' : 'outline'}>
                            {post.status}
                        </Badge>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setShowEdit(true)}>
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
                </CardHeader>
                <CardContent className="flex-1 pt-4">
                    <p className="line-clamp-4 text-sm text-muted-foreground whitespace-pre-wrap">
                        {post.content || "No content..."}
                    </p>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground pt-4 border-t">
                    {post.scheduledFor ? (
                        <div className="flex items-center">
                            <Calendar className="mr-1 h-3 w-3" />
                            {format(new Date(post.scheduledFor), "PPP")}
                        </div>
                    ) : (
                        <span>Last updated: {new Date(post.updatedAt).toLocaleDateString()}</span>
                    )}
                </CardFooter>
            </Card>

            <EditPostDialog
                post={post}
                open={showEdit}
                onOpenChange={setShowEdit}
                onPostUpdated={onUpdate}
            />

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
