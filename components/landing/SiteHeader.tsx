"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "./nav-links";
import { Wordmark } from "./Wordmark";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-card px-4 py-2 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <header
        className={cn(
          "sticky top-0 z-40 border-b bg-background/90 backdrop-blur-sm transition-colors duration-200 supports-backdrop-filter:bg-background/75",
          scrolled ? "border-border" : "border-transparent"
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <Link href={Routes.HOME} aria-label="LinkedLoom home" className="inline-flex min-h-11 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Wordmark />
          </Link>

          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="rounded-lg px-3 py-2 text-[14px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <ModeToggle />
            </div>
            <Button asChild variant="ghost" className="hidden h-10 md:inline-flex">
              <Link href={Routes.LOGIN}>Log in</Link>
            </Button>
            <Button asChild className="hidden h-10 sm:inline-flex">
              <Link href={Routes.REGISTER}>Start free</Link>
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="size-11 md:hidden" aria-label="Open menu">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="brand-surface flex w-[85%] max-w-sm flex-col gap-6 bg-background">
                <SheetTitle className="text-left">
                  <Wordmark />
                </SheetTitle>
                <nav aria-label="Mobile">
                  <ul className="grid gap-1">
                    {NAV_LINKS.map((link) => (
                      <li key={link.href}>
                        <SheetClose asChild>
                          <a href={link.href} className="flex h-12 items-center rounded-xl px-3 text-[16px] font-medium hover:bg-muted">
                            {link.label}
                          </a>
                        </SheetClose>
                      </li>
                    ))}
                  </ul>
                </nav>
                <div className="mt-auto grid gap-3">
                  <Button asChild className="h-12 text-[15px]">
                    <Link href={Routes.REGISTER}>Start free</Link>
                  </Button>
                  <Button asChild variant="outline" className="h-12 text-[15px]">
                    <Link href={Routes.LOGIN}>Log in</Link>
                  </Button>
                  <div className="flex items-center justify-between pt-2 text-[14px] text-muted-foreground">
                    Theme
                    <ModeToggle />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
}
