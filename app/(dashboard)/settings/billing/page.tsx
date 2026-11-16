"use client";

import Link from "next/link";
import {
    ArrowRight,
    CreditCard,
    FileText,
    Fingerprint,
    Mail,
    Settings2,
    ShieldCheck,
    UserRound,
    WalletCards,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Routes } from "@/lib/routes";

export default function BillingSettingsPage() {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return (
            <div className="mx-auto w-full max-w-[1120px] space-y-6" aria-busy="true">
                <div className="h-8 w-56 animate-pulse rounded-lg bg-[#e9edef]" />
                <div className="h-36 animate-pulse rounded-2xl bg-[#e9edef]" />
                <div className="h-52 animate-pulse rounded-2xl bg-[#e9edef]" />
            </div>
        );
    }

    const displayName = profile?.displayName || user?.displayName || "Your account";
    const email = profile?.email || user?.email || "No email on file";

    return (
        <div className="mx-auto w-full max-w-[1120px] space-y-7 pb-6">
            <header>
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-[#77838a]">
                    <Settings2 className="h-3.5 w-3.5" /> Workspace settings
                </div>
                <h1 className="text-[26px] font-semibold tracking-[-0.04em] text-[#20242b] sm:text-[30px]">Settings &amp; Billing</h1>
                <p className="mt-2 max-w-[620px] text-sm leading-6 text-[#68737b]">
                    Manage your account and preferences. Billing tools will appear here when subscriptions are available.
                </p>
            </header>

            <section aria-labelledby="account-title" className="space-y-3">
                <div>
                    <h2 id="account-title" className="text-base font-semibold text-[#242a30]">Account</h2>
                    <p className="mt-1 text-xs text-[#7b858c]">Your LinkedLoom sign-in details.</p>
                </div>
                <Card className="overflow-hidden rounded-2xl border-[#e2e6ea] bg-white shadow-[0_2px_12px_rgba(32,36,43,0.035)]">
                    <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                        <div className="flex min-w-0 items-center gap-4">
                            {profile?.photoURL ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={profile.photoURL} alt="" className="h-12 w-12 rounded-full object-cover" />
                            ) : (
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e8f3f0] text-sm font-semibold text-[#357d72]">
                                    {displayName.slice(0, 1).toUpperCase()}
                                </div>
                            )}
                            <div className="min-w-0">
                                <h3 className="truncate text-sm font-semibold text-[#20242b]">{displayName}</h3>
                                <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-[#758087]">
                                    <Mail className="h-3.5 w-3.5 shrink-0" /> {email}
                                </p>
                            </div>
                        </div>
                        <Link href={Routes.SETTINGS_PROFILE} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#dfe5e7] bg-white px-3 text-xs font-semibold text-[#46525a] transition hover:bg-[#f7f9f9]">
                            Edit profile <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </CardContent>
                </Card>
            </section>

            <section aria-labelledby="billing-title" className="space-y-3">
                <div>
                    <h2 id="billing-title" className="text-base font-semibold text-[#242a30]">Plan &amp; billing</h2>
                    <p className="mt-1 text-xs text-[#7b858c]">Subscription and payment information for your workspace.</p>
                </div>
                <Card className="overflow-hidden rounded-2xl border-[#dce8e4] bg-white shadow-[0_2px_12px_rgba(32,36,43,0.035)]">
                    <CardContent className="grid gap-0 md:grid-cols-[1fr_280px]">
                        <div className="p-5 sm:p-6">
                            <div className="flex items-start gap-3.5">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f3f0] text-[#357d72]">
                                    <WalletCards className="h-[18px] w-[18px]" />
                                </div>
                                <div>
                                    <span className="inline-flex rounded-full bg-[#f1f3f4] px-2.5 py-1 text-[10px] font-semibold text-[#77838a]">Billing not set up</span>
                                    <h3 className="mt-3 text-sm font-semibold text-[#20242b]">Subscription billing is not available yet</h3>
                                    <p className="mt-1.5 max-w-[560px] text-xs leading-5 text-[#758087]">
                                        There is no payment method or invoice history for this account. We’ll show your plan details here when subscription billing is enabled.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col justify-center gap-3 border-t border-[#edf0f2] bg-[#fafbfb] p-5 md:border-l md:border-t-0 sm:p-6">
                            <InfoLine icon={<CreditCard className="h-4 w-4" />} label="Payment method" value="None on file" />
                            <InfoLine icon={<FileText className="h-4 w-4" />} label="Invoices" value="No invoices yet" />
                        </div>
                    </CardContent>
                </Card>
            </section>

            <section aria-labelledby="settings-shortcuts-title" className="space-y-3">
                <div>
                    <h2 id="settings-shortcuts-title" className="text-base font-semibold text-[#242a30]">More settings</h2>
                    <p className="mt-1 text-xs text-[#7b858c]">Update your workspace experience and connected accounts.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                    <SettingsShortcut href={Routes.SETTINGS_PROFILE} icon={<UserRound className="h-[18px] w-[18px]" />} title="Profile" description="Personal details and public profile" />
                    <SettingsShortcut href={Routes.SETTINGS_PREFERENCES} icon={<Fingerprint className="h-[18px] w-[18px]" />} title="Preferences" description="Appearance and AI preferences" />
                    <SettingsShortcut href={Routes.SETTINGS_CONNECTIONS} icon={<ShieldCheck className="h-[18px] w-[18px]" />} title="Connections" description="Publishing accounts and integrations" />
                </div>
            </section>
        </div>
    );
}

function InfoLine({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center gap-2.5">
            <span className="text-[#879198]">{icon}</span>
            <span className="flex-1 text-[11px] text-[#758087]">{label}</span>
            <span className="text-[11px] font-medium text-[#4c585f]">{value}</span>
        </div>
    );
}

function SettingsShortcut({ href, icon, title, description }: { href: string; icon: React.ReactNode; title: string; description: string }) {
    return (
        <Link href={href} className="group rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#357d72] focus-visible:ring-offset-2">
            <Card className="h-full rounded-2xl border-[#e2e6ea] bg-white shadow-[0_2px_12px_rgba(32,36,43,0.035)] transition group-hover:border-[#cbdcd6] group-hover:shadow-[0_5px_18px_rgba(32,36,43,0.07)]">
                <CardContent className="flex items-start gap-3 p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e8f3f0] text-[#357d72]">{icon}</span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-[#30383e]">{title}</span>
                        <span className="mt-1 block text-[10px] leading-4 text-[#7b858c]">{description}</span>
                    </span>
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9aa3a8] transition group-hover:translate-x-0.5 group-hover:text-[#357d72]" />
                </CardContent>
            </Card>
        </Link>
    );
}
