"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Post } from "@/types";
import { format } from "date-fns";
import { AlertTriangle, Bot, Calendar, CalendarOff, Edit, ExternalLink, MoreVertical, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { Routes } from "@/lib/routes";
import { isAutopilotPost, normalizeStatus, statusMetaFor, statusPillClass } from "@/lib/posts/status";
import { usePublishPostById, useRepublishPost } from "@/lib/query/hooks/use-publishing";
import { useResolvePublishCheck } from "@/lib/query/hooks/use-research";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SchedulePostDialog } from "./SchedulePostDialog";
import { SharedAlertDialog } from "@/components/shared/SharedAlertDialog";
import { useAuth } from "@/components/providers/auth-provider";
import { useDeletePost, useUnschedulePost } from "@/lib/query/hooks/use-posts";
import { Badge } from "@/components/ui/badge";
import { SmartImage } from "@/components/ui/smart-image";

interface PostCardProps {
    post: Post;
}

export function PostCard({ post }: PostCardProps) {
    const [showSchedule, setShowSchedule] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const router = useRouter();
    const { user } = useAuth();

    const deleteMutation = useDeletePost(user?.uid);
    const unscheduleMutation = useUnschedulePost(user?.uid);
    const resolveMutation = useResolvePublishCheck(user?.uid);
    const publishNowMutation = usePublishPostById(user?.uid);
    const republishMutation = useRepublishPost(user?.uid);
    const [showRepublish, setShowRepublish] = useState(false);

    const status = normalizeStatus(post.status);
    const meta = statusMetaFor(post);
    const autopilot = isAutopilotPost(post);
    const queued = status === "SCHEDULED" || status === "RETRY_PENDING";
    // Approved Autopilot posts are rescheduled from Autopilot → Drafts so the draft stays in sync.
    const missed = status === "MISSED";
    const lockedByAutopilot = autopilot && (queued || missed);
    const canRepublish = status === "PUBLISHED" && (post.platforms?.includes("linkedin") || !!post.linkedinUrn);
    const busyPublishing = status === "PUBLISHING";
    const canSchedule = !autopilot && ["DRAFT", "FAILED", "PARTIAL", "MISSED", "UNKNOWN"].includes(status);
    const scheduledAt = post.scheduledFor ? new Date(post.scheduledFor) : null;

    const handleEdit = () => {
        localStorage.setItem("draft_post", JSON.stringify(post));
        router.push("/create");
    };

    const handleDelete = () => {
        deleteMutation.mutate(String(post.id));
    };

    const handleUnschedule = () => {
        unscheduleMutation.mutate(String(post.id));
    };

    return (
        <>
            <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-[#e2e6ea] bg-white transition hover:border-[#cbdcd6] hover:shadow-[0_5px_18px_rgba(32,36,43,0.06)]">
                <div className="flex flex-row items-center justify-between border-b border-[#edf0f2] p-4 pb-2">
                    <div className="flex flex-wrap gap-2">
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusPillClass(meta.tone)}`}>{meta.label}</span>
                        {autopilot && <Badge variant="outline" className="gap-1 text-[10px]"><Bot className="h-3 w-3" />Autopilot</Badge>}
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {!busyPublishing && status !== "PUBLISHED" && status !== "RECONCILIATION_REQUIRED" && (
                                <DropdownMenuItem onClick={handleEdit}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                </DropdownMenuItem>
                            )}
                            {lockedByAutopilot ? (
                                <DropdownMenuItem asChild>
                                    <Link href={Routes.AUTOPILOT_DRAFTS}><Bot className="mr-2 h-4 w-4" />Reschedule in Autopilot</Link>
                                </DropdownMenuItem>
                            ) : queued ? (
                                <DropdownMenuItem onClick={handleUnschedule}>
                                    <CalendarOff className="mr-2 h-4 w-4" />
                                    Unschedule
                                </DropdownMenuItem>
                            ) : canSchedule ? (
                                <DropdownMenuItem onClick={() => setShowSchedule(true)}>
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {status === "FAILED" || status === "PARTIAL" ? "Schedule again" : missed ? "Reschedule" : "Schedule"}
                                </DropdownMenuItem>
                            ) : null}
                            {canRepublish && (
                                <DropdownMenuItem onClick={() => setShowRepublish(true)}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Not on LinkedIn? Publish again…
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                                disabled={busyPublishing}
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
                        <div className="aspect-video overflow-hidden rounded-lg border border-[#e2e6ea]">
                            <SmartImage src={post.imageUrl} alt="Post image" className="w-full h-full object-cover" />
                        </div>
                    </div>
                )}
                <div className="flex-1 space-y-3 p-4">
                    <p className="line-clamp-4 text-sm text-muted-foreground whitespace-pre-wrap">
                        {post.content || "No content..."}
                    </p>
                    {post.error && ["FAILED", "PARTIAL", "RETRY_PENDING", "RECONCILIATION_REQUIRED", "MISSED"].includes(status) && (
                        <p className="flex items-start gap-1.5 rounded-lg border border-orange-200 bg-orange-50 p-2 text-[11px] leading-relaxed text-orange-800">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{post.error}
                        </p>
                    )}
                    {missed && (
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" disabled={publishNowMutation.isPending} onClick={() => publishNowMutation.mutate(String(post.id))} className="h-7 rounded-lg bg-[#357d72] px-2.5 text-[10px] text-white hover:bg-[#286c63]">Publish now</Button>
                            {lockedByAutopilot ? (
                                <Button asChild size="sm" variant="outline" className="h-7 rounded-lg border-[#9fbab3] px-2.5 text-[10px] text-[#286c63]"><Link href={Routes.AUTOPILOT_DRAFTS}>Reschedule</Link></Button>
                            ) : (
                                <Button size="sm" variant="outline" onClick={() => setShowSchedule(true)} className="h-7 rounded-lg border-[#9fbab3] px-2.5 text-[10px] text-[#286c63]">Reschedule</Button>
                            )}
                        </div>
                    )}
                    {status === "RECONCILIATION_REQUIRED" && (
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" disabled={resolveMutation.isPending} onClick={() => resolveMutation.mutate({ postId: String(post.id), outcome: "published" })} className="h-7 rounded-lg bg-[#357d72] px-2.5 text-[10px] text-white hover:bg-[#286c63]">It&apos;s live</Button>
                            <Button size="sm" variant="outline" disabled={resolveMutation.isPending} onClick={() => resolveMutation.mutate({ postId: String(post.id), outcome: "retry" })} className="h-7 rounded-lg px-2.5 text-[10px]">Publish now</Button>
                            <Button size="sm" variant="ghost" disabled={resolveMutation.isPending} onClick={() => resolveMutation.mutate({ postId: String(post.id), outcome: "failed" })} className="h-7 rounded-lg px-2.5 text-[10px] text-[#9c5d5d]">Leave it</Button>
                        </div>
                    )}
                    {status === "PUBLISHED" && post.publishedUrl && (
                        <a href={post.publishedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#357d72] hover:underline">
                            View post<ExternalLink className="h-3 w-3" />
                        </a>
                    )}
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-[#edf0f2] bg-[#fafbfb] p-4 text-xs text-[#758087]">
                    {queued || missed ? (
                        <div className={`flex items-center ${missed || meta.label === "Overdue" ? "text-orange-700" : "text-primary"}`}>
                            <Calendar className="mr-1.5 h-3.5 w-3.5" />
                            {scheduledAt ? format(scheduledAt, "MMM d, yyyy \u2022 h:mm a") : 'Date not set'}
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
            />

            <SharedAlertDialog
                open={showRepublish}
                onOpenChange={setShowRepublish}
                title="Publish this post again?"
                description="Only do this if you checked your LinkedIn profile and the post isn't there. If it is still live, this will post a duplicate."
                confirmText="Publish again"
                onConfirm={() => republishMutation.mutate(String(post.id))}
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

