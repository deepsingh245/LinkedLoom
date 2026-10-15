"use client";

import { useState } from "react";
import {
    ArrowUpRight,
    Check,
    CircleHelp,
    Clock3,
    Linkedin,
    Loader2,
    LockKeyhole,
    Plus,
    ShieldCheck,
    Unplug,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { dangerToast } from "@/lib/toast";

export default function ConnectionsPage() {
    const { profile } = useAuth();
    const [connecting, setConnecting] = useState(false);
    const connected = Boolean(profile?.linkedin);

    const connectLinkedIn = async () => {
        setConnecting(true);
        try {
            const { url } = await api.firebaseService.getLinkedInAuthUrl();
            if (!url) throw new Error("LinkedIn did not return an authorization URL.");
            window.location.assign(url);
        } catch (error) {
            console.error("LinkedIn connection could not be started:", error);
            dangerToast("LinkedIn connection could not be started. Please try again.");
            setConnecting(false);
        }
    };

    return (
        <div className="mx-auto w-full max-w-[1120px] space-y-7 pb-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-[#77838a]">
                        <Unplug className="h-3.5 w-3.5" /> Workspace settings
                    </div>
                    <h1 className="text-[26px] font-semibold tracking-[-0.04em] text-[#20242b] sm:text-[30px]">Connections &amp; Integrations</h1>
                    <p className="mt-2 max-w-[620px] text-sm leading-6 text-[#68737b]">
                        Connect the accounts you publish to and keep track of the services available to your workspace.
                    </p>
                </div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#e1e8e5] bg-white px-3 py-2 text-[11px] font-medium text-[#59666d] shadow-sm">
                    <ShieldCheck className="h-4 w-4 text-[#357d72]" /> Your account connections are private
                </div>
            </header>

            <section aria-labelledby="social-accounts-title" className="space-y-3">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <h2 id="social-accounts-title" className="text-base font-semibold text-[#242a30]">Social accounts</h2>
                        <p className="mt-1 text-xs text-[#7b858c]">Manage the publishing accounts linked to your profile.</p>
                    </div>
                    <span className="rounded-full bg-[#e8f3f0] px-2.5 py-1 text-[10px] font-semibold text-[#357d72]">
                        {connected ? "1 connected" : "No accounts connected"}
                    </span>
                </div>

                <Card className="overflow-hidden rounded-2xl border-[#e2e6ea] bg-white shadow-[0_2px_12px_rgba(32,36,43,0.035)]">
                    <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                        <div className="flex min-w-0 items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#eaf3fb] text-[#0a66c2]">
                                <Linkedin className="h-6 w-6" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-sm font-semibold text-[#20242b]">LinkedIn</h3>
                                    {connected ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f3f0] px-2 py-0.5 text-[10px] font-semibold text-[#357d72]">
                                            <Check className="h-3 w-3" /> Connected
                                        </span>
                                    ) : (
                                        <span className="rounded-full bg-[#f2f4f5] px-2 py-0.5 text-[10px] font-medium text-[#758087]">Not connected</span>
                                    )}
                                </div>
                                <p className="mt-1 text-xs leading-5 text-[#758087]">
                                    Publish posts and view performance from your professional profile.
                                </p>
                                {connected && <p className="mt-2 truncate text-xs font-medium text-[#46525a]">{profile?.linkedin}</p>}
                            </div>
                        </div>
                        <Button
                            onClick={connectLinkedIn}
                            disabled={connecting}
                            variant={connected ? "outline" : "default"}
                            className={connected
                                ? "h-9 shrink-0 border-[#dfe5e7] bg-white px-3 text-xs text-[#46525a] hover:bg-[#f7f9f9]"
                                : "h-9 shrink-0 rounded-lg bg-[#357d72] px-4 text-xs text-white hover:bg-[#286c63]"}
                        >
                            {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : connected ? <ArrowUpRight className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                            {connecting ? "Connecting…" : connected ? "Reconnect account" : "Connect LinkedIn"}
                        </Button>
                    </CardContent>
                </Card>

                <div className="grid gap-3 sm:grid-cols-2">
                    <UnavailableProvider name="X" description="Social publishing integration" />
                    <UnavailableProvider name="More platforms" description="Additional publishing channels" />
                </div>
            </section>

            <section aria-labelledby="workspace-integrations-title" className="space-y-3">
                <div>
                    <h2 id="workspace-integrations-title" className="text-base font-semibold text-[#242a30]">Workspace integrations</h2>
                    <p className="mt-1 text-xs text-[#7b858c]">Tools that support your content workflow.</p>
                </div>
                <Card className="rounded-2xl border-[#e2e6ea] bg-white shadow-[0_2px_12px_rgba(32,36,43,0.035)]">
                    <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f2f4f5] text-[#748087]">
                                <LockKeyhole className="h-[18px] w-[18px]" />
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-sm font-semibold text-[#20242b]">API access</h3>
                                    <span className="rounded-full bg-[#f2f4f5] px-2 py-0.5 text-[10px] font-medium text-[#758087]">Not available</span>
                                </div>
                                <p className="mt-1 text-xs leading-5 text-[#758087]">Developer access for custom tools and workflow automation.</p>
                            </div>
                        </div>
                        <span className="inline-flex items-center gap-1.5 self-start rounded-lg border border-[#e7eaec] px-3 py-2 text-[11px] font-medium text-[#849097] sm:self-auto">
                            <Clock3 className="h-3.5 w-3.5" /> Coming later
                        </span>
                    </CardContent>
                </Card>
            </section>

            <div className="flex items-start gap-2.5 rounded-xl border border-[#e5e9eb] bg-white/70 px-4 py-3.5 text-xs leading-5 text-[#77838a]">
                <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-[#7c898f]" />
                <p>When you connect an account, LinkedLoom uses its authorization flow to access only the capabilities needed for publishing and analytics.</p>
            </div>
        </div>
    );
}

function UnavailableProvider({ name, description }: { name: string; description: string }) {
    return (
        <Card className="rounded-2xl border-[#e6e9eb] bg-white/70 shadow-none">
            <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f2f4f5] text-[#8b969c]">
                        <Unplug className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-xs font-semibold text-[#505b62]">{name}</h3>
                        <p className="mt-0.5 truncate text-[10px] text-[#8a949a]">{description}</p>
                    </div>
                </div>
                <span className="shrink-0 rounded-full bg-[#f1f3f4] px-2 py-1 text-[9px] font-medium text-[#869198]">Coming later</span>
            </CardContent>
        </Card>
    );
}
