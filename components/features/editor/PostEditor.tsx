"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { PostPreview } from "./PostPreview"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Wand2, Calendar as CalendarIcon, Save } from "lucide-react"
import { api } from "@/lib/api"
import { successToast, dangerToast } from "@/lib/toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { User } from "@/types"

export function PostEditor() {
    const [content, setContent] = React.useState("")
    const [topic, setTopic] = React.useState("")
    const [tone, setTone] = React.useState("professional")
    const [length, setLength] = React.useState([50])
    const [generating, setGenerating] = React.useState(false)
    const [saving, setSaving] = React.useState(false)
    const [date, setDate] = React.useState<Date>()

    const user = JSON.parse(localStorage.getItem('user') || '{}')

    const handleGenerate = async () => {
        setGenerating(true)
        try {
            const { data } = await api.post('/posts/generate', {
                topic: topic,
                style: tone
            })
            setContent(data.content)
            successToast("Draft generated successfully!")
        } catch (error) {
            console.error("Generate failed", error)
            dangerToast("Failed to generate content.")
            setContent("🚀 Just launched LinkGenie! \n\n[API Error: Using Fallback Content] \n\nIt's been a long journey building this tool...")
        } finally {
            setGenerating(false)
        }
    }

    const handleSave = async () => {
        if (!content) return dangerToast("Post content cannot be empty")
        setSaving(true)
        try {
            await api.post('/posts', { content, status: "DRAFT", user_id: user.id })
            successToast("Draft saved successfully!")
        } catch (error) {
            console.error(error)
            dangerToast("Failed to save draft.")
        } finally {
            setSaving(false)
        }
    }

    const handleSchedule = async () => {
        if (!content) return dangerToast("Post content cannot be empty")
        if (!date) return dangerToast("Please select a date to schedule")

        setSaving(true)
        try {
            // 1. Create Post
            const { data: post } = await api.post('/posts', { content, status: "DRAFT", user_id: user?.id })
            // 2. Schedule it
            await api.post(`/posts/${post.id}/schedule`, { scheduledAt: date.toISOString() })

            successToast(`Post scheduled for ${format(date, 'PPP')}!`)
            setDate(undefined) // Reset date
        } catch (error) {
            console.error(error)
            dangerToast("Failed to schedule post.")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-8rem)]">
            {/* Left: Controls */}
            <div className="flex flex-col space-y-4 h-full overflow-y-auto pr-2">
                <div className="space-y-4 bg-card p-4 rounded-lg border">
                    <h3 className="font-semibold text-lg flex items-center">
                        <Wand2 className="mr-2 h-5 w-5 text-primary" />
                        AI Generator
                    </h3>

                    <div className="space-y-2">
                        <Label>Topic or Rough Idea</Label>
                        <Input
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g. Lessons from scaling a B2B SaaS..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tone</Label>
                            <Select value={tone} onValueChange={setTone}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="professional">Professional</SelectItem>
                                    <SelectItem value="casual">Casual</SelectItem>
                                    <SelectItem value="viral">Viral / Hook-heavy</SelectItem>
                                    <SelectItem value="storytelling">Storytelling</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Length (Short - Long)</Label>
                            <Slider
                                value={length}
                                onValueChange={setLength}
                                max={100}
                                step={1}
                                className="pt-2"
                            />
                        </div>
                    </div>

                    <Button onClick={handleGenerate} className="w-full" disabled={generating}>
                        {generating ? <Wand2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        {generating ? "Generating..." : "Generate Draft"}
                    </Button>
                </div>

                <div className="flex-1 space-y-2 flex flex-col">
                    <Label>Editor</Label>
                    <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="flex-1 min-h-[300px] resize-none font-mono text-sm leading-relaxed"
                        placeholder="Write your post here..."
                    />
                </div>

                <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-muted-foreground">
                        {content.length} chars
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleSave} disabled={saving}>
                            <Save className="mr-2 h-4 w-4" /> Save Draft
                        </Button>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button disabled={saving} variant={date ? "default" : "secondary"}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "MMM d") : "Schedule"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                />
                                <div className="p-3 border-t">
                                    <Button size="sm" className="w-full" onClick={handleSchedule}>
                                        Confirm Schedule
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </div>

            {/* Right: Preview */}
            <div className="hidden lg:block bg-muted/30 rounded-lg border p-8 flex items-center justify-center">
                <div className="phone-mockup-or-card w-full max-w-md">
                    <div className="mb-4 text-center text-sm text-muted-foreground font-medium uppercase tracking-wider">
                        LinkedIn Preview
                    </div>
                    <PostPreview content={content} />
                </div>
            </div>

            {/* Mobile Tabs for Preview */}
            <div className="lg:hidden">
                <Tabs defaultValue="edit">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="edit">Editor</TabsTrigger>
                        <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>
                    <TabsContent value="preview" className="mt-4">
                        <PostPreview content={content} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
