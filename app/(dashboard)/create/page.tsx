import { PostEditor } from "@/components/features/editor/PostEditor";

export default function CreatePostPage() {
    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Create Post</h2>
            </div>
            <PostEditor />
        </div>
    )
}
