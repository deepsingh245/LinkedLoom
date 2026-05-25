"use client"

import * as React from "react"
import { format, set, isBefore } from "date-fns"
import { Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs } from "@/components/ui/tabs"

import { api } from "@/lib/api"
import { successToast, dangerToast } from "@/lib/toast"
import { useAuth } from "@/components/providers/auth-provider"
import { PostPreview } from "../PostPreview"
import { Post } from "@/types"
import { httpsCallable } from "firebase/functions"
import { functions } from "@/lib/firebase"
import { FirebaseFunctions } from "@/lib/firebase/functions"
import { uploadPostAttachment } from "@/lib/firebase/storage"

// Import subcomponents
import { AIGeneration } from "./AIGeneration"
import { VisualAsset } from "./VisualAsset"
import { PostSettings } from "./PostSettings"
import { EditorTextArea } from "./EditorTextArea"
import { PlatformTabs } from "./PlatformTabs"

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
    const { user, profile } = useAuth();

    const [content, setContent] = React.useState("")
    const [topic, setTopic] = React.useState("")
    const [tone, setTone] = React.useState("professional")
    const [length, setLength] = React.useState([800])
    
    const [date, setDate] = React.useState<Date | undefined>()
    const [hour, setHour] = React.useState<string>("09")
    const [minute, setMinute] = React.useState<string>("00")
    
    const [generating, setGenerating] = React.useState(false)
    const [generatingImage, setGeneratingImage] = React.useState(false)
    const [enhancingPrompt, setEnhancingPrompt] = React.useState(false)
    const [saving, setSaving] = React.useState(false)
    const [activePlatform, setActivePlatform] = React.useState<string>("linkedin")

    const [excludeIcons, setExcludeIcons] = React.useState(false)
    const [creativeExpansion, setCreativeExpansion] = React.useState(false)
    const [showAdvanced, setShowAdvanced] = React.useState(false)

    const connectedPlatforms = React.useMemo(() => {
        const list = [];
        if (profile?.linkedin) list.push("linkedin");
        if (profile?.twitter || profile?.x) list.push("x");
        if (profile?.reddit) list.push("reddit");
        return list.length > 0 ? list : ["linkedin"];
    }, [profile]);

    React.useEffect(() => {
        if (connectedPlatforms.length > 0 && !connectedPlatforms.includes(activePlatform)) {
            setActivePlatform(connectedPlatforms[0]);
        }
    }, [connectedPlatforms, activePlatform]);

    const [subreddit, setSubreddit] = React.useState("")

    const [imagePrompt, setImagePrompt] = React.useState("")
    const [imageUrl, setImageUrl] = React.useState<string | null>(null)
    const [referenceImageUrl, setReferenceImageUrl] = React.useState<string | null>(null)
    const [referenceImageBase64, setReferenceImageBase64] = React.useState<string | null>(null)
    const [showImageOptions, setShowImageOptions] = React.useState(false)
    const [editingPostId, setEditingPostId] = React.useState<string | null>(null)
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const referenceFileInputRef = React.useRef<HTMLInputElement>(null)

    // Load draft from localStorage when navigating from Edit button
    React.useEffect(() => {
        try {
            const saved = localStorage.getItem("draft_post");
            if (saved) {
                const draft = JSON.parse(saved);
                if (draft.content) setContent(draft.content);
                if (draft.tone) setTone(draft.tone.toLowerCase());
                if (draft.topic) setTopic(draft.topic);
                if (draft.subreddit) setSubreddit(draft.subreddit);
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
                length: length[0],
                excludeIcons,
                creativeExpansion
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
        const prompt = imagePrompt.trim() || content.trim() || topic.trim();
        if (!prompt) return dangerToast("Please enter an image prompt, generate post content, or provide a topic.");
        
        setGeneratingImage(true)
        try {
            const generateImage = httpsCallable(functions, FirebaseFunctions.GENERATE_IMAGE);
            const finalPrompt = prompt.length > 500 ? prompt.substring(0, 500) + "..." : prompt;

            const result = await generateImage({ 
                prompt: finalPrompt,
                referenceImage: referenceImageBase64
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

    const handleReferenceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
            const base64 = await base64Promise;
            setReferenceImageBase64(base64);

            const url = await uploadPostAttachment(user.uid, file);
            setReferenceImageUrl(url);
            successToast("Reference image uploaded! AI will use this as context.");
        } catch (error) {
            console.error("Reference upload failed:", error);
            dangerToast("Failed to upload reference image.");
        } finally {
            setGeneratingImage(false);
            if (referenceFileInputRef.current) referenceFileInputRef.current.value = "";
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

    const handleGenerateImageWithContext = async () => {
        if (!content.trim()) return dangerToast("Generate post content first to get context.");
        
        setGeneratingImage(true);
        try {
            const enhance = httpsCallable(functions, FirebaseFunctions.ENHANCE_IMAGE_PROMPT);
            const result = await enhance({ prompt: content.trim() });
            const enhanceData = result.data as { enhancedPrompt: string };
            
            if (enhanceData.enhancedPrompt) {
                setImagePrompt(enhanceData.enhancedPrompt);
                
                const generateImage = httpsCallable(functions, FirebaseFunctions.GENERATE_IMAGE);
                const finalPrompt = enhanceData.enhancedPrompt.length > 500 
                    ? enhanceData.enhancedPrompt.substring(0, 500) + "..." 
                    : enhanceData.enhancedPrompt;

                const genResult = await generateImage({ 
                    prompt: finalPrompt,
                    referenceImage: referenceImageBase64
                });
                const genData = genResult.data as { imageUrl: string };
                
                if (genData.imageUrl) {
                    setImageUrl(genData.imageUrl);
                    successToast("Generated image using post context!");
                } else {
                    throw new Error("No image URL received");
                }
            } else {
                throw new Error("Failed to get context-based prompt");
            }
        } catch (error) {
            console.error("Context-based image generation failed:", error);
            dangerToast("Failed to generate image from context.");
        } finally {
            setGeneratingImage(false);
        }
    }

    const createBasePayload = (): Partial<Post> => {
        if (!user?.uid) throw new Error("User not authenticated");
        return {
            content,
            status: "draft",
            user_id: user.uid,
            tone: tone.toUpperCase() as string,
            date: new Date().toISOString(),
            mediaUrls: imageUrl ? [imageUrl] : [],
            imageUrl: imageUrl || null,
            linkedinUrn: "",
            subreddit: subreddit.trim() || undefined,
            versions: []
        };
    }

    const uploadImageIfNeeded = async (): Promise<string | null> => {
        if (!imageUrl || !user?.uid) return null;
        if (!imageUrl.startsWith("data:image")) return imageUrl; 

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
            const payload = createBasePayload();
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
            const payload = createBasePayload();
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

    return (
        <div className="p-4 md:p-8 bg-background text-foreground">
            <div className="animate-fadeUp mb-7">
                <h1 className="font-display text-[26px] font-semibold text-foreground tracking-[-0.4px] mb-1.5">
                    Create Post
                </h1>
                <p className="text-muted-foreground/80 text-3.5">Generate with AI or write from scratch.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Controls */}
                <div className="flex flex-col gap-4 lg:col-span-1">
                    <AIGeneration
                        topic={topic}
                        setTopic={setTopic}
                        tone={tone}
                        setTone={setTone}
                        length={length}
                        setLength={setLength}
                        excludeIcons={excludeIcons}
                        setExcludeIcons={setExcludeIcons}
                        creativeExpansion={creativeExpansion}
                        setCreativeExpansion={setCreativeExpansion}
                        showAdvanced={showAdvanced}
                        setShowAdvanced={setShowAdvanced}
                        generating={generating}
                        handleGenerate={handleGenerate}
                        onUploadClick={() => fileInputRef.current?.click()}
                        saving={saving}
                        showImageOptions={showImageOptions}
                        setShowImageOptions={setShowImageOptions}
                    />

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleMediaUpload}
                        className="hidden"
                    />

                    {showImageOptions && (
                        <VisualAsset
                            imagePrompt={imagePrompt}
                            setImagePrompt={setImagePrompt}
                            enhancingPrompt={enhancingPrompt}
                            generatingImage={generatingImage}
                            content={content}
                            topic={topic}
                            handleEnhancePrompt={handleEnhancePrompt}
                            handleGenerateImageWithContext={handleGenerateImageWithContext}
                            referenceImageUrl={referenceImageUrl}
                            setReferenceImageUrl={setReferenceImageUrl}
                            onReferenceUploadClick={() => referenceFileInputRef.current?.click()}
                            imageUrl={imageUrl}
                            setImageUrl={setImageUrl}
                            handleGenerateImage={handleGenerateImage}
                        />
                    )}

                    <input
                        ref={referenceFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleReferenceImageUpload}
                        className="hidden"
                    />

                    <PostSettings
                        date={date}
                        setDate={setDate}
                        saving={saving}
                        hour={hour}
                        setHour={setHour}
                        minute={minute}
                        setMinute={setMinute}
                        showSubredditField={connectedPlatforms.includes("reddit")}
                        subreddit={subreddit}
                        setSubreddit={setSubreddit}
                    />
                </div>

                {/* Editor & Preview */}
                <div className="animate-fadeUp animation-delay-200 lg:col-span-2 flex flex-col gap-0">
                    <Tabs value={activePlatform} onValueChange={setActivePlatform} className="w-full h-full flex flex-col">
                        <PlatformTabs
                            connectedPlatforms={connectedPlatforms}
                            activePlatform={activePlatform}
                            setActivePlatform={setActivePlatform}
                        />

                        <Card className="flex-1 p-5 rounded-3xl border border-border bg-card shadow-xl transition-all hover:border-border/80 flex flex-col min-h-125">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full flex-1">
                                
                                {/* Editor Side */}
                                <EditorTextArea
                                    activePlatform={activePlatform}
                                    content={content}
                                    setContent={setContent}
                                    maxLimit={LINKEDIN_MAX_LENGTH}
                                />
                                
                                {/* Preview Side */}
                                <div className="hidden lg:flex flex-col border-l border-border pl-6 h-full">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.8px]">Social Preview</h3>
                                    </div>
                                    <div className="flex-1 bg-background rounded-[10px] border border-border/50 flex justify-center p-4 min-h-100">
                                        <div className="w-full h-full">
                                            {(user || profile) && (
                                                <PostPreview 
                                                    platform={activePlatform}
                                                    content={content} 
                                                    image={imageUrl || undefined} 
                                                    user={profile ? { 
                                                        displayName: profile.displayName || null, 
                                                        photoURL: profile.photoURL || null 
                                                    } : user} 
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </Card>
                    </Tabs>

                    <div className="flex gap-2.5 justify-end mt-4">
                        <Button 
                            variant="outline"
                            className="bg-card border border-border text-foreground hover:bg-accent/80 hover:border-border/80 transition-all font-sans font-medium h-11 px-5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-sm" 
                            onClick={handleSave} 
                            disabled={saving || !content.trim()}
                        >
                            {editingPostId ? "Update Post" : "Save Draft"}
                        </Button>
                        <Button 
                            className="bg-primary hover:bg-primary/90 text-primary-foreground hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(99,212,150,0.35)] active:translate-y-0 transition-all font-sans font-bold border-none h-11 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg" 
                            onClick={handleSchedule} 
                            disabled={saving || !content.trim() || !date}
                        >
                            <Save className="mr-2 h-4 w-4 stroke-[2.5]" /> Schedule Post
                        </Button>
                    </div>
                </div>
            </div>

            {/* Mobile Tabs for Preview */}
            <div className="lg:hidden mt-10">
                <Card className="p-4 bg-card border-border rounded-2xl">
                    <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.8px] mb-4">Mobile Preview</h3>
                    <div className="bg-background rounded-xl border border-border p-4">
                        {(user || profile) && (
                            <PostPreview 
                                platform={activePlatform}
                                content={content} 
                                image={imageUrl || undefined} 
                                user={profile ? { 
                                    displayName: profile.displayName || null, 
                                    photoURL: profile.photoURL || null 
                                } : user} 
                            />
                        )}
                    </div>
                </Card>
            </div>
        </div>
    )
}
