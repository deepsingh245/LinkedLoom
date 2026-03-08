"use client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Loader2, Linkedin, Twitter, Mail } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

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

export default function PreferencesPage() {
    const [isSaving, setIsSaving] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)

    const handleConnectLinkedIn = async () => {
        try {
            setIsConnecting(true)
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/getLinkedInAuthUrl`);
            const data = await res.json();
            if (data.url) {
                 window.location.href = data.url;
            } else {
                 toast.error("Failed to initialize LinkedIn connection.");
            }
        } catch (error) {
            console.error(error);
            toast.error("LinkedIn Connection failed.");
        } finally {
            setIsConnecting(false)
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800))
        setIsSaving(false)
        toast("Preferences saved", {
            description: "Your application preferences have been updated.",
        })
    }

    return (
        <div className="space-y-6 pb-20">
             <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-display font-semibold tracking-tight text-[#f0f0f8] mb-1">Preferences</h1>
                    <p className="text-[#8888a0]">Customize your application experience and connections.</p>
                </div>
                <Button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="bg-gradient-to-br from-[#63d496] to-[#3db87a] text-[#0a1a10] hover:shadow-[0_8px_24px_rgba(99,212,150,0.35)]"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Preferences
                </Button>
            </div>

            {/* Application Settings (Appearance & Behavior) */}
            <Card className="bg-[#13131a] border-[#1e1e2a] rounded-2xl">
                <CardHeader className="p-6 pb-4">
                    <CardTitle className="text-base font-semibold text-[#f0f0f8]">Appearance</CardTitle>
                    <CardDescription className="text-[#8888a0]">Manage how the application looks to you.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-6">
                    <div className="flex items-center justify-between">
                         <div className="space-y-0.5">
                            <Label className="text-sm font-medium text-[#e0e0f0]">Theme</Label>
                            <p className="text-xs text-[#5a5a78]">Select your preferred color interface.</p>
                        </div>
                        <Select defaultValue="system">
                            <SelectTrigger className="w-[180px] bg-[#0e0e16] border-[#2a2a3a] text-[#f0f0f8] focus:ring-[#63d496] shadow-none">
                                <SelectValue placeholder="Select Theme" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a24] border-[#2a2a3a] text-[#f0f0f8]">
                                <SelectItem value="dark">Dark (Premium)</SelectItem>
                                <SelectItem value="light">Light</SelectItem>
                                <SelectItem value="system">System Preference</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-[#1e1e2a]">
                         <div className="space-y-0.5">
                            <Label className="text-sm font-medium text-[#e0e0f0]">Compact Mode</Label>
                            <p className="text-xs text-[#5a5a78]">Reduces padding and font sizes across the app.</p>
                        </div>
                        <CustomSwitch />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-[#1e1e2a]">
                         <div className="space-y-0.5">
                            <Label className="text-sm font-medium text-[#e0e0f0]">Animations</Label>
                            <p className="text-xs text-[#5a5a78]">Enable or disable UI animations and transitions.</p>
                        </div>
                        <CustomSwitch defaultChecked />
                    </div>
                </CardContent>
            </Card>

            {/* AI Generation Settings */}
            <Card className="bg-[#13131a] border-[#1e1e2a] rounded-2xl">
                <CardHeader className="p-6 pb-4">
                    <CardTitle className="text-base font-semibold text-[#f0f0f8]">AI Assistant Settings</CardTitle>
                    <CardDescription className="text-[#8888a0]">Configure defaults for the post generation AI.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-6">
                     <div className="flex items-center justify-between">
                         <div className="space-y-0.5">
                            <Label className="text-sm font-medium text-[#e0e0f0]">Default Tone</Label>
                            <p className="text-xs text-[#5a5a78]">The default writing style for generated content.</p>
                        </div>
                        <Select defaultValue="professional">
                            <SelectTrigger className="w-[180px] bg-[#0e0e16] border-[#2a2a3a] text-[#f0f0f8] focus:ring-[#63d496] shadow-none">
                                <SelectValue placeholder="Select Tone" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a24] border-[#2a2a3a] text-[#f0f0f8]">
                                <SelectItem value="professional">Professional</SelectItem>
                                <SelectItem value="casual">Casual</SelectItem>
                                <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                                <SelectItem value="informative">Informative</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                     <div className="flex items-center justify-between pt-4 border-t border-[#1e1e2a]">
                         <div className="space-y-0.5">
                            <Label className="text-sm font-medium text-[#e0e0f0]">Auto-Add Hashtags</Label>
                            <p className="text-xs text-[#5a5a78]">Automatically append relevant hashtags to posts.</p>
                        </div>
                        <CustomSwitch defaultChecked />
                    </div>
                     <div className="flex items-center justify-between pt-4 border-t border-[#1e1e2a]">
                         <div className="space-y-0.5">
                            <Label className="text-sm font-medium text-[#e0e0f0]">Include Emojis</Label>
                            <p className="text-xs text-[#5a5a78]">Sprinkle relevant emojis based on the post tone.</p>
                        </div>
                        <CustomSwitch defaultChecked />
                    </div>
                </CardContent>
            </Card>

            {/* Connected Accounts */}
             <Card className="bg-[#13131a] border-[#1e1e2a] rounded-2xl">
                <CardHeader className="p-6 pb-4">
                    <CardTitle className="text-base font-semibold text-[#f0f0f8]">Connected Accounts</CardTitle>
                    <CardDescription className="text-[#8888a0]">Manage social profiles connected to LinkedLoom.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                    {/* LinkedIn */}
                     <div className="flex items-center justify-between p-4 bg-[#0e0e16] border border-[#2a2a3a] rounded-xl group hover:border-[#3a3a4a] transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#0077b5]/10 rounded-lg border border-[#0077b5]/20 flex items-center justify-center">
                                <Linkedin className="w-5 h-5 text-[#0077b5]" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[#f0f0f8]">LinkedIn</p>
                                <p className="text-xs text-[#5a5a78]">Not connected</p>
                            </div>
                        </div>
                        <Button 
                            onClick={handleConnectLinkedIn} 
                            disabled={isConnecting}
                            variant="outline" 
                            size="sm" 
                            className="bg-[#1a1a24] border-[#2a2a3a] text-[#e0e0f0] hover:bg-[#2a2a3a] transition-colors"
                        >
                            {isConnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Connect
                        </Button>
                    </div>

                    {/* Twitter */}
                     <div className="flex items-center justify-between p-4 bg-[#0e0e16] border border-[#2a2a3a] rounded-xl group hover:border-[#3a3a4a] transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#1da1f2]/5 rounded-lg border border-[#1da1f2]/10 flex items-center justify-center">
                                <Twitter className="w-5 h-5 text-[#5a5a78]" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[#f0f0f8]">X (Twitter)</p>
                                <p className="text-xs text-[#5a5a78]">Not connected</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" className="bg-[#1a1a24] border-[#2a2a3a] text-[#e0e0f0] hover:bg-[#2a2a3a] transition-colors">
                            Connect
                        </Button>
                    </div>

                     {/* Substack/Newsletter */}
                     <div className="flex items-center justify-between p-4 bg-[#0e0e16] border border-[#2a2a3a] rounded-xl group hover:border-[#3a3a4a] transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#ff6719]/5 rounded-lg border border-[#ff6719]/10 flex items-center justify-center">
                                <Mail className="w-5 h-5 text-[#5a5a78]" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[#f0f0f8]">Newsletter API</p>
                                <p className="text-xs text-[#5a5a78]">Not connected</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" className="bg-[#1a1a24] border-[#2a2a3a] text-[#e0e0f0] hover:bg-[#2a2a3a] transition-colors">
                            Configure
                        </Button>
                    </div>
                </CardContent>
             </Card>
        </div>
    )
}
