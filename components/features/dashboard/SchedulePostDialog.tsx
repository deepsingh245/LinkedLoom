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
import { api } from "@/lib/api";
import { Post } from "@/types";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
    const [date, setDate] = useState<Date | undefined>(
        post.scheduledFor ? new Date(post.scheduledFor) : undefined
    );
    const [loading, setLoading] = useState(false);

    const handleSchedule = async () => {
        if (!date) {
            toast.error("Please select a date");
            return;
        }

        try {
            setLoading(true);
            await api.post(`/posts/${post.id}/schedule`, { scheduledFor: date.toISOString() });
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
                <div className="grid gap-4 py-4">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        className="rounded-md border mx-auto"
                        disabled={(date) => date < new Date()}
                    />
                    <div className="text-center text-sm text-muted-foreground">
                        {date ? format(date, "PPP") : "No date selected"}
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSchedule} disabled={loading || !date}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Schedule
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
