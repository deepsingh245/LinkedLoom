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
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import { XIcon, RedditIcon } from "@/components/shared/Icons";

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
                <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">Connect Social Account</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            You need to connect a social account before scheduling a post.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 py-4">
                        {/* LinkedIn */}
                        <div className="flex items-center justify-between p-4 bg-muted/40 border border-border rounded-xl hover:border-primary/30 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 flex items-center justify-center bg-[#0a66c2]/10 rounded-lg">
                                    <Linkedin className="w-5 h-5 text-[#0a66c2]" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">LinkedIn</p>
                                    <p className="text-[11px] text-muted-foreground">Professional Network</p>
                                </div>
                            </div>
                            <Button 
                                size="sm" 
                                variant="outline"
                                onClick={handleConnectLinkedIn}
                                disabled={connectingId === "linkedin"}
                                className={cn(
                                    "h-8 border-border text-xs transition-all",
                                    "hover:bg-primary hover:border-primary hover:text-primary-foreground bg-transparent text-foreground"
                                )}
                            >
                                {connectingId === "linkedin" ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                                Connect
                            </Button>
                        </div>

                        {/* X (Twitter) */}
                        <div className="flex items-center justify-between p-4 bg-muted/40 border border-border rounded-xl opacity-60">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 flex items-center justify-center bg-foreground/5 rounded-lg">
                                    <XIcon className="w-4 h-4 text-foreground" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">X (Twitter)</p>
                                    <p className="text-[11px] text-muted-foreground">Coming Soon</p>
                                </div>
                            </div>
                            <Button 
                                size="sm" 
                                variant="outline"
                                disabled
                                className="h-8 border-border text-xs cursor-not-allowed bg-transparent text-muted-foreground"
                            >
                                Connect
                            </Button>
                        </div>

                        {/* Reddit */}
                        <div className="flex items-center justify-between p-4 bg-muted/40 border border-border rounded-xl opacity-60">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 flex items-center justify-center bg-[#ff4500]/10 rounded-lg">
                                    <RedditIcon className="w-5 h-5 text-[#ff4500]" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">Reddit</p>
                                    <p className="text-[11px] text-muted-foreground">Coming Soon</p>
                                </div>
                            </div>
                            <Button 
                                size="sm" 
                                variant="outline"
                                disabled
                                className="h-8 border-border text-xs cursor-not-allowed bg-transparent text-muted-foreground"
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
                        className="w-full rounded-xl border border-border bg-card mx-auto p-4 shadow-inner"
                        disabled={(d) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return d < today;
                        }}
                    />
                    
                    {date && (
                        <div className="flex items-center justify-center gap-2 mt-2">
                            <Select value={hour} onValueChange={setHour}>
                                <SelectTrigger className="w-20 bg-muted/30 border-border hover:bg-muted/50 transition-colors">
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
                                <SelectTrigger className="w-20 bg-muted/30 border-border hover:bg-muted/50 transition-colors">
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
