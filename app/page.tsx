"use client";
import Link from "next/link";
import { SmoothCursor } from "@/components/landing/SmoothCursor";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingAbout } from "@/components/landing/LandingAbout";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SmoothCursor />

      {/* Landing Header */}
      <header className="fixed top-0 w-full z-40 bg-background/80 backdrop-blur-md border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">L</div>
            LinkedLoom
          </Link>

          <nav className="hidden md:flex gap-6 text-sm font-medium">
            <Link href="#features" className="hover:text-primary transition-colors">Features</Link>
            <Link href="#about" className="hover:text-primary transition-colors">About</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <LandingHero />
        <LandingFeatures />
        <LandingAbout />
      </main>

      <LandingFooter />
    </div>
  );
}
