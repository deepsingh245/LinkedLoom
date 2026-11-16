import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Routes } from "@/lib/routes";
import { ApprovalCardMock } from "./mockups/ApprovalCardMock";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-12 px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-12 lg:gap-10 lg:px-8 lg:pb-28 lg:pt-24">
        <div className="lg:col-span-6">
          <p className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1 text-[13px] font-medium">
            <span className="size-1.5 rounded-full bg-teal-ink" aria-hidden="true" />
            Autopilot
            <span className="text-muted-foreground">· Early access</span>
          </p>

          <h1 className="mt-6 text-[40px] font-semibold leading-[1.05] sm:text-[52px] lg:text-[58px]">
            LinkedIn posts that start with research, not a blank page.
          </h1>

          <p className="mt-6 max-w-[34rem] text-[17px] leading-relaxed text-muted-foreground sm:text-[18px]">
            LinkedLoom follows the sources you choose, drafts posts in your voice with the links behind every
            claim, and queues them on your calendar. Nothing is published until you approve it.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-12 px-6 text-[15px]">
              <Link href={Routes.REGISTER}>
                Start free
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 px-6 text-[15px]">
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[12.5px] text-muted-foreground">
            <li>LinkedIn only</li>
            <li aria-hidden="true">·</li>
            <li>Approval on by default</li>
            <li aria-hidden="true">·</li>
            <li>Pause any time</li>
          </ul>
        </div>

        <div className="lg:col-span-6 lg:pl-6">
          <ApprovalCardMock className="mx-auto max-w-[540px]" />
        </div>
      </div>
    </section>
  );
}
