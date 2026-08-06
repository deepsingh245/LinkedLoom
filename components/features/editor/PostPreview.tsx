"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ThumbsUp, MessageSquare, Share2, Send } from "lucide-react";

interface PostPreviewProps {
    content: string;
    image?: string;
}

export function PostPreview({ content, image }: PostPreviewProps) {
    return (
        <Card className="w-full max-w-xl mx-auto border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-start space-y-0 pb-2 p-3">
                <Avatar className="h-12 w-12 mr-3 cursor-pointer">
                    <AvatarImage src="/avatars/01.png" />
                    <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold hover:text-blue-600 hover:underline cursor-pointer">User Name</h3>
                            <p className="text-xs text-muted-foreground">Founder @ LinkGenie • 2h • <span className="text-xs">🌐</span></p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                            <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 pb-2">
                <div className="px-3 pb-3 text-sm whitespace-pre-wrap">
                    {content || "Your post content will appear here..."}
                </div>
                {image && (
                    <div className="w-full h-64 bg-muted flex items-center justify-center text-muted-foreground">
                        Image Preview
                    </div>
                )}

                {/* Engagement Stats */}
                <div className="px-3 py-2 flex items-center justify-between text-xs text-muted-foreground border-b border-border/50 mx-3">
                    <div className="flex items-center gap-1">
                        <span>👍 👏 💡</span>
                        <span>84</span>
                    </div>
                    <div className="flex gap-2">
                        <span>12 comments</span>
                        <span>•</span>
                        <span>4 reposts</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="px-1 py-1 flex items-center justify-between mx-2 mt-1">
                    <ActionButton icon={<ThumbsUp className="h-4 w-4 mr-2" />} label="Like" />
                    <ActionButton icon={<MessageSquare className="h-4 w-4 mr-2" />} label="Comment" />
                    <ActionButton icon={<Share2 className="h-4 w-4 mr-2" />} label="Repost" />
                    <ActionButton icon={<Send className="h-4 w-4 mr-2" />} label="Send" />
                </div>
            </CardContent>
        </Card>
    );
}

function ActionButton({ icon, label }: { icon: React.ReactNode, label: string }) {
    return (
        <Button variant="ghost" className="flex-1 h-10 rounded-md text-muted-foreground font-medium hover:bg-muted/50">
            {icon}
            {label}
        </Button>
    )
}
