"use client"
import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Check, Camera, Loader2, Linkedin, Globe, Pencil } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"
import { updateUserProfile } from "@/lib/firebase/user"
import { dangerToast, successToast } from "@/lib/toast"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { uploadProfilePhoto } from "@/lib/firebase/storage"
import { XIcon, RedditIcon, MediumIcon } from "@/components/shared/Icons"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

export default function ProfileSettingsPage() {
    const { profile } = useAuth()
    const [loading, setLoading] = useState(false)
    const [connectingId, setConnectingId] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [formData, setFormData] = useState({
        displayName: "",
        jobTitle: "",
        company: "",
        location: "",
        bio: "",
        email: "",
        phone: "",
        website: "",
        twitter: "",
        linkedin: "",
        reddit: "",
        medium: "",
    })

    const handleConnectLinkedIn = async () => {
        try {
            setConnectingId("linkedin");
            const data = await api.firebaseService.getLinkedInAuthUrl();
            if (data.url) {
                window.location.href = data.url
            } else {
                dangerToast("Failed to initialize LinkedIn connection.")
            }
        } catch (error) {
            console.error(error)
            dangerToast("LinkedIn Connection failed")
        } finally {
            setConnectingId(null);
        }
    }

    useEffect(() => {
        if (profile) {
            setFormData({
                displayName: profile.displayName || "",
                jobTitle: profile.jobTitle || "",
                company: profile.company || "",
                location: profile.location || "",
                bio: profile.bio || "",
                email: profile.email || "",
                phone: profile.phone || "",
                website: profile.website || "",
                twitter: profile.twitter || "",
                linkedin: profile.linkedin || "",
                reddit: profile.reddit || "",
                medium: profile.medium || "",
            })
        }
    }, [profile])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target
        setFormData(prev => ({ ...prev, [id]: value }))
    }

    const handleSave = async () => {
        if (!profile?.uid) return
        setLoading(true)
        try {
            await updateUserProfile(profile.uid, formData)
            successToast("Your changes have been saved successfully.")
            setIsEditing(false)
        } catch (error) {
            console.error(error)
            dangerToast("Failed to update profile. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const handleCancel = () => {
        if (profile) {
            setFormData({
                displayName: profile.displayName || "",
                jobTitle: profile.jobTitle || "",
                company: profile.company || "",
                location: profile.location || "",
                bio: profile.bio || "",
                email: profile.email || "",
                phone: profile.phone || "",
                website: profile.website || "",
                twitter: profile.twitter || "",
                linkedin: profile.linkedin || "",
                reddit: profile.reddit || "",
                medium: profile.medium || "",
            })
        }
        setIsEditing(false)
    }

    const handleUploadClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !profile?.uid) return

        if (!file.type.startsWith("image/")) {
            return dangerToast("Please select an image file.")
        }
        if (file.size > 5 * 1024 * 1024) {
            return dangerToast("Image must be under 5MB.")
        }

        setUploading(true)
        try {
            const url = await uploadProfilePhoto(profile.uid, file)
            await updateUserProfile(profile.uid, { photoURL: url })
            successToast("Profile picture updated successfully!")
            setIsEditModalOpen(false)
        } catch (error) {
            console.error("Failed to upload photo:", error)
            dangerToast("Failed to upload photo.")
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    const handleRemovePhoto = async () => {
        if (!profile?.uid) return
        setUploading(true)
        try {
            await updateUserProfile(profile.uid, { photoURL: null })
            successToast("Profile picture removed.")
            setIsEditModalOpen(false)
        } catch (error) {
            console.error("Failed to remove photo:", error)
            dangerToast("Failed to remove profile picture.")
        } finally {
            setUploading(false)
        }
    }

    const initials = profile?.displayName 
        ? profile.displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
        : profile?.email?.substring(0, 2).toUpperCase() || '??';

    return (
        <div className="space-y-6 text-foreground">
            <div>
                <h1 className="text-3xl font-display font-semibold tracking-tight text-foreground mb-1">Account Settings</h1>
                <p className="text-muted-foreground">Manage your profile, subscription, and preferences.</p>
            </div>

            <Card className="bg-card border-border rounded-2xl shadow-sm">
                <CardContent className="p-6 flex items-center gap-6">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-linear-to-br from-accent to-background border border-border flex items-center justify-center text-2xl font-bold text-primary overflow-hidden shadow-inner">
                            {profile?.photoURL ? (
                                <img src={profile.photoURL} alt={profile.displayName || "Avatar"} loading="lazy" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                initials
                            )}
                        </div>
                        <button 
                            onClick={() => setIsEditModalOpen(true)}
                            className="absolute bottom-0 right-0 w-8 h-8 bg-background border border-border rounded-full flex items-center justify-center text-primary hover:bg-accent transition-colors shadow-sm"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-display font-semibold text-foreground truncate">{profile?.displayName || 'User'}</h3>
                        <p className="text-muted-foreground text-sm mb-1 truncate">{profile?.jobTitle || 'No job title'} {profile?.company ? `at ${profile.company}` : ''}</p>
                        {profile?.bio && (
                            <p className="text-muted-foreground/80 text-xs italic max-w-lg line-clamp-2">{profile.bio}</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-card border-border rounded-2xl shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between p-6 pb-4">
                    <CardTitle className="text-base font-semibold text-foreground">Basic Information</CardTitle>
                    {!isEditing ? (
                        <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-1.5 border-border hover:border-primary/45 transition-colors font-semibold"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit Profile
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancel}
                                disabled={loading}
                                className="border-border text-foreground hover:bg-accent font-semibold"
                            >
                                Cancel
                            </Button>
                            <Button 
                                size="sm" 
                                onClick={handleSave} 
                                disabled={loading}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-lg"
                            >
                                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                                Save Changes
                            </Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="displayName" className="text-muted-foreground text-xs font-medium">Full Name</Label>
                            <Input 
                                id="displayName"
                                value={formData.displayName} 
                                onChange={handleChange}
                                disabled={!isEditing}
                                className="bg-background border-border focus:border-primary shadow-none text-foreground disabled:opacity-70 disabled:cursor-not-allowed" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="jobTitle" className="text-muted-foreground text-xs font-medium">Job Title</Label>
                            <Input 
                                id="jobTitle"
                                value={formData.jobTitle} 
                                onChange={handleChange}
                                disabled={!isEditing}
                                className="bg-background border-border focus:border-primary shadow-none text-foreground disabled:opacity-70 disabled:cursor-not-allowed" 
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="company" className="text-muted-foreground text-xs font-medium">Company</Label>
                            <Input 
                                id="company"
                                value={formData.company} 
                                onChange={handleChange}
                                disabled={!isEditing}
                                className="bg-background border-border focus:border-primary shadow-none text-foreground disabled:opacity-70 disabled:cursor-not-allowed" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="location" className="text-muted-foreground text-xs font-medium">Location</Label>
                            <Input 
                                id="location"
                                value={formData.location} 
                                onChange={handleChange}
                                disabled={!isEditing}
                                className="bg-background border-border focus:border-primary shadow-none text-foreground disabled:opacity-70 disabled:cursor-not-allowed" 
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="bio" className="text-muted-foreground text-xs font-medium">Bio</Label>
                        <Textarea 
                            id="bio"
                            value={formData.bio} 
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="bg-background border-border focus:border-primary shadow-none resize-none h-24 text-foreground disabled:opacity-70 disabled:cursor-not-allowed" 
                        />
                        <p className="text-[11px] text-muted-foreground/75 font-medium">Shown on your public profile. Max 300 characters.</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-card border-border rounded-2xl shadow-sm">
                <CardHeader className="p-6 pb-4">
                    <CardTitle className="text-base font-semibold text-foreground">Contact & Social</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-muted-foreground text-xs font-medium">Email</Label>
                            <Input 
                                id="email"
                                value={formData.email} 
                                onChange={handleChange}
                                type="email" 
                                disabled={!isEditing}
                                className="bg-background border-border focus:border-primary shadow-none text-foreground disabled:opacity-70 disabled:cursor-not-allowed" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="text-muted-foreground text-xs font-medium">Phone</Label>
                            <Input 
                                id="phone"
                                value={formData.phone} 
                                onChange={handleChange}
                                type="tel" 
                                disabled={!isEditing}
                                className="bg-background border-border focus:border-primary shadow-none text-foreground disabled:opacity-70 disabled:cursor-not-allowed" 
                            />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="website" className="text-muted-foreground text-xs font-medium">Website</Label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                            <Input 
                                id="website"
                                value={formData.website} 
                                onChange={handleChange}
                                placeholder="https://example.com"
                                disabled={!isEditing}
                                className="bg-background border-border focus:border-primary shadow-none pl-9 text-foreground disabled:opacity-70 disabled:cursor-not-allowed" 
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-card border-border rounded-2xl shadow-sm">
                <CardHeader className="p-6 pb-2">
                    <CardTitle className="text-base font-semibold text-foreground">Connected Accounts</CardTitle>
                    <p className="text-xs text-muted-foreground">Link your social media accounts to enable direct cross-platform posting.</p>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* LinkedIn */}
                        <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl hover:border-primary/30 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 flex items-center justify-center bg-[#0a66c2]/10 rounded-lg">
                                    <Linkedin className="w-5 h-5 text-[#0a66c2]" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">LinkedIn</p>
                                    <p className="text-[11px] text-muted-foreground">Professional Network</p>
                                </div>
                            </div>
                            <Button 
                                size="sm" 
                                variant="outline"
                                className={cn(
                                    "transition-colors duration-200",
                                    profile?.linkedin 
                                        ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20" 
                                        : "bg-background border-border text-foreground hover:bg-primary hover:border-primary hover:text-primary-foreground font-semibold"
                                )}
                                onClick={handleConnectLinkedIn}
                                disabled={connectingId === "linkedin"}
                            >
                                {connectingId === "linkedin" ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Linkedin className="mr-2 h-4 w-4" />
                                )}
                                {profile?.linkedin ? "Connected" : "Connect"}
                            </Button>
                        </div>

                        {/* X (Twitter) */}
                        <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl opacity-60">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 flex items-center justify-center bg-muted rounded-lg">
                                    <XIcon className="w-4 h-4 text-foreground" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">X (Twitter)</p>
                                    <p className="text-[11px] text-muted-foreground">Coming Soon</p>
                                </div>
                            </div>
                            <Button 
                                size="sm" 
                                variant="outline"
                                disabled
                                className="h-8 border-border text-xs cursor-not-allowed text-muted-foreground"
                            >
                                Connect
                            </Button>
                        </div>

                        {/* Reddit */}
                        <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl opacity-60">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 flex items-center justify-center bg-[#ff4500]/10 rounded-lg">
                                    <RedditIcon className="w-5 h-5 text-[#ff4500]" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">Reddit</p>
                                    <p className="text-[11px] text-muted-foreground">Coming Soon</p>
                                </div>
                            </div>
                            <Button 
                                size="sm" 
                                variant="outline"
                                disabled
                                className="h-8 border-border text-xs cursor-not-allowed text-muted-foreground"
                            >
                                Connect
                            </Button>
                        </div>

                        {/* Medium */}
                        <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl opacity-60">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 flex items-center justify-center bg-muted rounded-lg">
                                    <MediumIcon className="w-5 h-5 text-foreground" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">Medium</p>
                                    <p className="text-[11px] text-muted-foreground">Coming Soon</p>
                                </div>
                            </div>
                            <Button 
                                size="sm" 
                                variant="outline"
                                disabled
                                className="h-8 border-border text-xs cursor-not-allowed text-muted-foreground"
                            >
                                Connect
                            </Button>
                        </div>
                    </div>
                </CardContent>

            </Card>

            <Card className="bg-destructive/5 border-destructive/20 rounded-2xl shadow-sm">
                <CardHeader className="p-6 pb-2">
                    <CardTitle className="text-base font-semibold text-destructive flex items-center">
                        ⚠️ Danger Zone
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-2">
                     <p className="text-muted-foreground text-sm mb-4">Once you delete your account, all data is permanently removed. This cannot be undone.</p>
                     <Button variant="outline" size="sm" className="bg-transparent border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30">
                        Request Deletion of Account
                    </Button>
                </CardContent>
            </Card>

            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">Edit Profile Photo</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-4">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />
                        <Button 
                            onClick={handleUploadClick}
                            disabled={uploading}
                            className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold flex items-center justify-center gap-2 h-11 rounded-xl"
                        >
                            {uploading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Camera className="w-4 h-4" />
                            )}
                            Upload New Photo
                        </Button>
                        
                        {profile?.photoURL && (
                            <Button 
                                onClick={handleRemovePhoto}
                                disabled={uploading}
                                variant="outline"
                                className="w-full bg-transparent border-destructive/30 hover:border-destructive text-destructive hover:bg-destructive/5 font-semibold flex items-center justify-center gap-2 h-11 rounded-xl"
                            >
                                Remove Current Photo
                            </Button>
                        )}
                        
                        <Button 
                            onClick={() => setIsEditModalOpen(false)}
                            disabled={uploading}
                            variant="ghost"
                            className="w-full text-muted-foreground hover:text-foreground h-11 rounded-xl"
                        >
                            Cancel
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
