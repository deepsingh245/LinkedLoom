"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

import { useAuth } from "@/components/auth-provider";
import { User } from "firebase/auth";

export function PostEditor() {
    const [content, setContent] = React.useState("")
    const [topic, setTopic] = React.useState("")
    const [tone, setTone] = React.useState("professional")
    const [length, setLength] = React.useState([50])
    const [generating, setGenerating] = React.useState(false)
    const [saving, setSaving] = React.useState(false)
    const [date, setDate] = React.useState<Date>()

    const user = useAuth() as User;

    const handleGenerate = async () => {
        setGenerating(true)
        try {
            const { getFunctions, httpsCallable } = await import("firebase/functions");
            const { app } = await import("@/lib/firebase");
            const { FirebaseFunctions } = await import("@/lib/firebase/functions");
            const functions = getFunctions(app);
            const generatePost = httpsCallable(functions, FirebaseFunctions.GENERATE_POST);
            
            const result = await generatePost({ 
                topic, 
                tone, 
                length: length[0] 
            });
            
            const data = result.data as { content: string };
            setContent(data.content);
            successToast("Draft generated successfully!")
        } catch (error) {
            console.error("Generate failed", error)
            dangerToast("Failed to generate content.")
            // Fallback content removed as we expect function to work or fail
        } finally {
            setGenerating(false)
        }
    }

    const handleSave = async () => {
        if (!content) return dangerToast("Post content cannot be empty")
        setSaving(true)
        try {
            await api.firebaseService.createPost({
                content,
                status: "draft",
                authorId: user.uid,
                tone: tone.toUpperCase() as any,
                date: new Date().toISOString(),
                mediaUrls: [],
                linkedinPostId: "",
                versions: []
            })
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
            const post = await api.firebaseService.createPost({
                 content,
                 status: "draft",
                 authorId: user.uid,
                 tone: tone.toUpperCase() as any,
                 date: new Date().toISOString(),
                 mediaUrls: [],
                 linkedinPostId: "",
                 versions: []
            })
            // 2. Schedule it
            await api.firebaseService.schedulePost(String(post.id), date.toISOString())

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
        <div className="p-4 md:p-8 mx-auto">
            <div className="animate-fadeUp mb-7">
                <h1 className="font-display text-[26px] font-semibold text-[#f0f0f8] tracking-[-0.4px] mb-1.5">
                    Create Post
                </h1>
                <p className="text-[#5a5a78] text-[14px]">Generate with AI or write from scratch.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Controls */}
                <div className="flex flex-col gap-4 lg:col-span-1">
                    <Card className="animate-fadeUp animation-delay-100 p-5 rounded-[16px] border border-[#1e1e2a] bg-[#13131a] shadow-sm transition-all hover:border-[#2a2a3a]">
                        <h3 className="text-[13px] font-semibold text-[#7070a0] uppercase tracking-[0.8px] mb-4">
                            AI Generation
                        </h3>
                        
                        <div className="mb-3.5">
                            <Label className="text-[12.5px] text-[#8888a0] mb-1.5 block font-medium">Topic *</Label>
                            <Input
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="e.g. Leading remote teams"
                                className="w-full h-11 bg-[#0e0e16] border border-[#1e1e2a] text-[#e0e0f0] text-[13.5px] rounded-[10px] px-3.5 py-2.5 transition-all focus:border-[#63d496] focus:shadow-[0_0_0_1px_rgba(99,212,150,0.5)] outline-none placeholder:text-[#4a4a68]"
                            />
                        </div>
                        
                        <div className="mb-3.5">
                            <Label className="text-[12.5px] text-[#8888a0] mb-1.5 block font-medium">Tone</Label>
                            <Select value={tone} onValueChange={setTone}>
                                <SelectTrigger className="w-full h-11 bg-[#0e0e16] border border-[#1e1e2a] text-[#e0e0f0] text-[13.5px] rounded-[10px] px-3.5 focus:ring-1 focus:ring-[#63d496]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#13131a] border-[#1e1e2a] text-[#e0e0f0]">
                                    <SelectItem value="professional">Professional</SelectItem>
                                    <SelectItem value="casual">Casual</SelectItem>
                                    <SelectItem value="viral">Viral / Hook-heavy</SelectItem>
                                    <SelectItem value="storytelling">Storytelling</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="mb-[18px]">
                            <Label className="text-[12.5px] text-[#8888a0] mb-3 block font-medium">Post Length</Label>
                            <Slider
                                value={length}
                                onValueChange={setLength}
                                max={100}
                                step={1}
                                className="w-full"
                            />
                        </div>

                        <Button 
                            onClick={handleGenerate} 
                            disabled={generating}
                            className="w-full flex items-center justify-center bg-gradient-to-br from-[#63d496] to-[#3db87a] text-[#0a1a10] hover:-translate-y-[1px] hover:shadow-[0_8px_24px_rgba(99,212,150,0.35)] active:translate-y-0 transition-all font-sans font-semibold border-none h-11 px-[20px] rounded-[10px]"
                        >
                            {generating ? <Wand2 className="mr-2 h-[14px] w-[14px] animate-spin" /> : <Wand2 className="mr-2 h-[14px] w-[14px]" />}
                            {generating ? "Generating..." : "Generate with AI"}
                        </Button>
                    </Card>

                    <Card className="animate-fadeUp animation-delay-200 p-5 rounded-[16px] border border-[#1e1e2a] bg-[#13131a] shadow-sm transition-all hover:border-[#2a2a3a]">
                        <h3 className="text-[13px] font-semibold text-[#7070a0] uppercase tracking-[0.8px] mb-3.5">
                            Post Settings
                        </h3>
                        <div>
                            <Label className="text-[12.5px] text-[#8888a0] mb-1.5 block font-medium">Status Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button disabled={saving} className="w-full h-11 justify-start text-left font-normal bg-[#0e0e16] border border-[#1e1e2a] text-[#e0e0f0] text-[13.5px] rounded-[10px] hover:bg-[#1a1a24] hover:border-[#2a2a3a]">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "MMM d, yyyy") : "Pick a date (Optional)"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-[#13131a] border-[#1e1e2a] text-[#e0e0f0]" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        initialFocus
                                        className="bg-[#13131a] border-[#1e1e2a] text-[#e0e0f0]"
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </Card>
                </div>

                {/* Editor & Preview */}
                <div className="animate-fadeUp animation-delay-200 lg:col-span-2 flex flex-col gap-3.5">
                    <Card className="flex-1 p-5 rounded-[16px] border border-[#1e1e2a] bg-[#13131a] shadow-sm transition-all hover:border-[#2a2a3a] flex flex-col">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                            
                            {/* Editor Side */}
                            <div className="flex flex-col h-full min-h-[320px]">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-[13px] font-semibold text-[#7070a0] uppercase tracking-[0.8px]">Content</h3>
                                </div>
                                <div className="relative flex-1 flex flex-col">
                                    <Textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder="Start typing or generate with AI..."
                                        className="flex-1 w-full h-full min-h-[320px] bg-[#0e0e16] border border-[#1e1e2a] text-[#e0e0f0] text-[14px] leading-[1.7] font-sans rounded-[10px] p-4 transition-all focus:border-[#63d496] focus:shadow-[0_0_0_1px_rgba(99,212,150,0.5)] outline-none placeholder:text-[#4a4a68] resize-none"
                                    />
                                </div>
                                
                                <div className="h-1 bg-[#1a1a26] rounded-full overflow-hidden mt-3 mb-1.5 transition-all">
                                    <div 
                                        className="h-full bg-gradient-to-r from-[#63d496] to-[#3db87a] transition-all" 
                                        style={{width:`${Math.min(100,(content.length/3000)*100)}%`}}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-[#5a5a78]">{content.length}/3000 chars</span>
                                    <span className={content.length > 3000 ? "text-[#f06464]" : "text-[#5a5a78]"}>
                                        {content.length > 3000 ? `${content.length - 3000} over limit` : `${3000 - content.length} remaining`}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Preview Side */}
                            <div className="hidden lg:flex flex-col border-l border-[#1e1e2a] pl-6 h-full">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-[13px] font-semibold text-[#7070a0] uppercase tracking-[0.8px]">Preview</h3>
                                </div>
                                <div className="flex-1 bg-[#0e0e16] rounded-[10px] border border-[#1e1e2a] flex justify-center p-4 min-h-[460px]">
                                    <div className="w-full h-full overflow-y-auto pr-1">
                                        <PostPreview content={content} user={user} />
                                    </div>
                                </div>
                            </div>

                        </div>
                    </Card>

                    <div className="flex gap-2.5 justify-end mt-1">
                        <Button 
                            className="bg-[#13131a] border border-[#2a2a3a] text-[#cccccc] hover:bg-[#1a1a24] hover:border-[#3a3a4a] transition-all font-sans font-medium h-10 px-4 rounded-lg" 
                            onClick={handleSave} 
                            disabled={saving}
                        >
                            Save Draft
                        </Button>
                        <Button 
                            className="bg-gradient-to-br from-[#63d496] to-[#3db87a] text-[#0a1a10] hover:-translate-y-[1px] hover:shadow-[0_8px_24px_rgba(99,212,150,0.35)] active:translate-y-0 transition-all font-sans font-semibold border-none h-10 px-[20px] rounded-lg" 
                            onClick={handleSchedule} 
                            disabled={saving || !date}
                        >
                            <Save className="mr-2 h-[14px] w-[14px]" /> Schedule Post
                        </Button>
                    </div>
                </div>
            </div>

            {/* Mobile Tabs for Preview */}
            <div className="lg:hidden mt-6">
                <Tabs defaultValue="preview">
                    <TabsList className="grid w-full grid-cols-2 mb-4 bg-[#1e1e2a] border border-[#2a2a35] p-1 rounded-xl">
                        <TabsTrigger value="preview" className="rounded-lg data-[state=active]:bg-[#2a2a35] data-[state=active]:text-white transition-all">Show Preview</TabsTrigger>
                        <TabsTrigger value="hide" className="rounded-lg data-[state=active]:bg-[#2a2a35] data-[state=active]:text-white transition-all">Hide Preview</TabsTrigger>
                    </TabsList>
                    <TabsContent value="preview" className="mt-2 bg-[#0e0e16] rounded-[10px] border border-[#1e1e2a] p-4">
                        <PostPreview content={content} user={user} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
