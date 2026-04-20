"use client"


import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
    MoreHorizontal, 
    ThumbsUp, 
    MessageSquare, 
    Share2, 
    Send, 
    Repeat2, 
    Heart, 
    BarChart3, 
    ArrowBigUp, 
    ArrowBigDown, 
    Share,
    Award,
    MessageCircle
} from "lucide-react";
;

interface PostPreviewProps {
    platform: string;
    content: string;
    image?: string;
    user?: {
        displayName: string | null;
        photoURL: string | null;
    } | null;
}

export function PostPreview({ platform, content, image, user }: PostPreviewProps) {
    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-1 min-h-0 flex flex-col">
                {platform === "linkedin" && <LinkedInPreview content={content} image={image} user={user} />}
                {platform === "x" && <XPreview content={content} image={image} user={user} />}
                {platform === "reddit" && <RedditPreview content={content} image={image} user={user} />}
            </div>
        </div>
    );
}

function LinkedInPreview({ content, image, user }: Omit<PostPreviewProps, 'platform'>) {
    return (
        <div className="w-full h-full min-h-full flex flex-col bg-[#1b1f23] border border-[#2d3237] rounded-xl overflow-hidden shadow-xl animate-in fade-in duration-300">
            <div className="flex flex-row items-start gap-3 p-4 pb-2">
                <Avatar className="h-12 w-12 shrink-0 cursor-pointer border border-white/5">
                    <AvatarImage src={user?.photoURL || "/avatars/01.png"} />
                    <AvatarFallback className="bg-[#2d3237] text-white">{user?.displayName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                        <div className="flex flex-col truncate pr-2">
                            <h3 className="text-[14px] font-semibold text-white/95 hover:text-blue-400 hover:underline cursor-pointer truncate transition-colors">
                                {user?.displayName || "User Name"}
                            </h3>
                            <p className="text-[12px] text-white/60 truncate leading-tight">
                                AI Enthusiast | Growing Brands with AutoPost
                            </p>
                            <div className="text-[11px] text-white/50 flex items-center gap-1 mt-0.5">
                                <span>Now</span>
                                <span className="opacity-50">•</span>
                                <span className="text-[10px]">🌐</span>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full text-white/60 hover:bg-white/5">
                            <MoreHorizontal className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 px-4 pb-3 pt-1 text-[14px] leading-relaxed whitespace-pre-wrap wrap-break-word text-white/90 font-sans">
                {content || <span className="text-white/40 italic">Draft your thoughts...</span>}
            </div>

            {image && (
                <div className="w-full bg-[#15191c] relative border-t border-b border-white/5 overflow-hidden">
                    <img src={image} alt="Preview" className="w-full h-auto object-cover max-h-120" />
                </div>
            )}
            
            <div className="mt-auto px-3 pb-2 pt-2 border-t border-white/5 bg-black/10">
                <div className="flex items-center justify-between">
                    <LinkedInAction icon={<ThumbsUp className="h-4 w-4" />} label="Like" />
                    <LinkedInAction icon={<MessageSquare className="h-4 w-4" />} label="Comment" />
                    <LinkedInAction icon={<Share2 className="h-4 w-4" />} label="Repost" />
                    <LinkedInAction icon={<Send className="h-4 w-4" />} label="Send" />
                </div>
            </div>
        </div>
    );
}

function LinkedInAction({ icon, label }: { icon: React.ReactNode, label: string }) {
    return (
        <button className="flex-1 flex items-center justify-center gap-2 h-9 rounded hover:bg-white/5 text-white/60 hover:text-white/90 transition-all font-medium text-[12px]">
            {icon}
            <span>{label}</span>
        </button>
    );
}

function XPreview({ content, image, user }: Omit<PostPreviewProps, 'platform'>) {
    return (
        <div className="w-full h-full min-h-full flex flex-col bg-black border border-[#2f3336] rounded-xl overflow-hidden shadow-xl animate-in fade-in duration-300 font-['Inter',sans-serif]">
            <div className="flex flex-1 flex-row items-start gap-3 p-4">
                <Avatar className="h-10 w-10 shrink-0 cursor-pointer">
                    <AvatarImage src={user?.photoURL || "/avatars/01.png"} />
                    <AvatarFallback className="bg-zinc-800 text-white font-bold">{user?.displayName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 flex flex-col h-full">
                    <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 min-w-0">
                            <h3 className="text-[15px] font-bold text-white truncate">
                                {user?.displayName || "User Name"}
                            </h3>
                            <span className="text-[15px] text-zinc-500 truncate">@{user?.displayName?.toLowerCase().replace(/\s+/g, '') || "user"}</span>
                            <span className="text-zinc-500">·</span>
                            <span className="text-zinc-500">Now</span>
                        </div>
                        <MoreHorizontal className="h-5 w-5 text-zinc-500 shrink-0" />
                    </div>
                    
                    <div className="mt-1 text-[15px] leading-normal text-[#e7e9ea] whitespace-pre-wrap wrap-break-word flex-1">
                        {content || <span className="text-zinc-500 italic">Something interesting...</span>}
                    </div>

                    {image && (
                        <div className="mt-3 rounded-2xl overflow-hidden border border-[#2f3336] max-h-75">
                            <img src={image} alt="Tweet media" className="w-full h-full object-cover" />
                        </div>
                    )}

                    <div className="mt-auto pt-4 flex items-center justify-between max-w-106.25 text-zinc-500">
                        <button className="group flex items-center gap-2 transition-colors hover:text-[#1d9bf0]">
                            <div className="p-2 rounded-full group-hover:bg-[#1d9bf0]/10">
                                <MessageCircle className="h-4.5 w-4.5" />
                            </div>
                            <span className="text-[13px]">2</span>
                        </button>
                        <button className="group flex items-center gap-2 transition-colors hover:text-[#00ba7c]">
                            <div className="p-2 rounded-full group-hover:bg-[#00ba7c]/10">
                                <Repeat2 className="h-4.5 w-4.5" />
                            </div>
                            <span className="text-[13px]">12</span>
                        </button>
                        <button className="group flex items-center gap-2 transition-colors hover:text-[#f91880]">
                            <div className="p-2 rounded-full group-hover:bg-[#f91880]/10">
                                <Heart className="h-4.5 w-4.5" />
                            </div>
                            <span className="text-[13px]">45</span>
                        </button>
                        <button className="group flex items-center gap-2 transition-colors hover:text-[#1d9bf0]">
                            <div className="p-2 rounded-full group-hover:bg-[#1d9bf0]/10">
                                <BarChart3 className="h-4.5 w-4.5" />
                            </div>
                            <span className="text-[13px]">1.2K</span>
                        </button>
                        <div className="flex items-center">
                            <div className="p-2 rounded-full hover:bg-[#1d9bf0]/10 hover:text-[#1d9bf0] transition-colors cursor-pointer">
                                <Share className="h-4.5 w-4.5" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RedditPreview({ content, image, user }: Omit<PostPreviewProps, 'platform'>) {
    return (
        <div className="w-full h-full min-h-full flex flex-col bg-[#1a1a1b] border border-[#343536] rounded-xl overflow-hidden shadow-xl animate-in fade-in duration-300 font-['Inter',sans-serif]">
            <div className="flex flex-row items-stretch flex-1">
                {/* Voting Column */}
                <div className="w-10 bg-[#161617] flex flex-col items-center py-2 gap-1 border-r border-[#343536]/50">
                    <ArrowBigUp className="h-6 w-6 text-[#d7dadc] hover:text-[#ff4500] cursor-pointer" />
                    <span className="text-xs font-bold text-[#d7dadc]">1</span>
                    <ArrowBigDown className="h-6 w-6 text-[#d7dadc] hover:text-[#7193ff] cursor-pointer" />
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col p-2 pl-3">
                    <div className="flex items-center gap-1.5 text-[12px] mb-2">
                        <div className="h-5 w-5 rounded-full bg-orange-600 flex items-center justify-center text-[10px] font-bold text-white">L</div>
                        <span className="font-bold text-[#d7dadc] hover:underline cursor-pointer">r/linkedloom</span>
                        <span className="text-[#818384]">·</span>
                        <span className="text-[#818384]">Posted by u/{user?.displayName?.toLowerCase().replace(/\s+/g, '') || "user"} now</span>
                    </div>

                    <h2 className="text-4.5 font-semibold text-[#d7dadc] leading-tight mb-2">
                        {content?.split('\n')[0]?.substring(0, 80) || "Post Title"}
                    </h2>

                    <div className="text-[14px] text-[#d7dadc] leading-snug whitespace-pre-wrap flex-1">
                        {content?.substring(content?.split('\n')[0]?.length || 0) || <span className="text-[#818384] italic">What&apos;s on your mind?</span>}
                    </div>

                    {image && (
                        <div className="mt-3 rounded border border-[#343536] bg-black/20 overflow-hidden flex items-center justify-center max-h-75">
                            <img src={image} alt="Reddit content" className="max-w-full h-auto object-contain max-h-full" />
                        </div>
                    )}

                    <div className="mt-auto pt-4 flex items-center gap-1 text-[12px] text-[#818384] font-bold border-t border-[#343536]/50">
                        <button className="flex items-center gap-1.5 p-2 rounded hover:bg-[#2d2d2e] transition-colors">
                            <MessageCircle className="h-4 w-4" />
                            <span>0 Comments</span>
                        </button>
                        <button className="flex items-center gap-1.5 p-2 rounded hover:bg-[#2d2d2e] transition-colors">
                            <Share className="h-4 w-4" />
                            <span>Share</span>
                        </button>
                        <button className="flex items-center gap-1.5 p-2 rounded hover:bg-[#2d2d2e] transition-colors">
                            <Award className="h-4 w-4" />
                            <span>Award</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
