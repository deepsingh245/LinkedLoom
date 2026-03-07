"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ThumbsUp, MessageSquare, Share2, Send } from "lucide-react";

interface PostPreviewProps {
    content: string;
    image?: string;
    user?: {
        displayName: string | null;
        photoURL: string | null;
    } | null;
}

export function PostPreview({ content, image, user }: PostPreviewProps) {
    return (
        <Card className="w-full h-full border border-border/50 bg-card shadow-sm overflow-hidden flex flex-col rounded-xl">
            <CardHeader className="flex flex-row items-start gap-3 p-4 pb-2">
                <Avatar className="h-12 w-12 shrink-0 cursor-pointer ring-2 ring-transparent transition-all hover:ring-primary/20">
                    <AvatarImage src={user?.photoURL || "/avatars/01.png"} />
                    <AvatarFallback>{user?.displayName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                        <div className="flex flex-col truncate pr-2">
                            <h3 className="text-[15px] font-semibold text-foreground hover:text-blue-500 hover:underline cursor-pointer truncate transition-colors">
                                {user?.displayName || "User Name"}
                            </h3>
                            <p className="text-[13px] text-muted-foreground truncate">
                                Founder @ LinkedLoom
                            </p>
                            <div className="text-[12px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                <span>Now</span>
                                <span className="text-[8px] leading-none opacity-50">•</span>
                                <span className="opacity-80">🌐</span>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full mt-[-4px] mr-[-8px] hover:bg-muted/50">
                            <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 flex flex-col">
                <div className="px-4 pb-4 pt-1 text-[14px] sm:text-[15px] leading-relaxed whitespace-pre-wrap break-words text-foreground">
                    {content ? (
                        content
                    ) : (
                        <span className="text-muted-foreground italic opacity-70">
                            Your post content will appear here...
                        </span>
                    )}
                </div>

                {image && (
                    <div className="w-full bg-muted flex items-center justify-center text-muted-foreground relative mt-2" style={{ paddingTop: '56.25%' }}>
                        <div className="absolute inset-0 flex items-center justify-center font-medium">Image Preview</div>
                    </div>
                )}
                
                {/* Footer pushes to the bottom */}
                <div className="mt-auto px-1 sm:px-2 pb-1 sm:pb-2">
                    <div className="h-px w-full bg-border/40 my-1"></div>

                    <div className="flex items-center justify-between w-full pt-1">
                        <ActionButton icon={<ThumbsUp className="h-5 w-5 sm:h-[18px] sm:w-[18px] mb-0.5 sm:mb-0" />} label="Like" />
                        <ActionButton icon={<MessageSquare className="h-5 w-5 sm:h-[18px] sm:w-[18px] mb-0.5 sm:mb-0" />} label="Comment" />
                        <ActionButton icon={<Share2 className="h-5 w-5 sm:h-[18px] sm:w-[18px] mb-0.5 sm:mb-0" />} label="Repost" />
                        <ActionButton icon={<Send className="h-5 w-5 sm:h-[18px] sm:w-[18px] mb-0.5 sm:mb-0" />} label="Send" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function ActionButton({ icon, label }: { icon: React.ReactNode, label: string }) {
    return (
        <Button 
            variant="ghost" 
            className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 h-auto py-2.5 sm:py-3 px-0.5 sm:px-2 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-200"
        >
            <span className="shrink-0">{icon}</span>
            <span className="text-[10px] sm:text-[13px] font-medium tracking-wide sm:tracking-normal">{label}</span>
        </Button>
    )
}
