"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Check, Camera, Trash, Loader2, Linkedin, Globe } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { updateUserProfile } from "@/lib/firebase/user"
import { dangerToast, successToast } from "@/lib/toast"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

const XIcon = ({ className }: { className?: string }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.294 19.497h2.039L6.486 3.24H4.298l13.31 17.41z" />
    </svg>
)

const RedditIcon = ({ className }: { className?: string }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.056 1.597.011.138.011.273.011.412 0 2.303-2.56 4.182-5.72 4.182-3.16 0-5.72-1.879-5.72-4.182 0-.139 0-.274.011-.412a1.754 1.754 0 0 1-1.056-1.597c0-.968.786-1.754 1.754-1.754.463 0 .875.18 1.179.465 1.192-.834 2.83-1.397 4.637-1.48l.834-3.87a.25.25 0 0 1 .33-.197l3.066.646c.122-.323.438-.549.799-.549zm-9.29 9.389c-.615 0-1.114.499-1.114 1.114 0 .615.499 1.114 1.114 1.114.615 0 1.114-.499 1.114-1.114 0-.615-.499-1.114-1.114-1.114zm8.56 0c-.615 0-1.114.499-1.114 1.114 0 .615.499 1.114 1.114 1.114.615 0 1.114-.499 1.114-1.114 0-.615-.499-1.114-1.114-1.114zm-4.28 2.22c-1.433 0-2.46.745-2.61.895-.125.125-.125.328 0 .453s.328.125.453 0c.01-.01.822-.728 2.157-.728 1.334 0 2.146.718 2.156.728.125.125.328.125.454 0s.125-.328 0-.453c-.15-.15-1.177-.895-2.61-.895z" />
    </svg>
)

const MediumIcon = ({ className }: { className?: string }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M13.54 12a6.8 6.8 0 11-13.54 0 6.8 6.8 0 0113.54 0zM20.966 12c0 3.542-.79 6.413-1.767 6.413-1.008 0-1.767-2.871-1.767-6.413 0-3.542.759-6.414 1.767-6.414 1.008 0 1.767 2.872 1.767 6.414zM24 12c0 3.171-.239 5.76-.501 5.76-.263 0-.502-2.589-.502-5.76 0-3.141.239-5.706.502-5.706.262 0 .501 2.565.501 5.706z" />
    </svg>
)

export default function ProfileSettingsPage() {
    const { profile } = useAuth()
    const [loading, setLoading] = useState(false)
    const [connectingId, setConnectingId] = useState<string | null>(null);
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

    const handleConnectPlaceholder = (platform: string) => {
        dangerToast(`${platform} connection is coming soon!`);
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
        } catch (error) {
            console.error(error)
            dangerToast("Failed to update profile. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const initials = profile?.displayName 
        ? profile.displayName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
        : profile?.email?.substring(0, 2).toUpperCase() || '??';

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-display font-semibold tracking-tight text-[#f0f0f8] mb-1">Account Settings</h1>
                <p className="text-[#8888a0]">Manage your profile, subscription, and preferences.</p>
            </div>

            <Card className="bg-[#13131a] border-[#1e1e2a] rounded-2xl">
                <CardContent className="p-6 flex items-center gap-6">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#1a2e22] to-[#13241b] border border-[#2a4a36] flex items-center justify-center text-2xl font-bold text-[#63d496]">
                            {profile?.photoURL ? (
                                <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                initials
                            )}
                        </div>
                        <button className="absolute bottom-0 right-0 w-8 h-8 bg-[#1a1a24] border border-[#2a2a3a] rounded-full flex items-center justify-center text-[#63d496] hover:bg-[#2a2a3a] transition-colors">
                            <Camera className="w-4 h-4" />
                        </button>
                    </div>
                    <div>
                        <h3 className="text-xl font-display font-semibold text-[#f0f0f8]">{profile?.displayName || 'User'}</h3>
                        <p className="text-[#8888a0] text-sm mb-4">{profile?.jobTitle || 'No job title'} {profile?.company ? `at ${profile.company}` : ''}</p>
                        <div className="flex gap-3">
                            <Button variant="outline" size="sm" className="bg-[#1a1a24] border-[#2a2a3a] hover:bg-[#2a2a3a] hover:text-[#f0f0f8] text-[#c0c0d8]">
                                <Camera className="w-4 h-4 mr-2" />
                                Upload Photo
                            </Button>
                            <Button variant="outline" size="sm" className="bg-transparent border-[#3a1a1a] text-[#f06464] hover:bg-[#2a1a1a] hover:text-[#f06464]">
                                Remove
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-[#13131a] border-[#1e1e2a] rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between p-6 pb-4">
                    <CardTitle className="text-base font-semibold text-[#f0f0f8]">Basic Information</CardTitle>
                    <Button 
                        size="sm" 
                        onClick={handleSave} 
                        disabled={loading}
                        className="bg-gradient-to-br from-[#63d496] to-[#3db87a] text-[#0a1a10] hover:shadow-[0_8px_24px_rgba(99,212,150,0.35)]"
                    >
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                        Save Changes
                    </Button>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="displayName" className="text-[#8888a0] text-xs font-medium">Full Name</Label>
                            <Input 
                                id="displayName"
                                value={formData.displayName} 
                                onChange={handleChange}
                                className="bg-[#0e0e16] border-[#2a2a3a] focus:border-[#63d496] shadow-none" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="jobTitle" className="text-[#8888a0] text-xs font-medium">Job Title</Label>
                            <Input 
                                id="jobTitle"
                                value={formData.jobTitle} 
                                onChange={handleChange}
                                className="bg-[#0e0e16] border-[#2a2a3a] focus:border-[#63d496] shadow-none" 
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="company" className="text-[#8888a0] text-xs font-medium">Company</Label>
                            <Input 
                                id="company"
                                value={formData.company} 
                                onChange={handleChange}
                                className="bg-[#0e0e16] border-[#2a2a3a] focus:border-[#63d496] shadow-none" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="location" className="text-[#8888a0] text-xs font-medium">Location</Label>
                            <Input 
                                id="location"
                                value={formData.location} 
                                onChange={handleChange}
                                className="bg-[#0e0e16] border-[#2a2a3a] focus:border-[#63d496] shadow-none" 
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="bio" className="text-[#8888a0] text-xs font-medium">Bio</Label>
                        <Textarea 
                            id="bio"
                            value={formData.bio} 
                            onChange={handleChange}
                            className="bg-[#0e0e16] border-[#2a2a3a] focus:border-[#63d496] shadow-none resize-none h-24" 
                        />
                        <p className="text-[11px] text-[#5a5a78]">Shown on your public profile. Max 300 characters.</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-[#13131a] border-[#1e1e2a] rounded-2xl">
                <CardHeader className="p-6 pb-4">
                    <CardTitle className="text-base font-semibold text-[#f0f0f8]">Contact & Social</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-[#8888a0] text-xs font-medium">Email</Label>
                            <Input 
                                id="email"
                                value={formData.email} 
                                onChange={handleChange}
                                type="email" 
                                className="bg-[#0e0e16] border-[#2a2a3a] focus:border-[#63d496] shadow-none" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="text-[#8888a0] text-xs font-medium">Phone</Label>
                            <Input 
                                id="phone"
                                value={formData.phone} 
                                onChange={handleChange}
                                type="tel" 
                                className="bg-[#0e0e16] border-[#2a2a3a] focus:border-[#63d496] shadow-none" 
                            />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="website" className="text-[#8888a0] text-xs font-medium">Website</Label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a78]" />
                            <Input 
                                id="website"
                                value={formData.website} 
                                onChange={handleChange}
                                placeholder="https://example.com"
                                className="bg-[#0e0e16] border-[#2a2a3a] focus:border-[#63d496] shadow-none pl-9" 
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-[#13131a] border-[#1e1e2a] rounded-2xl">
                <CardHeader className="p-6 pb-2">
                    <CardTitle className="text-base font-semibold text-[#f0f0f8]">Connected Accounts</CardTitle>
                    <p className="text-xs text-[#8888a0]">Link your social media accounts to enable direct cross-platform posting.</p>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* LinkedIn */}
                        <div className="flex items-center justify-between p-4 bg-[#0e0e16] border border-[#2a2a3a] rounded-xl hover:border-[#63d496]/30 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 flex items-center justify-center bg-[#0a66c2]/10 rounded-lg">
                                    <Linkedin className="w-5 h-5 text-[#0a66c2]" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[#f0f0f8]">LinkedIn</p>
                                    <p className="text-[11px] text-[#5a5a78]">Professional Network</p>
                                </div>
                            </div>
                            <Button 
                                size="sm" 
                                variant="outline"
                                onClick={handleConnectLinkedIn}
                                disabled={connectingId === "linkedin"}
                                className={cn(
                                    "h-8 border-[#2a2a3a] text-xs transition-all",
                                    profile?.linkedInId ? "bg-[#63d496]/10 border-[#63d496]/30 text-[#63d496] hover:bg-[#63d496]/20" : "hover:bg-[#63d496] hover:border-[#63d496] hover:text-[#0a1a10]"
                                )}
                            >
                                {connectingId === "linkedin" ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                                {profile?.linkedInId ? "Connected" : "Connect"}
                            </Button>
                        </div>

                        {/* X (Twitter) */}
                        <div className="flex items-center justify-between p-4 bg-[#0e0e16] border border-[#2a2a3a] rounded-xl opacity-60">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 flex items-center justify-center bg-white/5 rounded-lg">
                                    <XIcon className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[#f0f0f8]">X (Twitter)</p>
                                    <p className="text-[11px] text-[#5a5a78]">Coming Soon</p>
                                </div>
                            </div>
                            <Button 
                                size="sm" 
                                variant="outline"
                                disabled
                                className="h-8 border-[#2a2a3a] text-xs cursor-not-allowed"
                            >
                                Connect
                            </Button>
                        </div>

                        {/* Reddit */}
                        <div className="flex items-center justify-between p-4 bg-[#0e0e16] border border-[#2a2a3a] rounded-xl opacity-60">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 flex items-center justify-center bg-[#ff4500]/10 rounded-lg">
                                    <RedditIcon className="w-5 h-5 text-[#ff4500]" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[#f0f0f8]">Reddit</p>
                                    <p className="text-[11px] text-[#5a5a78]">Coming Soon</p>
                                </div>
                            </div>
                            <Button 
                                size="sm" 
                                variant="outline"
                                disabled
                                className="h-8 border-[#2a2a3a] text-xs cursor-not-allowed"
                            >
                                Connect
                            </Button>
                        </div>

                        {/* Medium */}
                        <div className="flex items-center justify-between p-4 bg-[#0e0e16] border border-[#2a2a3a] rounded-xl opacity-60">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 flex items-center justify-center bg-white/5 rounded-lg">
                                    <MediumIcon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[#f0f0f8]">Medium</p>
                                    <p className="text-[11px] text-[#5a5a78]">Coming Soon</p>
                                </div>
                            </div>
                            <Button 
                                size="sm" 
                                variant="outline"
                                disabled
                                className="h-8 border-[#2a2a3a] text-xs cursor-not-allowed"
                            >
                                Connect
                            </Button>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="p-6 pt-0 flex justify-end">
                     <Button 
                        size="sm" 
                        onClick={handleSave} 
                        disabled={loading}
                        className="bg-gradient-to-br from-[#63d496] to-[#3db87a] text-[#0a1a10] hover:shadow-[0_8px_24px_rgba(99,212,150,0.35)]"
                    >
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                        Save Changes
                    </Button>
                </CardFooter>
            </Card>

            {/* <Card className="bg-[#13131a] border-[#1e1e2a] rounded-2xl">
                <CardHeader className="p-6 pb-4">
                    <CardTitle className="text-base font-semibold text-[#f0f0f8]">Change Password</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                     <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[#8888a0] text-xs font-medium">Current Password</Label>
                            <Input type="password" placeholder="••••••••" className="bg-[#0e0e16] border-[#2a2a3a] focus:border-[#63d496] shadow-none" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[#8888a0] text-xs font-medium">New Password</Label>
                            <Input type="password" placeholder="••••••••" className="bg-[#0e0e16] border-[#2a2a3a] focus:border-[#63d496] shadow-none" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[#8888a0] text-xs font-medium">Confirm Password</Label>
                            <Input type="password" placeholder="••••••••" className="bg-[#0e0e16] border-[#2a2a3a] focus:border-[#63d496] shadow-none" />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="p-6 pt-0 flex justify-end">
                     <Button size="sm" className="bg-[#1a2e22] text-[#63d496] hover:bg-[#203a2a] border border-[#2a4a36]">
                        Update Password
                    </Button>
                </CardFooter>
            </Card> */}

            <Card className="bg-[#1a0e0e] border-[#3a1a1a] rounded-2xl">
                <CardHeader className="p-6 pb-2">
                    <CardTitle className="text-base font-semibold text-[#f06464] flex items-center">
                        ⚠️ Danger Zone
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-2">
                     <p className="text-[#8888a0] text-sm mb-4">Once you delete your account, all data is permanently removed. This cannot be undone.</p>
                     <Button variant="outline" size="sm" className="bg-transparent border-[#3a1a1a] text-[#f06464] hover:bg-[#2a1a1a] hover:text-[#f06464]">
                        Request Deletion of Account
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
