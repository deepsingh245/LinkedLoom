import * as React from "react"
import { format, set } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"

interface PostSettingsProps {
    date: Date | undefined
    setDate: (val: Date | undefined) => void
    saving: boolean
    hour: string
    setHour: (val: string) => void
    minute: string
    setMinute: (val: string) => void
    showSubredditField?: boolean
    subreddit?: string
    setSubreddit?: (val: string) => void
}

export function PostSettings({
    date,
    setDate,
    saving,
    hour,
    setHour,
    minute,
    setMinute,
    showSubredditField,
    subreddit,
    setSubreddit,
}: PostSettingsProps) {
    return (
        <Card className="animate-fadeUp animation-delay-200 rounded-xl border border-[#e2e6ea] bg-white p-4 shadow-none md:p-5">
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#7c878e]">
                Scheduling
            </h3>
            <div>
                <Label className="text-[12.5px] text-muted-foreground mb-1.5 block font-medium">Status Date</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" disabled={saving} className="h-10 w-full justify-start rounded-lg border border-[#dfe5e7] bg-white text-left text-xs font-normal text-[#46515a] hover:bg-[#f6f8f7]">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(set(date, { hours: parseInt(hour), minutes: parseInt(minute) }), "MMM d, yyyy 'at' p") : "Pick a date (Optional)"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="flex w-70 flex-col gap-3 border-border bg-popover p-3 text-popover-foreground" align="start">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                            className="w-full text-popover-foreground"
                            disabled={(d) => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                return d < today;
                            }}
                        />
                        {date && (
                            <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-border">
                                <Select value={hour} onValueChange={setHour}>
                                    <SelectTrigger className="w-20 border-border bg-background text-foreground">
                                        <SelectValue placeholder="HH" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-50 border-border bg-popover text-popover-foreground">
                                        {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map((h) => (
                                            <SelectItem key={h} value={h}>{h}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span className="text-xl font-bold text-foreground">:</span>
                                <Select value={minute} onValueChange={setMinute}>
                                    <SelectTrigger className="w-20 border-border bg-background text-foreground">
                                        <SelectValue placeholder="MM" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-50 border-border bg-popover text-popover-foreground">
                                        {Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')).map((m) => (
                                            <SelectItem key={m} value={m}>{m}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </PopoverContent>
                </Popover>
            </div>
            {showSubredditField && (
                <div className="mt-3">
                    <Label className="text-[12.5px] text-muted-foreground mb-1.5 block font-medium">
                        Subreddit <span className="text-muted-foreground/60">(optional)</span>
                    </Label>
                    <Input
                        value={subreddit || ""}
                        onChange={(e) => setSubreddit?.(e.target.value)}
                        placeholder="e.g. r/entrepreneurship"
                        disabled={saving}
                        className="h-10 rounded-lg border border-[#dfe5e7] bg-white text-xs text-[#303a40] placeholder:text-[#a3adb2] focus:border-[#79a99e]"
                    />
                    <p className="text-[11px] text-muted-foreground/60 mt-1">
                        Leave blank to post to your Reddit profile (u/username)
                    </p>
                </div>
            )}
        </Card>
    )
}
