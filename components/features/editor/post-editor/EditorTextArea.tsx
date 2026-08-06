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
                <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.8px]">Content</h3>
            </div>
            <div className="relative flex-1 flex flex-col">
                <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={`Start typing your ${activePlatform} post or generate with AI...`}
                    className="flex-1 w-full min-h-100 bg-background border border-border text-foreground text-[15px] leading-[1.6] font-sans rounded-[10px] p-5 transition-all focus:border-primary/50 focus:ring-[3px] focus:ring-primary/10 outline-none placeholder:text-muted-foreground/50 resize-none"
                />
            </div>
            
            <div className="h-1 bg-muted rounded-full overflow-hidden mt-4 mb-2 transition-all">
                <div 
                    className={`h-full transition-all ${isOverLimit ? 'bg-destructive' : 'bg-primary'}`} 
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
