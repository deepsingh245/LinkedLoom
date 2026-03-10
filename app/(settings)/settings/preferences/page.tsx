"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"

function CustomSwitch({ checked, defaultChecked }: { checked?: boolean, defaultChecked?: boolean }) {
    const [isOn, setIsOn] = useState(checked ?? defaultChecked ?? false);
    return (
        <button 
            type="button"
            role="switch"
            aria-checked={isOn}
            onClick={() => setIsOn(!isOn)}
            className={`w-11 h-6 rounded-full relative transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#63d496]/50 ${isOn ? 'bg-[#63d496]' : 'bg-[#2a2a3a]'}`}
        >
            <span className={`absolute top-1/2 -translate-y-1/2 left-1 w-4 h-4 bg-[#0a1a10] rounded-full transition-transform duration-200 ${isOn ? 'translate-x-5' : 'bg-[#8888a0]'}`} />
        </button>
    )
}

function SettingsRow({ title, description, control }: { title: string, description: string, control: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-4">
            <div className="space-y-0.5">
                <Label className="text-sm font-medium text-[#e0e0f0]">{title}</Label>
                <p className="text-[13px] text-[#5a5a78]">{description}</p>
            </div>
            {control}
        </div>
    )
}

export default function SettingsPage() {
    return (
        <div className="space-y-8 pb-20">
            <div>
                <h1 className="text-3xl font-display font-semibold tracking-tight text-[#f0f0f8] mb-1">Settings</h1>
                <p className="text-[15px] text-[#8888a0]">Customize your experience and preferences.</p>
            </div>

            {/* Appearance */}
            <Card className="bg-[#13131a] border-[#1e1e2a] rounded-2xl">
                <CardHeader className="p-6 pb-2">
                    <CardTitle className="text-base font-semibold text-[#f0f0f8]">Appearance</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-2 space-y-4">
                    <div className="grid grid-cols-2 gap-6 w-full">
                        <div className="space-y-2">
                            <Label className="text-[13px] text-[#5a5a78]">Theme</Label>
                            <Select defaultValue="dark">
                                <SelectTrigger className="w-full bg-[#0e0e16] border-[#2a2a3a] text-[#f0f0f8] focus:ring-[#63d496] shadow-none h-10 rounded-lg">
                                    <SelectValue placeholder="Theme" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a1a24] border-[#2a2a3a] text-[#f0f0f8]">
                                    <SelectItem value="dark">Dark</SelectItem>
                                    <SelectItem value="light">Light</SelectItem>
                                    <SelectItem value="system">System</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[13px] text-[#5a5a78]">Density</Label>
                            <Select defaultValue="comfortable">
                                <SelectTrigger className="w-full bg-[#0e0e16] border-[#2a2a3a] text-[#f0f0f8] focus:ring-[#63d496] shadow-none h-10 rounded-lg">
                                    <SelectValue placeholder="Density" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a1a24] border-[#2a2a3a] text-[#f0f0f8]">
                                    <SelectItem value="comfortable">Comfortable</SelectItem>
                                    <SelectItem value="compact">Compact</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="pt-2">
                         <div className="flex items-center justify-between py-4">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium text-[#e0e0f0]">Animations & Transitions</Label>
                                <p className="text-[13px] text-[#5a5a78]">Disable for reduced-motion experience</p>
                            </div>
                            <CustomSwitch defaultChecked />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="bg-[#13131a] border-[#1e1e2a] rounded-2xl">
                <CardHeader className="p-6 pb-2">
                    <CardTitle className="text-base font-semibold text-[#f0f0f8]">Notifications</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                    <SettingsRow 
                        title="Post Published" 
                        description="When your scheduled posts go live" 
                        control={<CustomSwitch defaultChecked />} 
                    />
                    <SettingsRow 
                        title="Weekly Digest" 
                        description="Performance summary every Monday" 
                        control={<CustomSwitch defaultChecked />} 
                    />
                    <SettingsRow 
                        title="AI Suggestions" 
                        description="New post ideas based on your best content" 
                        control={<CustomSwitch defaultChecked={false} />} 
                    />
                    <SettingsRow 
                        title="Comment Alerts" 
                        description="Notify when posts receive comments" 
                        control={<CustomSwitch defaultChecked />} 
                    />
                    <SettingsRow 
                        title="Milestone Alerts" 
                        description="When you hit follower or view milestones" 
                        control={<CustomSwitch defaultChecked />} 
                    />
                    <SettingsRow 
                        title="Product Updates" 
                        description="LinkedLoom new features and announcements" 
                        control={<CustomSwitch defaultChecked={false} />} 
                    />
                </CardContent>
            </Card>

            {/* AI Preferences */}
            <Card className="bg-[#13131a] border-[#1e1e2a] rounded-2xl">
                <CardHeader className="p-6 pb-2">
                    <CardTitle className="text-base font-semibold text-[#f0f0f8]">AI Preferences</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-2 space-y-4">
                    <div className="grid grid-cols-2 gap-6 w-full">
                        <div className="space-y-2">
                            <Label className="text-[13px] text-[#5a5a78]">Default Tone</Label>
                            <Select defaultValue="professional">
                                <SelectTrigger className="w-full bg-[#0e0e16] border-[#2a2a3a] text-[#f0f0f8] focus:ring-[#63d496] shadow-none h-10 rounded-lg">
                                    <SelectValue placeholder="Tone" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a1a24] border-[#2a2a3a] text-[#f0f0f8]">
                                    <SelectItem value="professional">Professional</SelectItem>
                                    <SelectItem value="casual">Casual</SelectItem>
                                    <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                                    <SelectItem value="informative">Informative</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[13px] text-[#5a5a78]">Content Language</Label>
                            <Select defaultValue="english">
                                <SelectTrigger className="w-full bg-[#0e0e16] border-[#2a2a3a] text-[#f0f0f8] focus:ring-[#63d496] shadow-none h-10 rounded-lg">
                                    <SelectValue placeholder="Language" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a1a24] border-[#2a2a3a] text-[#f0f0f8]">
                                    <SelectItem value="english">English</SelectItem>
                                    <SelectItem value="spanish">Spanish</SelectItem>
                                    <SelectItem value="french">French</SelectItem>
                                    <SelectItem value="german">German</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="pt-2">
                        <SettingsRow 
                            title="Auto-add Hashtags" 
                            description="Automatically append relevant hashtags" 
                            control={<CustomSwitch defaultChecked />} 
                        />
                        <SettingsRow 
                            title="Smart Suggestions" 
                            description="Show AI-powered topic ideas in your dashboard" 
                            control={<CustomSwitch defaultChecked />} 
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Privacy & Security */}
            <Card className="bg-[#13131a] border-[#1e1e2a] rounded-2xl">
                <CardHeader className="p-6 pb-2">
                    <CardTitle className="text-base font-semibold text-[#f0f0f8]">Privacy & Security</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                    <SettingsRow 
                        title="Public Profile" 
                        description="Allow others to view your LinkedLoom profile" 
                        control={<CustomSwitch defaultChecked />} 
                    />
                    <SettingsRow 
                        title="Analytics Sharing" 
                        description="Share anonymized data to improve AI quality" 
                        control={<CustomSwitch defaultChecked={false} />} 
                    />
                    <div className="flex items-center justify-between py-4">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-medium text-[#e0e0f0]">Two-Factor Authentication</Label>
                            <p className="text-[13px] text-[#5a5a78]">Add an extra layer of security</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1e1e2a] border border-[#2a2a3a]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#ffb800]"></span>
                                <span className="text-[11px] font-medium text-[#ffb800]">Disabled</span>
                            </div>
                            <CustomSwitch defaultChecked={false} />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
