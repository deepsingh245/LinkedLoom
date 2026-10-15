import * as React from "react"
import { Textarea } from "@/components/ui/textarea"

interface EditorTextAreaProps {
    activePlatform: string
    content: string
    setContent: (val: string) => void
    maxLimit: number
}

export function EditorTextArea({
    activePlatform,
    content,
    setContent,
    maxLimit,
}: EditorTextAreaProps) {
    const isOverLimit = content.length > maxLimit;
    const progressPercentage = Math.min(100, (content.length / maxLimit) * 100);

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#7c878e]">Post copy</h3>
            </div>
            <div className="relative flex-1 flex flex-col">
                <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={`Start typing your ${activePlatform} post or generate with AI...`}
                    className="min-h-[340px] w-full flex-1 resize-y rounded-lg border border-[#dfe5e7] bg-white p-4 text-[14px] leading-[1.65] text-[#303a40] outline-none transition placeholder:text-[#9ba5aa] focus:border-[#79a99e] focus:ring-2 focus:ring-[#357d72]/10 md:p-5"
                />
            </div>
            
            <div className="mb-2 mt-4 h-1 overflow-hidden rounded-full bg-[#edf0f2] transition-all">
                <div 
                    className={`h-full transition-all ${isOverLimit ? 'bg-destructive' : 'bg-[#357d72]'}`}
                    style={{width: `${progressPercentage}%`}}
                />
            </div>
            <div className="flex justify-between items-center text-[11px] font-medium">
                <span className="text-muted-foreground">{content.length}/{maxLimit} chars</span>
                <span className={isOverLimit ? "text-destructive" : "text-muted-foreground"}>
                    {isOverLimit ? `${content.length - maxLimit} over limit` : `${maxLimit - content.length} remaining`}
                </span>
            </div>
        </div>
    )
}
