import * as React from "react"
import { Wand2, RefreshCw, Upload, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Card } from "@/components/ui/card"

interface AIGenerationProps {
    topic: string
    setTopic: (val: string) => void
    tone: string
    setTone: (val: string) => void
    length: number[]
    setLength: (val: number[]) => void
    excludeIcons: boolean
    setExcludeIcons: (val: boolean) => void
    creativeExpansion: boolean
    setCreativeExpansion: (val: boolean) => void
    showAdvanced: boolean
    setShowAdvanced: (val: boolean) => void
    generating: boolean
    handleGenerate: () => void
    onUploadClick: () => void
    saving: boolean
    showImageOptions: boolean
    setShowImageOptions: (val: boolean) => void
}

export function AIGeneration({
    topic,
    setTopic,
    tone,
    setTone,
    length,
    setLength,
    excludeIcons,
    setExcludeIcons,
    creativeExpansion,
    setCreativeExpansion,
    showAdvanced,
    setShowAdvanced,
    generating,
    handleGenerate,
    onUploadClick,
    saving,
    showImageOptions,
    setShowImageOptions,
}: AIGenerationProps) {
    return (
        <Card className="animate-fadeUp animation-delay-100 p-5 rounded-2xl border border-border bg-card shadow-sm transition-all hover:border-accent">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.8px] mb-4">
                AI Generation
            </h3>
            
            <div className="mb-3.5">
                <Label className="text-[12.5px] text-muted-foreground mb-1.5 block font-medium">Topic *</Label>
                <Textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Leading remote teams"
                    className="w-full min-h-15 bg-background border border-border text-foreground text-[13.5px] rounded-[10px] px-3.5 py-2.5 transition-all focus:border-primary focus:shadow-[0_0_0_1px_rgba(99,212,150,0.5)] outline-none placeholder:text-muted-foreground/50 resize-none"
                />
            </div>
            
            <div className="mb-3.5">
                <Label className="text-[12.5px] text-muted-foreground mb-1.5 block font-medium">Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="w-full h-11 bg-background border border-border text-foreground text-[13.5px] rounded-[10px] px-3.5 focus:ring-1 focus:ring-primary">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="viral">Viral / Hook-heavy</SelectItem>
                        <SelectItem value="storytelling">Storytelling</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            <div className="mb-4.5">
                <Label className="text-[12.5px] text-muted-foreground mb-3 font-medium flex justify-between items-center">
                    <span>Post Length (chars)</span>
                    <input
                        type="number"
                        min={100}
                        max={3000}
                        value={length[0]}
                        onChange={(e) => {
                            const val = Math.max(100, Math.min(3000, parseInt(e.target.value) || 100));
                            setLength([val]);
                        }}
                        className="w-20 bg-background border border-border text-foreground text-[13.5px] rounded-[6px] px-2 py-0.5 text-right font-semibold focus:border-primary focus:outline-none"
                    />
                </Label>
                <Slider
                    value={length}
                    onValueChange={setLength}
                    min={100}
                    max={3000}
                    step={50}
                    className="w-full"
                />
            </div>

            {/* Collapsible Advanced Options Toggle */}
            <div className="mb-4">
                <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center justify-between w-full text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-all py-2 px-3 bg-accent/15 hover:bg-accent/30 border border-border/50 rounded-xl"
                >
                    <span>Advanced Options</span>
                    <ChevronDown 
                        className={`w-4 h-4 transition-transform duration-200 ${
                            showAdvanced ? "rotate-180" : ""
                        }`} 
                    />
                </button>
                {showAdvanced && (
                    <div className="mt-2 space-y-3.5 p-3.5 rounded-xl bg-accent/10 border border-border/40 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[12.5px] font-medium text-foreground">Don't include emojis</span>
                                <span className="text-[10.5px] text-muted-foreground leading-tight">Write in text only, with no icons.</span>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setExcludeIcons(!excludeIcons)}
                                className={`relative w-9 min-w-9 h-5 rounded-full transition-all duration-300 ${excludeIcons ? 'bg-primary' : 'bg-secondary border border-border'}`}
                            >
                                <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all duration-300 shadow-sm ${excludeIcons ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[12.5px] font-medium text-foreground">Add more from yourself</span>
                                <span className="text-[10.5px] text-muted-foreground leading-tight">Expand with original ideas and elaboration.</span>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setCreativeExpansion(!creativeExpansion)}
                                className={`relative w-9 min-w-9 h-5 rounded-full transition-all duration-300 ${creativeExpansion ? 'bg-primary' : 'bg-secondary border border-border'}`}
                            >
                                <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all duration-300 shadow-sm ${creativeExpansion ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <Button 
                onClick={handleGenerate} 
                disabled={generating || !topic.trim()}
                className="w-full flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(99,212,150,0.35)] active:translate-y-0 transition-all font-sans font-semibold border-none h-11 px-5 rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {generating ? <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Wand2 className="mr-2 h-3.5 w-3.5" />}
                {generating ? "Generating..." : "Generate Post"}
            </Button>

            <div className="flex gap-2.5 mt-2.5">
                <Button
                    onClick={onUploadClick}
                    disabled={saving}
                    variant="outline"
                    className="flex-1 h-10 text-[12.5px] bg-accent border border-border text-foreground font-medium rounded-[10px] hover:bg-accent/80 hover:border-primary/40"
                >
                    <Upload className="mr-2 h-3.5 w-3.5 text-primary" />
                    Upload Post Image
                </Button>
            </div>

            <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className={`text-[12.5px] font-medium transition-colors ${showImageOptions ? 'text-foreground' : 'text-muted-foreground'}`}>
                        Add AI Image
                    </span>
                </div>
                <button 
                    onClick={() => setShowImageOptions(!showImageOptions)}
                    className={`relative w-10 min-w-10 h-5.5 rounded-full transition-all duration-300 ${showImageOptions ? 'bg-primary' : 'bg-accent border border-border'}`}
                >
                    <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-all duration-300 shadow-sm ${showImageOptions ? 'translate-x-4.5' : 'translate-x-0'}`} />
                </button>
            </div>
        </Card>
    )
}
