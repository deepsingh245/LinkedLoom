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
        <Card className="animate-fadeUp animation-delay-100 rounded-xl border border-[#e2e6ea] bg-white p-4 shadow-none md:p-5">
            <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#7c878e]">
                AI writing assistant
            </h3>
            
            <div className="mb-3.5">
                <Label className="text-[12.5px] text-muted-foreground mb-1.5 block font-medium">Topic *</Label>
                <Textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Leading remote teams"
                    className="w-full min-h-16 resize-none rounded-lg border border-[#dfe5e7] bg-white px-3 py-2.5 text-[13px] text-[#303a40] outline-none transition placeholder:text-[#a3adb2] focus:border-[#79a99e] focus:ring-2 focus:ring-[#357d72]/10"
                />
            </div>
            
            <div className="mb-3.5">
                <Label className="text-[12.5px] text-muted-foreground mb-1.5 block font-medium">Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="h-10 w-full rounded-lg border border-[#dfe5e7] bg-white px-3 text-[12px] text-[#39434a] focus:ring-1 focus:ring-[#357d72]">
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
                        className="w-20 rounded-md border border-[#dfe5e7] bg-white px-2 py-0.5 text-right text-[12px] font-semibold text-[#39434a] focus:border-[#357d72] focus:outline-none"
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
                    className="h-10 w-full rounded-lg bg-[#357d72] px-4 text-xs font-semibold text-white transition hover:bg-[#286c63] disabled:cursor-not-allowed disabled:opacity-50"
            >
                {generating ? <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Wand2 className="mr-2 h-3.5 w-3.5" />}
                {generating ? "Generating..." : "Generate Post"}
            </Button>

            <div className="flex gap-2.5 mt-2.5">
                <Button
                    onClick={onUploadClick}
                    disabled={saving}
                    variant="outline"
                    className="h-9 flex-1 rounded-lg border border-[#dfe5e7] bg-[#f6f8f7] text-[11px] font-medium text-[#4e5a60] hover:border-[#b9d1ca] hover:bg-[#eef5f2]"
                >
                    <Upload className="mr-2 h-3.5 w-3.5 text-primary" />
                    Upload Post Image
                </Button>
            </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#edf0f2] pt-4">
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
