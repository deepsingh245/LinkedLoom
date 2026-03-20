"use client"

import * as React from "react"
import { format, set, isBefore } from "date-fns"
import { User } from "firebase/auth"
import { Wand2, Calendar as CalendarIcon, Save, Image as ImageIcon, Sparkles, X, RefreshCw, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

import { api } from "@/lib/api"
import { successToast, dangerToast } from "@/lib/toast"
import { useAuth } from "@/components/auth-provider"
import { PostPreview } from "./PostPreview"
import { Post } from "@/types"
import { httpsCallable } from "firebase/functions"
import { functions } from "@/lib/firebase"
import { FirebaseFunctions } from "@/lib/firebase/functions"
import { uploadPostAttachment } from "@/lib/firebase/storage"

const LINKEDIN_MAX_LENGTH = 3000;

/** Convert a base64 data URI to a Blob for uploading to Storage */
function base64ToBlob(dataUri: string): Blob {
    const [meta, base64] = dataUri.split(",");
    const mime = meta.match(/:(.*?);/)?.[1] || "image/png";
    const byteString = atob(base64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime });
}

export function PostEditor() {
    const user = useAuth() as User | null;

    const [content, setContent] = React.useState("")
    const [topic, setTopic] = React.useState("")
    const [tone, setTone] = React.useState("professional")
    const [length, setLength] = React.useState([50])
    
    const [date, setDate] = React.useState<Date | undefined>()
    const [hour, setHour] = React.useState<string>("09")
    const [minute, setMinute] = React.useState<string>("00")
    
    const [generating, setGenerating] = React.useState(false)
    const [generatingImage, setGeneratingImage] = React.useState(false)
    const [enhancingPrompt, setEnhancingPrompt] = React.useState(false)
    const [saving, setSaving] = React.useState(false)

    const [imagePrompt, setImagePrompt] = React.useState("")
    const [imageUrl, setImageUrl] = React.useState<string | null>(null)
    const [showImageOptions, setShowImageOptions] = React.useState(false)
    const [editingPostId, setEditingPostId] = React.useState<string | null>(null)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    // Load draft from localStorage when navigating from Edit button
    React.useEffect(() => {
        try {
            const saved = localStorage.getItem("draft_post");
            if (saved) {
                const draft = JSON.parse(saved);
                if (draft.content) setContent(draft.content);
                if (draft.tone) setTone(draft.tone.toLowerCase());
                if (draft.topic) setTopic(draft.topic);
                if (draft.imageUrl) {
                    setImageUrl(draft.imageUrl);
                    setShowImageOptions(true);
                }
                if (draft.id) setEditingPostId(draft.id);
                localStorage.removeItem("draft_post");
            }
        } catch (e) {
            console.error("Failed to load draft:", e);
        }
    }, []);

    const handleGenerate = async () => {
        if (!topic.trim()) return dangerToast("Please enter a topic to generate content.");
        
        setGenerating(true)
        try {
            const generatePost = httpsCallable(functions, FirebaseFunctions.GENERATE_POST);
            
            const result = await generatePost({ 
                topic, 
                tone, 
                length: length[0] 
            });
            
            const data = result.data as { content: string };
            if (data.content) {
                setContent(data.content);
                successToast("Draft generated successfully!")
            } else {
                throw new Error("No content received");
            }
        } catch (error) {
            console.error("Generate failed:", error)
            dangerToast("Failed to generate content.")
        } finally {
            setGenerating(false)
        }
    }

    const handleGenerateImage = async () => {
        // Use imagePrompt if provided, otherwise fallback to the post content or topic
        const prompt = imagePrompt.trim() || content.trim() || topic.trim();
        if (!prompt) return dangerToast("Please enter an image prompt, generate post content, or provide a topic.");
        
        setGeneratingImage(true)
        try {
            const generateImage = httpsCallable(functions, FirebaseFunctions.GENERATE_IMAGE);
            
            // If prompt is from content, truncate it to keep it efficient for the AI
            const finalPrompt = prompt.length > 500 ? prompt.substring(0, 500) + "..." : prompt;

            const result = await generateImage({ 
                prompt: finalPrompt
            });
            
            const data = result.data as { imageUrl: string };
            if (data.imageUrl) {
                setImageUrl(data.imageUrl);
                successToast("Image generated successfully!")
            } else {
                throw new Error("No image URL received");
            }
        } catch (error) {
            console.error("Image generation failed:", error)
            dangerToast("Failed to generate image.")
        } finally {
            setGeneratingImage(false)
        }
    }

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.uid) return;

        if (!file.type.startsWith("image/")) {
            return dangerToast("Please select an image file.");
        }
        if (file.size > 5 * 1024 * 1024) {
            return dangerToast("Image must be under 5MB.");
        }

        setGeneratingImage(true);
        try {
            const url = await uploadPostAttachment(user.uid, file);
            setImageUrl(url);
            successToast("Image uploaded successfully!");
        } catch (error) {
            console.error("Upload failed:", error);
            dangerToast("Failed to upload image.");
        } finally {
            setGeneratingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    const handleEnhancePrompt = async () => {
        const prompt = imagePrompt.trim() || content.trim() || topic.trim();
        if (!prompt) return dangerToast("Enter a prompt to enhance.");

        setEnhancingPrompt(true);
        try {
            const enhance = httpsCallable(functions, FirebaseFunctions.ENHANCE_IMAGE_PROMPT);
            const result = await enhance({ prompt });
            const data = result.data as { enhancedPrompt: string };
            if (data.enhancedPrompt) {
                setImagePrompt(data.enhancedPrompt);
                successToast("Prompt enhanced!");
            }
        } catch (error) {
            console.error("Enhance prompt failed:", error);
            dangerToast("Failed to enhance prompt.");
        } finally {
            setEnhancingPrompt(false);
        }
    }

    const createBasePayload = (): Partial<Post> => {
        if (!user?.uid) throw new Error("User not authenticated");
        return {
            content,
            status: "draft",
            user_id: user.uid,
            tone: tone.toUpperCase() as any,
            date: new Date().toISOString(),
            mediaUrls: imageUrl ? [imageUrl] : [],
            imageUrl: imageUrl || null,
            linkedinUrn: "",
            versions: []
        };
    }

    /** Upload base64 image to Storage, return the download URL (or null) */
    const uploadImageIfNeeded = async (): Promise<string | null> => {
        if (!imageUrl || !user?.uid) return null;
        if (!imageUrl.startsWith("data:image")) return imageUrl; // already a URL

        const blob = base64ToBlob(imageUrl);
        const file = new File([blob], `ai-generated-${Date.now()}.png`, { type: "image/png" });
        return await uploadPostAttachment(user.uid, file);
    }

    const handleSave = async () => {
        if (!user) return dangerToast("User not authenticated");
        if (!content.trim()) return dangerToast("Post content cannot be empty")
        
        setSaving(true)
        try {
            const storageUrl = await uploadImageIfNeeded();
            const payload = createBasePayload() as any;
            payload.imageUrl = storageUrl;
            payload.mediaUrls = storageUrl ? [storageUrl] : [];

            if (editingPostId) {
                await api.firebaseService.updatePost(editingPostId, payload);
                successToast("Post updated successfully!");
            } else {
                await api.firebaseService.createPost(payload);
                successToast("Draft saved successfully!");
            }
        } catch (error) {
            console.error("Failed to save draft:", error)
            dangerToast("Failed to save draft.")
        } finally {
            setSaving(false)
        }
    }

    const handleSchedule = async () => {
        if (!user) return dangerToast("User not authenticated");
        if (!content.trim()) return dangerToast("Post content cannot be empty")
        if (!date) return dangerToast("Please select a date to schedule")

        const finalDate = set(date, { hours: parseInt(hour), minutes: parseInt(minute), seconds: 0, milliseconds: 0 });

        if (isBefore(finalDate, new Date())) {
            return dangerToast("You cannot schedule a post in the past.")
        }

        setSaving(true)
        try {
            const storageUrl = await uploadImageIfNeeded();
            const payload = createBasePayload() as any;
            payload.imageUrl = storageUrl;
            payload.mediaUrls = storageUrl ? [storageUrl] : [];
            const post = await api.firebaseService.createPost(payload)
            await api.firebaseService.schedulePost(String(post.id), finalDate.toISOString())

            successToast(`Post scheduled for ${format(finalDate, "PPP 'at' p")}!`)
            setDate(undefined)
        } catch (error) {
            console.error("Failed to schedule post:", error)
            dangerToast("Failed to schedule post.")
        } finally {
            setSaving(false)
        }
    }

    const isOverLimit = content.length > LINKEDIN_MAX_LENGTH;
    const progressPercentage = Math.min(100, (content.length / LINKEDIN_MAX_LENGTH) * 100);

    return (
        <div className="p-4 md:p-8">
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
                            <Label className="text-[12.5px] text-[#8888a0] mb-3 block font-medium flex justify-between">
                                <span>Post Length</span>
                                <span className="text-[#63d496]">{length[0]}%</span>
                            </Label>
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
                            disabled={generating || !topic.trim()}
                            className="w-full flex items-center justify-center bg-gradient-to-br from-[#63d496] to-[#3db87a] text-[#0a1a10] hover:-translate-y-[1px] hover:shadow-[0_8px_24px_rgba(99,212,150,0.35)] active:translate-y-0 transition-all font-sans font-semibold border-none h-11 px-[20px] rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {generating ? <RefreshCw className="mr-2 h-[14px] w-[14px] animate-spin" /> : <Wand2 className="mr-2 h-[14px] w-[14px]" />}
                            {generating ? "Generating..." : "Generate Post"}
                        </Button>

                        <div className="mt-5 pt-4 border-t border-[#1e1e2a] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ImageIcon className={`h-4 w-4 ${showImageOptions ? 'text-[#63d496]' : 'text-[#5a5a78]'}`} />
                                <span className={`text-[12.5px] font-medium transition-colors ${showImageOptions ? 'text-[#e0e0f0]' : 'text-[#5a5a78]'}`}>
                                    Add AI Image
                                </span>
                            </div>
                            <button 
                                onClick={() => setShowImageOptions(!showImageOptions)}
                                className={`relative w-10 min-w-10 h-[22px] rounded-full transition-all duration-300 ${showImageOptions ? 'bg-[#63d496]' : 'bg-[#1e1e2a] border border-[#2a2a3a]'}`}
                            >
                                <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-all duration-300 shadow-sm ${showImageOptions ? 'translate-x-[18px]' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </Card>

                    {showImageOptions && (
                        <Card className="animate-in fade-in slide-in-from-top-2 duration-300 p-5 rounded-[16px] border border-[#1e1e2a] bg-[#13131a] shadow-sm transition-all hover:border-[#2a2a3a]">
                            <h3 className="text-[13px] font-semibold text-[#7070a0] uppercase tracking-[0.8px] mb-4 flex items-center gap-2">
                                <Sparkles className="h-3.5 w-3.5 text-[#63d496]" />
                                Visual Asset
                            </h3>
                            
                            <div className="mb-3.5">
                                <Label className="text-[12.5px] text-[#8888a0] mb-1.5 block font-medium">Image Prompt (Optional)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={imagePrompt}
                                        onChange={(e) => setImagePrompt(e.target.value)}
                                        placeholder="Describe the image you want..."
                                        className="flex-1 h-11 bg-[#0e0e16] border border-[#1e1e2a] text-[#e0e0f0] text-[13.5px] rounded-[10px] px-3.5 py-2.5 transition-all focus:border-[#63d496] focus:shadow-[0_0_0_1px_rgba(99,212,150,0.5)] outline-none placeholder:text-[#4a4a68]"
                                    />
                                    <Button
                                        onClick={handleEnhancePrompt}
                                        disabled={enhancingPrompt || (!imagePrompt.trim() && !content.trim() && !topic.trim())}
                                        variant="outline"
                                        className="h-11 px-3 bg-[#0e0e16] border-[#1e1e2a] hover:border-[#63d496]/40 hover:bg-[#1a1a24] text-[#8888a0] hover:text-[#63d496] rounded-[10px] transition-all disabled:opacity-50"
                                        title="Enhance prompt with AI"
                                    >
                                        {enhancingPrompt ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                    </Button>
                                </div>
                                {!imagePrompt.trim() && (content.trim() || topic.trim()) && (
                                    <p className="text-[11px] text-[#5a5a78] mt-1.5">Using post content as context for generation.</p>
                                )}
                            </div>

                            {imageUrl ? (
                                <div className="relative group mb-4 rounded-xl overflow-hidden border border-[#1e1e2a] aspect-video">
                                    <img src={imageUrl} alt="Generated asset" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button 
                                            onClick={handleGenerateImage}
                                            disabled={generatingImage}
                                            variant="secondary"
                                            size="sm"
                                            className="bg-white/10 hover:bg-white/20 text-white border-none rounded-lg h-8"
                                        >
                                            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${generatingImage ? 'animate-spin' : ''}`} />
                                            {generatingImage ? "Generating..." : "Regenerate"}
                                        </Button>
                                        <Button 
                                            onClick={() => setImageUrl(null)}
                                            variant="destructive"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Button 
                                        onClick={handleGenerateImage} 
                                        disabled={generatingImage || (!topic.trim() && !content.trim() && !imagePrompt.trim())}
                                        className="flex-1 flex items-center justify-center bg-[#1a1a24] border border-[#2a2a3a] text-[#e0e0f0] hover:bg-[#20202c] hover:border-[#63d496]/40 transition-all font-sans font-medium h-11 px-[20px] rounded-[10px] disabled:opacity-50"
                                    >
                                        {generatingImage ? <RefreshCw className="mr-2 h-[14px] w-[14px] animate-spin" /> : <ImageIcon className="mr-2 h-[14px] w-[14px] text-[#63d496]" />}
                                        {generatingImage ? "Generating..." : "Generate Image"}
                                    </Button>
                                    <Button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={generatingImage}
                                        variant="outline"
                                        className="h-11 px-4 bg-[#1a1a24] border-[#2a2a3a] hover:border-[#63d496]/40 hover:bg-[#20202c] text-[#e0e0f0] font-medium rounded-[10px] transition-all disabled:opacity-50"
                                    >
                                        <Upload className="mr-2 h-[14px] w-[14px] text-[#63d496]" />
                                        Upload
                                    </Button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleMediaUpload}
                                        className="hidden"
                                    />
                                </div>
                            )}
                        </Card>
                    )}

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
                                        {date ? format(set(date, { hours: parseInt(hour), minutes: parseInt(minute) }), "MMM d, yyyy 'at' p") : "Pick a date (Optional)"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-70 p-3 bg-[#13131a] border-[#1e1e2a] text-[#e0e0f0] flex flex-col gap-3" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        initialFocus
                                        className="bg-[#13131a] border-[#1e1e2a] text-[#e0e0f0] w-full"
                                        disabled={(d) => {
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            return d < today;
                                        }}
                                    />
                                    {date && (
                                        <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-[#1e1e2a]">
                                            <Select value={hour} onValueChange={setHour}>
                                                <SelectTrigger className="w-[80px] bg-[#0e0e16] border-[#1e1e2a]">
                                                    <SelectValue placeholder="HH" />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-[200px] bg-[#13131a] border-[#1e1e2a] text-[#e0e0f0]">
                                                    {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map((h) => (
                                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <span className="text-xl font-bold">:</span>
                                            <Select value={minute} onValueChange={setMinute}>
                                                <SelectTrigger className="w-[80px] bg-[#0e0e16] border-[#1e1e2a]">
                                                    <SelectValue placeholder="MM" />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-[200px] bg-[#13131a] border-[#1e1e2a] text-[#e0e0f0]">
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
                                        className={`h-full transition-all ${isOverLimit ? 'bg-[#f06464]' : 'bg-gradient-to-r from-[#63d496] to-[#3db87a]'}`} 
                                        style={{width: `${progressPercentage}%`}}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-[#5a5a78]">{content.length}/{LINKEDIN_MAX_LENGTH} chars</span>
                                    <span className={isOverLimit ? "text-[#f06464]" : "text-[#5a5a78]"}>
                                        {isOverLimit ? `${content.length - LINKEDIN_MAX_LENGTH} over limit` : `${LINKEDIN_MAX_LENGTH - content.length} remaining`}
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
                                        {user && <PostPreview content={content} image={imageUrl || undefined} user={user as any} />}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </Card>

                    <div className="flex gap-2.5 justify-end mt-1">
                        <Button 
                            className="bg-[#13131a] border border-[#2a2a3a] text-[#cccccc] hover:bg-[#1a1a24] hover:border-[#3a3a4a] transition-all font-sans font-medium h-10 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed" 
                            onClick={handleSave} 
                            disabled={saving || !content.trim()}
                        >
                            {editingPostId ? "Update Post" : "Save Draft"}
                        </Button>
                        <Button 
                            className="bg-gradient-to-br from-[#63d496] to-[#3db87a] text-[#0a1a10] hover:-translate-y-[1px] hover:shadow-[0_8px_24px_rgba(99,212,150,0.35)] active:translate-y-0 transition-all font-sans font-semibold border-none h-10 px-[20px] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed" 
                            onClick={handleSchedule} 
                            disabled={saving || !content.trim() || !date}
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
                        {user && <PostPreview content={content} image={imageUrl || undefined} user={user as any} />}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
