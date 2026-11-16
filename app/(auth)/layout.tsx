import Link from "next/link";
import { Check } from "lucide-react";
import { Wordmark } from "@/components/landing/Wordmark";
import { ApprovalCardMock } from "@/components/landing/mockups/ApprovalCardMock";
import { Routes } from "@/lib/routes";

const POINTS = [
  "Drafts arrive with the sources behind them",
  "Nothing is published until you approve it",
  "Pause or stop Autopilot at any time",
];

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="brand-surface min-h-dvh bg-background text-foreground lg:grid lg:grid-cols-2">
            <div className="flex min-h-dvh flex-col px-4 py-5 sm:px-8">
                <header>
                    <Link href={Routes.HOME} aria-label="LinkedLoom home" className="inline-flex min-h-11 items-center rounded-lg">
                        <Wordmark />
                    </Link>
                </header>
                <main className="flex flex-1 items-center justify-center py-10">
                    <div className="w-full max-w-[400px]">{children}</div>
                </main>
                <footer className="flex flex-wrap gap-x-4 text-[13px] text-muted-foreground">
                    <span className="flex min-h-11 items-center">© 2026 LinkedLoom</span>
                    <Link href="/privacy" className="flex min-h-11 items-center hover:text-foreground">Privacy</Link>
                    <Link href="/terms" className="flex min-h-11 items-center hover:text-foreground">Terms</Link>
                </footer>
            </div>

            <aside className="hidden border-l border-border bg-teal-wash lg:flex lg:flex-col lg:justify-center lg:px-14 xl:px-20">
                <div className="mx-auto w-full max-w-[460px]">
                    <p className="text-[13px] font-medium text-teal-ink">AI Autopilot · Early access</p>
                    <p className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.025em]">
                        Research and first drafts, handled. The final say stays with you.
                    </p>
                    <ApprovalCardMock compact className="mt-8" />
                    <ul className="mt-8 space-y-3">
                        {POINTS.map((point) => (
                            <li key={point} className="flex items-start gap-2.5 text-[15px]">
                                <Check className="mt-0.5 size-4 shrink-0 text-teal-ink" aria-hidden="true" />
                                {point}
                            </li>
                        ))}
                    </ul>
                </div>
            </aside>
        </div>
    );
}
