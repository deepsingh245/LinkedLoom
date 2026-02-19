"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { Post } from "@/types";
import { Loader2, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface EditPostDialogProps {
    post: Post;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onPostUpdated: () => void;
}

export function EditPostDialog({
    post,
    open,
    onOpenChange,
    onPostUpdated,
}: EditPostDialogProps) {
    const [content, setContent] = useState(post.content);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSave = async () => {
        try {
            setLoading(true);
            await api.put(`/posts/${post.id}`, { content });
            toast.success("Post updated successfully");
            onPostUpdated();
            onOpenChange(false);
        } catch (error) {
            toast.error("Failed to update post");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditWithAI = () => {
        // Assuming /create handles 'edit' query param or we just pass content via state/context
        // For simplicity, passing content via query param or store would be ideal.
        // Here we'll just navigate to create page. Ideally we should have a way to prefill.
        // For now, let's assume the user wants to use AI on this content.
        // We could store it in localStorage "draft_post" or similar before navigating.
        localStorage.setItem("draft_post", JSON.stringify({ ...post, content }));
        router.push("/create?mode=edit");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Edit Post</DialogTitle>
                    <DialogDescription>
                        Make changes to your post here. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="min-h-[200px]"
                        placeholder="Type your post content here..."
                    />
                </div>
                <DialogFooter className="flex justify-between sm:justify-between">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleEditWithAI}
                        className="gap-2"
                    >
                        <Wand2 className="h-4 w-4" />
                        Edit with AI
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
