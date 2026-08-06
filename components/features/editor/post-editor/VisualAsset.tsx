import * as React from "react"
import { Sparkles, Wand2, RefreshCw, X, Upload, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"

interface VisualAssetProps {
    imagePrompt: string
    setImagePrompt: (val: string) => void
    enhancingPrompt: boolean
    generatingImage: boolean
    content: string
    topic: string
    handleEnhancePrompt: () => void
    handleGenerateImageWithContext: () => void
    referenceImageUrl: string | null
    setReferenceImageUrl: (val: string | null) => void
    onReferenceUploadClick: () => void
    imageUrl: string | null
    setImageUrl: (val: string | null) => void
    handleGenerateImage: () => void
}

export function VisualAsset({
    imagePrompt,
    setImagePrompt,
    enhancingPrompt,
    generatingImage,
    content,
    topic,
    handleEnhancePrompt,
    handleGenerateImageWithContext,
    referenceImageUrl,
    setReferenceImageUrl,
    onReferenceUploadClick,
    imageUrl,
    setImageUrl,
    handleGenerateImage,
}: VisualAssetProps) {
    return (
        <Card className="animate-in fade-in slide-in-from-top-2 duration-300 p-5 rounded-2xl border border-border bg-card shadow-sm transition-all hover:border-border/80">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.8px] mb-4 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Visual Asset
            </h3>
            
            <div className="mb-3.5">
                <Label className="text-[12.5px] text-muted-foreground mb-1.5 block font-medium">Image Prompt (Optional)</Label>
                <div className="flex flex-col gap-2">
                    <Textarea
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        placeholder="Describe the image you want..."
                        className="flex-1 min-h-20 bg-background border border-border text-foreground text-[13.5px] rounded-[10px] px-3.5 py-2.5 transition-all focus:border-primary focus:ring-1 focus:ring-primary outline-none placeholder:text-muted-foreground/50 resize-none"
                    />
                    <div className="flex gap-2">
                        <Button
                            onClick={handleEnhancePrompt}
                            disabled={enhancingPrompt || generatingImage || (!imagePrompt.trim() && !content.trim() && !topic.trim())}
                            variant="outline"
                            className="h-9.5 px-3 bg-background border-border hover:border-primary/40 hover:bg-accent text-muted-foreground hover:text-primary rounded-[10px] transition-all disabled:opacity-50 flex gap-2 text-[12px] font-medium"
                        >
                            {enhancingPrompt ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                            <span>Enhance</span>
                        </Button>
                        <Button
                            onClick={handleGenerateImageWithContext}
                            disabled={generatingImage || enhancingPrompt || !content.trim()}
                            variant="outline"
                            className="h-9.5 px-3 bg-background border-border hover:border-primary/40 hover:bg-accent text-muted-foreground hover:text-primary rounded-[10px] transition-all disabled:opacity-50 flex gap-2 text-[12px] font-medium whitespace-nowrap"
                            title="Get context from post and generate image"
                        >
                            {generatingImage ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                            <span>Get context from post</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Reference Image Section */}
            <div className="mb-4">
                <Label className="text-[12.5px] text-muted-foreground mb-2 block font-medium">Reference Image (AI Context)</Label>
                {referenceImageUrl ? (
                    <div className="relative group rounded-lg overflow-hidden border border-border aspect-video w-1/2">
                        <img src={referenceImageUrl} alt="Reference context" loading="lazy" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button 
                                onClick={() => setReferenceImageUrl(null)}
                                variant="destructive"
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button
                        onClick={onReferenceUploadClick}
                        disabled={generatingImage}
                        variant="outline"
                        className="h-10 text-[12.5px] px-4 bg-background border-border hover:border-primary/40 text-muted-foreground rounded-[10px]"
                    >
                        <Upload className="mr-2 h-3.5 w-3.5" />
                        Upload AI Context Image
                    </Button>
                )}
            </div>

            {imageUrl ? (
                <div className="relative group mb-4 rounded-xl overflow-hidden border border-border aspect-video">
                    <img src={imageUrl} alt="Generated asset" loading="lazy" className="w-full h-full object-cover" />
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
                        variant="outline"
                        onClick={handleGenerateImage} 
                        disabled={generatingImage || (!topic.trim() && !content.trim() && !imagePrompt.trim())}
                        className="flex-1 flex items-center justify-center bg-accent border border-border text-foreground hover:bg-accent/80 hover:border-primary/40 transition-all font-sans font-medium h-11 px-5 rounded-[10px] disabled:opacity-50"
                    >
                        {generatingImage ? <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="mr-2 h-3.5 w-3.5 text-primary" />}
                        {generatingImage ? "Generating..." : "Generate AI Image"}
                    </Button>
                </div>
            )}
        </Card>
    )
}
