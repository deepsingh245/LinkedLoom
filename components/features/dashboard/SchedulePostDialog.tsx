"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { Post } from "@/types";
import { format, set, isBefore } from "date-fns";
import { Loader2, Linkedin } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

const XIcon = ({ className }: { className?: string }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.294 19.497h2.039L6.486 3.24H4.298l13.31 17.41z" />
    </svg>
);

const RedditIcon = ({ className }: { className?: string }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.056 1.597.011.138.011.273.011.412 0 2.303-2.56 4.182-5.72 4.182-3.16 0-5.72-1.879-5.72-4.182 0-.139 0-.274.011-.412a1.754 1.754 0 0 1-1.056-1.597c0-.968.786-1.754 1.754-1.754.463 0 .875.18 1.179.465 1.192-.834 2.83-1.397 4.637-1.48l.834-3.87a.25.25 0 0 1 .33-.197l3.066.646c.122-.323.438-.549.799-.549zm-9.29 9.389c-.615 0-1.114.499-1.114 1.114 0 .615.499 1.114 1.114 1.114.615 0 1.114-.499 1.114-1.114 0-.615-.499-1.114-1.114-1.114zm8.56 0c-.615 0-1.114.499-1.114 1.114 0 .615.499 1.114 1.114 1.114.615 0 1.114-.499 1.114-1.114 0-.615-.499-1.114-1.114-1.114zm-4.28 2.22c-1.433 0-2.46.745-2.61.895-.125.125-.125.328 0 .453s.328.125.453 0c.01-.01.822-.728 2.157-.728 1.334 0 2.146.718 2.156.728.125.125.328.125.454 0s.125-.328 0-.453c-.15-.15-1.177-.895-2.61-.895z" />
    </svg>
);

interface SchedulePostDialogProps {
    post: Post;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onPostUpdated: () => void;
}

export function SchedulePostDialog({
    post,
    open,
    onOpenChange,
    onPostUpdated,
}: SchedulePostDialogProps) {
    const { profile } = useAuth();
    
    const defaultDate = post.scheduledFor ? new Date(post.scheduledFor) : undefined;
    
    const [date, setDate] = useState<Date | undefined>(defaultDate);
    const [hour, setHour] = useState<string>(
        defaultDate ? defaultDate.getHours().toString().padStart(2, '0') : "09"
    );
    const [minute, setMinute] = useState<string>(
        defaultDate ? (Math.round(defaultDate.getMinutes() / 5) * 5).toString().padStart(2, '0') : "00"
    );
    const [loading, setLoading] = useState(false);
    const [connectingId, setConnectingId] = useState<string | null>(null);

    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

    const finalDate = useMemo(() => {
        if (!date) return undefined;
        return set(date, { hours: parseInt(hour), minutes: parseInt(minute), seconds: 0, milliseconds: 0 });
    }, [date, hour, minute]);

    const handleSchedule = async () => {
        if (!finalDate) {
            toast.error("Please select a date and time");
            return;
        }

        if (isBefore(finalDate, new Date())) {
            toast.error("You cannot schedule a post in the past.");
            return;
        }

        try {
            setLoading(true);
            await api.firebaseService.schedulePost(post.id, finalDate.toISOString());
            toast.success("Post scheduled successfully");
            onPostUpdated();
            onOpenChange(false);
        } catch (error) {
            toast.error("Failed to schedule post");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnectLinkedIn = async () => {
        try {
            setConnectingId("linkedin");
            const { url } = await api.firebaseService.getLinkedInAuthUrl();
            window.location.href = url;
        } catch (error) {
            console.error("Failed to connect LinkedIn", error);
            toast.error("Failed to connect LinkedIn");
            setConnectingId(null);
        }
    };

    if (!profile?.linkedin) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md bg-[#0a0a0f] border-[#1e1e2a] text-white">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">Connect Social Account</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            You need to connect a social account before scheduling a post.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 py-4">
                        {/* LinkedIn */}
                        <div className="flex items-center justify-between p-4 bg-[#0e0e16] border border-[#2a2a3a] rounded-xl hover:border-[#63d496]/30 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 flex items-center justify-center bg-[#0a66c2]/10 rounded-lg">
                                    <Linkedin className="w-5 h-5 text-[#0a66c2]" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[#f0f0f8]">LinkedIn</p>
                                    <p className="text-[11px] text-[#5a5a78]">Professional Network</p>
                                </div>
                            </div>
                            <Button 
                                size="sm" 
                                variant="outline"
                                onClick={handleConnectLinkedIn}
                                disabled={connectingId === "linkedin"}
                                className={cn(
                                    "h-8 border-[#2a2a3a] text-xs transition-all",
                                    "hover:bg-[#63d496] hover:border-[#63d496] hover:text-[#0a1a10] bg-transparent text-white"
                                )}
                            >
                                {connectingId === "linkedin" ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                                Connect
                            </Button>
                        </div>

                        {/* X (Twitter) */}
                        <div className="flex items-center justify-between p-4 bg-[#0e0e16] border border-[#2a2a3a] rounded-xl opacity-60">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 flex items-center justify-center bg-white/5 rounded-lg">
                                    <XIcon className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[#f0f0f8]">X (Twitter)</p>
                                    <p className="text-[11px] text-[#5a5a78]">Coming Soon</p>
                                </div>
                            </div>
                            <Button 
                                size="sm" 
                                variant="outline"
                                disabled
                                className="h-8 border-[#2a2a3a] text-xs cursor-not-allowed bg-transparent text-white"
                            >
                                Connect
                            </Button>
                        </div>

                        {/* Reddit */}
                        <div className="flex items-center justify-between p-4 bg-[#0e0e16] border border-[#2a2a3a] rounded-xl opacity-60">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 flex items-center justify-center bg-[#ff4500]/10 rounded-lg">
                                    <RedditIcon className="w-5 h-5 text-[#ff4500]" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[#f0f0f8]">Reddit</p>
                                    <p className="text-[11px] text-[#5a5a78]">Coming Soon</p>
                                </div>
                            </div>
                            <Button 
                                size="sm" 
                                variant="outline"
                                disabled
                                className="h-8 border-[#2a2a3a] text-xs cursor-not-allowed bg-transparent text-white"
                            >
                                Connect
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-106.25">
                <DialogHeader>
                    <DialogTitle>Schedule Post</DialogTitle>
                    <DialogDescription>
                        Pick a date and time to publish this post.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        className="w-full rounded-xl border border-white/5 bg-white/5 backdrop-blur-md mx-auto p-4 shadow-inner"
                        disabled={(d) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return d < today;
                        }}
                    />
                    
                    {date && (
                        <div className="flex items-center justify-center gap-2 mt-2">
                            <Select value={hour} onValueChange={setHour}>
                                <SelectTrigger className="w-20 bg-white/5 border-white/5 hover:bg-white/10 transition-colors">
                                    <SelectValue placeholder="HH" />
                                </SelectTrigger>
                                <SelectContent className="max-h-50">
                                    {hours.map((h) => (
                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span className="text-xl font-bold">:</span>
                            <Select value={minute} onValueChange={setMinute}>
                                <SelectTrigger className="w-20 bg-white/5 border-white/5 hover:bg-white/10 transition-colors">
                                    <SelectValue placeholder="MM" />
                                </SelectTrigger>
                                <SelectContent className="max-h-50">
                                    {minutes.map((m) => (
                                        <SelectItem key={m} value={m}>{m}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="text-center text-sm text-muted-foreground mt-2">
                        {finalDate ? format(finalDate, "PPP 'at' p") : "No date selected"}
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSchedule} disabled={loading || !date || !finalDate || !profile?.linkedin} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Schedule Post
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
