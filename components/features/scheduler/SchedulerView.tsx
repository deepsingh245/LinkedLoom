"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Clock, FileText } from "lucide-react"
import { dangerToast } from "@/lib/toast"
import { api } from "@/lib/api"
import { Post } from "@/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function SchedulerView() {
    const [date, setDate] = React.useState<Date | undefined>(new Date())

    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const [scheduledPosts, setScheduledPosts] = React.useState<Post[]>([]);
    const [drafts, setDrafts] = React.useState<Post[]>([]);
    const [selectedDraft, setSelectedDraft] = React.useState<string | undefined>(undefined)

    React.useEffect(() => {
        const fetchScheduledPosts = async () => {
            try {
                const { data } = await api.get('/posts/scheduled')
                setScheduledPosts(data)
            } catch (error) {
                console.error("Failed to fetch scheduled posts", error)
                dangerToast("Failed to fetch scheduled posts")
            }
        }
        fetchScheduledPosts()
    }, [user.id])

    React.useEffect(() => {
        const fetchDrafts = async () => {
            try {
                const { data } = await api.get('/posts/drafts')
                setDrafts(data)
            } catch (error) {
                console.error("Failed to fetch drafts", error)
                dangerToast("Failed to fetch drafts")
            }
        }
        fetchDrafts()
    }, [user.id])

    return (
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 h-[calc(100vh-10rem)]">
            {/* Calendar Section */}
            <Card className="col-span-1 lg:col-span-5 flex flex-col">
                <CardHeader>
                    <CardTitle>Content Calendar</CardTitle>
                    <CardDescription>Manage and schedule your LinkedIn content.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex justify-center p-4">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        className="rounded-md border w-full h-full flex items-center justify-center pointer-events-auto"

                    />
                </CardContent>
            </Card>

            {/* Sidebar Section */}
            <div className="col-span-1 lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Events</h3>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="h-4 w-4 mr-2" /> Schedule
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Schedule Post</DialogTitle>
                            </DialogHeader>
                            <DialogContent>
                                <div className="py-4">
                                    <p className="text-sm text-muted-foreground">Select a draft to schedule for {date?.toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center justify-center">
                                    <Select
                                        value={selectedDraft}
                                        onValueChange={(value) => { setSelectedDraft(value) }}
                                    >
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Select a draft" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {drafts.map((draft) => (
                                                <SelectItem key={draft.id} value={draft.id}>
                                                    {draft.content}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </DialogContent>
                        </DialogContent>
                    </Dialog>

                </div>

                <div className="space-y-2 overflow-y-auto h-[400px]">
                    {scheduledPosts.map((post) => (
                        <Card key={post.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <CardContent className="p-3 flex items-start gap-3">
                                <div className="mt-1">
                                    {post.status === "SCHEDULED" ?
                                        <Clock className="h-4 w-4 text-blue-500" /> :
                                        <FileText className="h-4 w-4 text-gray-500" />
                                    }
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none">{post.content}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {post.publishedAt?.toLocaleDateString()}
                                    </p>
                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm ${post.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}`}>
                                        {post.status}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
