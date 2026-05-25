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
        <Card className="animate-fadeUp animation-delay-200 p-5 rounded-2xl border border-border bg-card shadow-sm transition-all hover:border-border/80">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.8px] mb-3.5">
                Post Settings
            </h3>
            <div>
                <Label className="text-[12.5px] text-muted-foreground mb-1.5 block font-medium">Status Date</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" disabled={saving} className="w-full h-11 justify-start text-left font-normal bg-background border border-border text-foreground text-[13.5px] rounded-[10px] hover:bg-accent hover:border-border/80">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(set(date, { hours: parseInt(hour), minutes: parseInt(minute) }), "MMM d, yyyy 'at' p") : "Pick a date (Optional)"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-70 p-3 bg-card border-border text-foreground flex flex-col gap-3" align="start">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                            className="bg-card border-border text-foreground w-full"
                            disabled={(d) => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                return d < today;
                            }}
                        />
                        {date && (
                            <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-border">
                                <Select value={hour} onValueChange={setHour}>
                                    <SelectTrigger className="w-20 bg-background border-border">
                                        <SelectValue placeholder="HH" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-50 bg-card border-border text-foreground">
                                        {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map((h) => (
                                            <SelectItem key={h} value={h}>{h}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span className="text-xl font-bold text-foreground">:</span>
                                <Select value={minute} onValueChange={setMinute}>
                                    <SelectTrigger className="w-20 bg-background border-border">
                                        <SelectValue placeholder="MM" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-50 bg-card border-border text-foreground">
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
                        className="h-11 bg-background border border-border text-foreground text-[13.5px] rounded-[10px] focus:border-primary placeholder:text-muted-foreground/50"
                    />
                    <p className="text-[11px] text-muted-foreground/60 mt-1">
                        Leave blank to post to your Reddit profile (u/username)
                    </p>
                </div>
            )}
        </Card>
    )
}
