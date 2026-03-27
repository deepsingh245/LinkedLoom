"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, CreditCard, Download } from "lucide-react"

import { useAuth } from "@/components/auth-provider"

export default function BillingSettingsPage() {
    const { user, profile, loading } = useAuth();
    
    const displayName = profile?.displayName || user?.displayName || "User";

    if (loading) {
        return <div className="p-8 text-[#8888a0]">Loading billing details...</div>
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-display font-semibold tracking-tight text-[#f0f0f8] mb-1">Account Settings</h1>
                <p className="text-[#8888a0]">Manage your profile, subscription, and preferences.</p>
            </div>

            <Card className="bg-[#13131a] border-[#1e1e2a] rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between p-6 pb-4">
                    <CardTitle className="text-base font-semibold text-[#f0f0f8]">Current Usage</CardTitle>
                    <span className="text-xs text-[#5a5a78] bg-[#1a1a24] px-3 py-1 rounded-full border border-[#2a2a3a]">Resets Apr 1, 2026</span>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                    <div className="grid grid-cols-3 gap-6">
                        <div className="space-y-2">
                             <div className="flex justify-between text-sm">
                                <span className="text-[#8888a0]">AI Posts Generated</span>
                                <span className="text-[#f0f0f8] font-medium"><span className="text-[#63d496]">38</span> / ∞</span>
                             </div>
                             <div className="h-1.5 w-full bg-[#1a1a24] rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-[#63d496] to-[#3db87a] w-[40%] rounded-full"></div>
                             </div>
                        </div>
                        <div className="space-y-2">
                             <div className="flex justify-between text-sm">
                                <span className="text-[#8888a0]">Scheduled Posts</span>
                                <span className="text-[#f0f0f8] font-medium">4 / 20</span>
                             </div>
                             <div className="h-1.5 w-full bg-[#1a1a24] rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-[#6490d4] to-[#4d78c0] w-[20%] rounded-full"></div>
                             </div>
                        </div>
                        <div className="space-y-2">
                             <div className="flex justify-between text-sm">
                                <span className="text-[#8888a0]">Connected Accounts</span>
                                <span className="text-[#f0f0f8] font-medium"><span className="text-[#c890f0]">2</span> / 3</span>
                             </div>
                             <div className="h-1.5 w-full bg-[#1a1a24] rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-[#c890f0] to-[#b070d8] w-[66%] rounded-full"></div>
                             </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                 <h2 className="text-base font-semibold text-[#f0f0f8] px-1">Choose Your Plan</h2>
                 <div className="grid grid-cols-3 gap-6">
                    {/* Free Plan */}
                    <Card className="bg-[#13131a] border-[#1e1e2a] hover:border-[#2a2a3a] transition-all rounded-2xl flex flex-col">
                        <CardHeader className="p-6 pb-4">
                            <CardTitle className="text-xs font-bold text-[#8888a0] tracking-wider uppercase mb-2">Free</CardTitle>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-display font-bold text-[#f0f0f8]">$0</span>
                                <span className="text-sm text-[#5a5a78]">/mo</span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 pt-0 flex-1 flex flex-col">
                            <ul className="space-y-3 text-sm text-[#8888a0] mb-8 flex-1">
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#5a5a78]" /> 5 AI posts/month</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#5a5a78]" /> Basic analytics</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#5a5a78]" /> 20 posts library</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#5a5a78]" /> 1 account</li>
                            </ul>
                            <Button variant="outline" className="w-full bg-[#63d496]/10 text-[#63d496] border-transparent hover:bg-[#63d496]/20">Downgrade</Button>
                        </CardContent>
                    </Card>

                    {/* Pro Plan */}
                    <Card className="bg-[#1a2e22]/20 border-[#63d496]/50 shadow-[0_0_30px_rgba(99,212,150,0.05)] rounded-2xl flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#63d496] to-[#3db87a]"></div>
                        <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-xs font-bold text-[#63d496] tracking-wider uppercase mb-2">Pro</CardTitle>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-display font-bold text-[#f0f0f8]">$19</span>
                                    <span className="text-sm text-[#5a5a78]">/mo</span>
                                </div>
                            </div>
                            <Badge className="bg-[#63d496] text-[#0a1a10] hover:bg-[#63d496] border-none font-semibold shadow-[0_4px_12px_rgba(99,212,150,0.3)]">Current</Badge>
                        </CardHeader>
                        <CardContent className="p-6 pt-0 flex-1 flex flex-col">
                            <ul className="space-y-3 text-sm text-[#e0e0f0] mb-8 flex-1">
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#63d496]" /> Unlimited AI posts</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#63d496]" /> Advanced analytics</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#63d496]" /> Unlimited library</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#63d496]" /> 3 accounts</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#63d496]" /> Scheduling</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#63d496]" /> Priority support</li>
                            </ul>
                            <div className="w-full py-2.5 text-center text-sm font-medium text-[#63d496] flex items-center justify-center gap-2 bg-[#1a2e22]/50 rounded-xl border border-[#2a4a36]">
                                <Check className="w-4 h-4" /> Active Plan
                            </div>
                        </CardContent>
                    </Card>

                    {/* Team Plan */}
                    <Card className="bg-[#13131a] border-[#1e1e2a] hover:border-[#2a2a3a] transition-all rounded-2xl flex flex-col relative overflow-hidden">
                         <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between">
                             <div>
                                <CardTitle className="text-xs font-bold text-[#6490d4] tracking-wider uppercase mb-2">Team</CardTitle>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-display font-bold text-[#f0f0f8]">$49</span>
                                    <span className="text-sm text-[#5a5a78]">/mo</span>
                                </div>
                            </div>
                             <Badge className="bg-[#1a2840] text-[#6490d4] hover:bg-[#1a2840] border-[#2a3a5a] font-semibold">Popular</Badge>
                        </CardHeader>
                         <CardContent className="p-6 pt-0 flex-1 flex flex-col">
                            <ul className="space-y-3 text-sm text-[#8888a0] mb-8 flex-1">
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#6490d4]" /> Everything in Pro</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#6490d4]" /> 5 team members</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#6490d4]" /> Shared library</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#6490d4]" /> 10 accounts</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#6490d4]" /> Brand voice</li>
                                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#6490d4]" /> Account manager</li>
                            </ul>
                            <Button className="w-full bg-gradient-to-r from-[#6490d4] to-[#4d78c0] text-white hover:opacity-90 border-none shadow-[0_8px_24px_rgba(100,144,212,0.3)]">Upgrade</Button>
                        </CardContent>
                    </Card>
                 </div>
            </div>

            <Card className="bg-[#13131a] border-[#1e1e2a] rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between p-6 pb-4">
                    <CardTitle className="text-base font-semibold text-[#f0f0f8]">Payment Method</CardTitle>
                    <Button variant="outline" size="sm" className="bg-[#1a1a24] border-[#2a2a3a] hover:bg-[#2a2a3a] text-[#c0c0d8]">
                        + Update Card
                    </Button>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                    <div className="flex items-center justify-between p-4 bg-[#0e0e16] border border-[#2a2a3a] rounded-xl">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-8 bg-[#1a1a24] rounded border border-[#2a2a3a] flex items-center justify-center">
                                <CreditCard className="w-5 h-5 text-[#6490d4]" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[#f0f0f8]">Visa ending in 4242</p>
                                <p className="text-xs text-[#5a5a78]">Expires 09/27 • {displayName}</p>
                            </div>
                        </div>
                        <Badge className="bg-[#0d2318] text-[#63d496] border-[#1a4030] hover:bg-[#0d2318] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#63d496]"></span> Active
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-[#13131a] border-[#1e1e2a] rounded-2xl">
                <CardHeader className="p-6 pb-4">
                    <CardTitle className="text-base font-semibold text-[#f0f0f8]">Billing History</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                    <div className="space-y-0 text-sm">
                        {[
                            { id: "INV-2026-03", date: "Mar 1, 2026", amount: "$19.00", status: "Paid" },
                            { id: "INV-2026-02", date: "Feb 1, 2026", amount: "$19.00", status: "Paid" },
                            { id: "INV-2026-01", date: "Jan 1, 2026", amount: "$19.00", status: "Paid" },
                            { id: "INV-2025-12", date: "Dec 1, 2025", amount: "$19.00", status: "Paid" },
                        ].map((invoice, i) => (
                            <div key={invoice.id} className={`flex items-center justify-between py-4 ${i !== 3 ? 'border-b border-[#1e1e2a]' : ''}`}>
                                <div>
                                    <p className="font-medium text-[#e0e0f0]">{invoice.id}</p>
                                    <p className="text-xs text-[#5a5a78] mt-0.5">{invoice.date}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-display font-semibold text-[#f0f0f8]">{invoice.amount}</span>
                                    <Badge className="bg-[#0d2318] text-[#63d496] border-[#1a4030] hover:bg-[#0d2318]">{invoice.status}</Badge>
                                    <Button variant="ghost" size="sm" className="text-[#8888a0] hover:text-[#e0e0f0] hover:bg-[#1a1a24] h-8 px-2">
                                        <Download className="w-3.5 h-3.5 mr-1.5" /> PDF
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

        </div>
    )
}
