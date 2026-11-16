import { SiteHeader } from "@/components/landing/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";

export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@your-domain.com";
export const LEGAL_UPDATED = "October 12, 2026";

export function LegalPage({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="brand-surface flex min-h-screen flex-col bg-background text-foreground">
            <SiteHeader />
            <main id="main" className="flex-1">
                <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
                    <h1 className="text-[34px] font-semibold leading-tight sm:text-[40px]">{title}</h1>
                    <p className="mt-2 font-mono text-[13px] text-muted-foreground">Last updated: {LEGAL_UPDATED}</p>
                    <div className="mt-10 space-y-8 text-[16px] leading-relaxed [&_h2]:mb-3 [&_h2]:text-[22px] [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 [&_a]:text-teal-ink [&_a]:underline [&_a]:underline-offset-2">
                        {children}
                    </div>
                </div>
            </main>
            <SiteFooter />
        </div>
    );
}
