"use client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Check, Camera, Trash } from "lucide-react"

export default function ProfileSettingsPage() {
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
                            SC
                        </div>
                        <button className="absolute bottom-0 right-0 w-8 h-8 bg-[#1a1a24] border border-[#2a2a3a] rounded-full flex items-center justify-center text-[#63d496] hover:bg-[#2a2a3a] transition-colors">
                            <Camera className="w-4 h-4" />
                        </button>
                    </div>
                    <div>
                        <h3 className="text-xl font-display font-semibold text-[#f0f0f8]">Sarah Chen</h3>
                        <p className="text-[#8888a0] text-sm mb-4">Product Manager at Vercel</p>
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
                    <Button size="sm" className="bg-gradient-to-br from-[#63d496] to-[#3db87a] text-[#0a1a10] hover:shadow-[0_8px_24px_rgba(99,212,150,0.35)]">
                        <Check className="w-4 h-4 mr-2" />
                        Save Changes
                    </Button>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[#8888a0] text-xs font-medium">Full Name</Label>
                            <Input defaultValue="Sarah Chen" className="bg-[#0e0e16] border-[#2a2a3a] focus:border-[#63d496] shadow-none" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[#8888a0] text-xs font-medium">Job Title</Label>
                            <Input defaultValue="Product Manager" className="bg-[#0e0e16] border-[#2a2a3a] focus:border-[#63d496] shadow-none" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[#8888a0] text-xs font-medium">Company</Label>
                            <Input defaultValue="Vercel" className="bg-[#0e0e16] border-[#2a2a3a] focus:border-[#63d496] shadow-none" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[#8888a0] text-xs font-medium">Location</Label>
                            <Input defaultValue="San Francisco, CA" className="bg-[#0e0e16] border-[#2a2a3a] focus:border-[#63d496] shadow-none" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[#8888a0] text-xs font-medium">Bio</Label>
                        <Textarea 
                            defaultValue="Building products that matter. Writing about leadership, product thinking, and what it means to ship fast without breaking things." 
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
                            <Label className="text-[#8888a0] text-xs font-medium">Email</Label>
                            <Input defaultValue="sarah.chen@vercel.com" type="email" className="bg-[#0e0e16] border-[#2a2a3a] focus:border-[#63d496] shadow-none" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[#8888a0] text-xs font-medium">Phone</Label>
                            <Input defaultValue="+1 (415) 555-0192" type="tel" className="bg-[#0e0e16] border-[#2a2a3a] focus:border-[#63d496] shadow-none" />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[#8888a0] text-xs font-medium">Website</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a5a78]">🔗</span>
                                <Input defaultValue="sarahchen.io" className="bg-[#0e0e16] border-[#2a2a3a] focus:border-[#63d496] shadow-none pl-9" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[#8888a0] text-xs font-medium">Twitter / X</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a5a78]">🐦</span>
                                <Input defaultValue="@sarahbuilds" className="bg-[#0e0e16] border-[#2a2a3a] focus:border-[#63d496] shadow-none pl-9" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[#8888a0] text-xs font-medium">LinkedIn URL</Label>
                         <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a5a78]">in</span>
                            <Input defaultValue="linkedin.com/in/sarahchen" className="bg-[#0e0e16] border-[#2a2a3a] focus:border-[#63d496] shadow-none pl-9" />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="p-6 pt-0 flex justify-end">
                     <Button size="sm" className="bg-gradient-to-br from-[#63d496] to-[#3db87a] text-[#0a1a10] hover:shadow-[0_8px_24px_rgba(99,212,150,0.35)]">
                        <Check className="w-4 h-4 mr-2" />
                        Save Changes
                    </Button>
                </CardFooter>
            </Card>

            <Card className="bg-[#13131a] border-[#1e1e2a] rounded-2xl">
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
            </Card>

            <Card className="bg-[#1a0e0e] border-[#3a1a1a] rounded-2xl">
                <CardHeader className="p-6 pb-2">
                    <CardTitle className="text-base font-semibold text-[#f06464] flex items-center">
                        ⚠️ Danger Zone
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-2">
                     <p className="text-[#8888a0] text-sm mb-4">Once you delete your account, all data is permanently removed. This cannot be undone.</p>
                     <Button variant="outline" size="sm" className="bg-transparent border-[#3a1a1a] text-[#f06464] hover:bg-[#2a1a1a] hover:text-[#f06464]">
                        Delete Account
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
