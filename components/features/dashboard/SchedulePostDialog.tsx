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
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
    const defaultDate = post.scheduledFor ? new Date(post.scheduledFor) : undefined;
    
    const [date, setDate] = useState<Date | undefined>(defaultDate);
    const [hour, setHour] = useState<string>(
        defaultDate ? defaultDate.getHours().toString().padStart(2, '0') : "09"
    );
    const [minute, setMinute] = useState<string>(
        defaultDate ? (Math.round(defaultDate.getMinutes() / 5) * 5).toString().padStart(2, '0') : "00"
    );
    const [loading, setLoading] = useState(false);

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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
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
                                <SelectTrigger className="w-[80px] bg-white/5 border-white/5 hover:bg-white/10 transition-colors">
                                    <SelectValue placeholder="HH" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    {hours.map((h) => (
                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span className="text-xl font-bold">:</span>
                            <Select value={minute} onValueChange={setMinute}>
                                <SelectTrigger className="w-[80px] bg-white/5 border-white/5 hover:bg-white/10 transition-colors">
                                    <SelectValue placeholder="MM" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
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
                    <Button onClick={handleSchedule} disabled={loading || !date || !finalDate} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Schedule Post
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
