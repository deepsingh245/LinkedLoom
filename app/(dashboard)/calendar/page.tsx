"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight, Bot, CalendarDays, Clock3, FileText, Pencil, Plus } from "lucide-react";
import { isAutopilotPost, normalizeStatus, statusMetaFor, statusPillClass } from "@/lib/posts/status";
import { PublishingHealthBanner } from "@/components/features/publishing/PublishingHealthBanner";
import { Post } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { EditPostDialog } from "@/components/features/dashboard/EditPostDialog";
import { useAuth } from "@/components/providers/auth-provider";
import { useScheduledPosts } from "@/lib/query/hooks/use-posts";
import { Routes } from "@/lib/routes";

// Posts the publisher already owns can't be edited here.
const canEdit = (post: Post) => !["PUBLISHING", "PUBLISHED", "RECONCILIATION_REQUIRED"].includes(normalizeStatus(post.status));

export default function CalendarPage() {
    const { user } = useAuth();
    const { data: scheduledPosts = [], isLoading } = useScheduledPosts(user?.uid);
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [showEdit, setShowEdit] = useState(false);

    const selectedPosts = useMemo(() => scheduledPosts
        .filter((post) => post.scheduledFor && new Date(post.scheduledFor).toDateString() === date?.toDateString())
        .sort((a, b) => new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime()), [scheduledPosts, date]);

    if (isLoading) {
        return (
            <div className="mx-auto w-full max-w-[1440px] space-y-6">
                <Skeleton className="h-16 w-2/3 rounded-xl" />
                <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]"><Skeleton className="h-[470px] rounded-xl" /><Skeleton className="h-[470px] rounded-xl" /></div>
            </div>
        );
    }

    const bookedDates = scheduledPosts.map((post) => post.scheduledFor ? new Date(post.scheduledFor) : null).filter((value): value is Date => !!value);
    const nextPost = scheduledPosts.filter((post) => post.scheduledFor).sort((a, b) => new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime())[0];

    return (
        <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-5 text-[#20242b] md:space-y-7">
            <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#7d898f]">Publishing / Calendar &amp; Queue</div>
                    <h1 className="text-[26px] font-semibold tracking-[-0.035em] text-[#20242b] md:text-[30px]">Calendar &amp; Queue</h1>
                    <p className="mt-1 text-sm text-[#748087]">Plan your LinkedIn publishing schedule and manage upcoming posts.</p>
                </div>
                <Button asChild className="h-9 self-start rounded-lg bg-[#357d72] px-3 text-xs font-semibold text-white hover:bg-[#286c63] sm:self-auto">
                    <Link href={Routes.CREATE_POST}><Plus className="mr-2 h-4 w-4" />Create post</Link>
                </Button>
            </section>

            <PublishingHealthBanner userId={user?.uid} />

            <section aria-label="Schedule summary" className="grid gap-3 sm:grid-cols-2">
                <Card className="flex items-center gap-3 rounded-xl border border-[#e2e6ea] bg-white p-4 shadow-none">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e8f3f0] text-[#357d72]"><CalendarDays className="h-4 w-4" /></span>
                    <div><p className="text-[10px] font-medium text-[#7c878e]">Scheduled posts</p><p className="mt-0.5 text-lg font-semibold leading-none text-[#283139]">{scheduledPosts.length}</p></div>
                </Card>
                <Card className="flex items-center gap-3 rounded-xl border border-[#e2e6ea] bg-white p-4 shadow-none">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#edf2fa] text-[#5578a8]"><Clock3 className="h-4 w-4" /></span>
                    <div className="min-w-0"><p className="text-[10px] font-medium text-[#7c878e]">Next in queue</p><p className="mt-0.5 truncate text-xs font-semibold text-[#38434a]">{nextPost?.scheduledFor ? format(new Date(nextPost.scheduledFor), "EEE, MMM d 'at' h:mm a") : "Nothing scheduled yet"}</p></div>
                </Card>
            </section>

            <section className="grid items-start gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
                <Card className="overflow-hidden rounded-xl border border-[#e2e6ea] bg-white shadow-none">
                    <div className="border-b border-[#edf0f2] px-4 py-3.5">
                        <h2 className="text-xs font-semibold text-[#38434a]">Select a date</h2>
                        <p className="mt-1 text-[10px] text-[#89939a]">Days with scheduled posts are highlighted.</p>
                    </div>
                    <CardContent className="p-3 md:p-4">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            className="w-full border-0 bg-white text-[#303a40]"
                            modifiers={{ booked: bookedDates }}
                            modifiersStyles={{ booked: { fontWeight: 700, color: "#286c63", background: "#e8f3f0", borderRadius: "8px" } }}
                        />
                        <div className="mt-2 flex items-center gap-2 border-t border-[#edf0f2] px-1 pt-3 text-[10px] text-[#89939a]">
                            <span className="h-2 w-2 rounded-full bg-[#357d72]" />Scheduled content
                        </div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-xl border border-[#e2e6ea] bg-white shadow-none">
                    <div className="flex flex-col gap-3 border-b border-[#edf0f2] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between md:px-5">
                        <div>
                            <h2 className="text-sm font-semibold text-[#303a40]">{date ? format(date, "EEEE, MMMM do") : "Select a date"}</h2>
                            <p className="mt-1 text-[10px] text-[#89939a]">{selectedPosts.length} post{selectedPosts.length === 1 ? "" : "s"} scheduled for this day</p>
                        </div>
                        <Badge variant="outline" className="w-fit rounded-md border-[#e4ebe8] bg-[#f8fbfa] text-[9px] font-medium text-[#5f746c]">Daily queue</Badge>
                    </div>
                    <CardContent className="min-h-[320px] p-4 md:p-5">
                        {selectedPosts.length === 0 ? (
                            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-[#dfe5e7] bg-[#fbfcfc] px-5 text-center">
                                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#f2f6f5] text-[#71837e]"><Clock3 className="h-5 w-5" /></span>
                                <p className="text-sm font-semibold text-[#38434a]">Nothing scheduled for this day</p>
                                <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#7c878e]">Choose a highlighted date to review its queue, or create a post and schedule it for this day.</p>
                                <Button asChild variant="outline" size="sm" className="mt-3 h-8 rounded-lg border-[#dfe4e7] bg-white text-[10px] text-[#46515a]">
                                    <Link href={Routes.CREATE_POST}><Plus className="mr-1.5 h-3.5 w-3.5" />Create a post</Link>
                                </Button>
                            </div>
                        ) : (
                            <ol className="space-y-2">
                                {selectedPosts.map((post) => (
                                    <li key={post.id}>
                                        <div className="flex w-full items-start gap-3 rounded-lg border border-[#e7ebed] bg-white p-3 text-left md:p-4">
                                            <span className="flex h-10 min-w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-[#f2f6f5] text-[#526f67]">
                                                <Clock3 className="mb-0.5 h-3.5 w-3.5" />
                                                <span className="text-[9px] font-semibold">{post.scheduledFor ? format(new Date(post.scheduledFor), "h:mm a") : "—"}</span>
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="line-clamp-3 block text-xs leading-relaxed text-[#39444b]">{post.content || "No post content"}</span>
                                                <span className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[#89939a]">
                                                    {isAutopilotPost(post)
                                                        ? <span className="inline-flex items-center gap-1 font-medium text-[#357d72]"><Bot className="h-3 w-3" />Autopilot · reschedule in Drafts</span>
                                                        : <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" />Scheduled post</span>}
                                                    {post.topic && <><span aria-hidden="true">·</span><span className="truncate">{post.topic}</span></>}
                                                </span>
                                            </span>
                                            <span className="flex shrink-0 flex-col items-end gap-2">
                                                <span className={`rounded-md border px-2 py-0.5 text-[9px] font-semibold ${statusPillClass(statusMetaFor(post).tone)}`}>{statusMetaFor(post).label}</span>
                                                {canEdit(post) && (
                                                    <Button type="button" size="sm" variant="outline" onClick={() => { setSelectedPost(post); setShowEdit(true); }} className="h-7 rounded-lg border-[#b9cdc7] bg-white px-2.5 text-[10px] font-medium text-[#286c63] hover:bg-[#e8f3f0]">
                                                        <Pencil className="mr-1 h-3 w-3" />Edit
                                                    </Button>
                                                )}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </CardContent>
                    {selectedPosts.length > 0 && <div className="flex items-center justify-between border-t border-[#edf0f2] px-4 py-3 text-[10px] text-[#89939a] md:px-5"><span>Use Edit on a post to change its content</span><Link href={Routes.SCHEDULE} className="inline-flex items-center gap-1 font-semibold text-[#357d72] hover:text-[#286c63]">Content library<ArrowRight className="h-3 w-3" /></Link></div>}
                </Card>
            </section>

            {selectedPost && <EditPostDialog post={selectedPost} open={showEdit} onOpenChange={setShowEdit} />}
        </div>
    );
}
