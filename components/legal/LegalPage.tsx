import Link from "next/link";

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
        <main className="min-h-screen bg-background text-foreground">
            <div className="mx-auto max-w-3xl px-6 py-16">
                <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
                    ← Back to LinkedLoom
                </Link>
                <h1 className="mt-6 text-4xl font-bold tracking-tight">{title}</h1>
                <p className="mt-2 text-sm text-muted-foreground">Last updated: {LEGAL_UPDATED}</p>
                <div className="mt-10 space-y-8 leading-relaxed [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 [&_a]:underline [&_a]:underline-offset-2">
                    {children}
                </div>
                <div className="mt-16 flex gap-6 border-t border-border pt-6 text-sm text-muted-foreground">
                    <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
                    <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
                </div>
            </div>
        </main>
    );
}
