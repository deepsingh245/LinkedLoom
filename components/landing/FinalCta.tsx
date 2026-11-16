import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Routes } from "@/lib/routes";
import { Reveal } from "./Reveal";

export function FinalCta() {
  return (
    <section aria-labelledby="cta-heading" className="border-t border-border">
      <Reveal className="mx-auto w-full max-w-[1200px] px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="flex flex-col gap-8 rounded-[20px] border border-border bg-teal-wash px-6 py-10 sm:px-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <h2 id="cta-heading" className="text-[26px] font-semibold leading-tight sm:text-[32px]">
              Start with one persona and a few sources.
            </h2>
            <p className="mt-3 text-[16px] leading-relaxed text-muted-foreground">
              You&apos;ll review the first drafts before anything goes out.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-12 px-6 text-[15px]">
              <Link href={Routes.REGISTER}>
                Start free
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 px-6 text-[15px]">
              <Link href={Routes.LOGIN}>Log in</Link>
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
