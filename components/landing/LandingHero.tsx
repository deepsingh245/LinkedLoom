"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useRef } from "react";

export function LandingHero() {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"],
    });

    const yText = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
    const yImage = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

    return (
        <div ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background pt-20">

            {/* Background Gradient Blob */}
            <div className="absolute top-[-10%] right-[-5%] h-[500px] w-[500px] rounded-full bg-primary/10 blur-[100px]" />
            <div className="absolute bottom-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-blue-500/10 blur-[120px]" />

            <div className="container px-4">
                <div className="grid lg:grid-cols-2 gap-12 items-center">

                    <motion.div style={{ y: yText, opacity }} className="space-y-8">
                        <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium">
                            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                            v1.0 is now live
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
                            Master your <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
                                LinkedIn Growth
                            </span>
                        </h1>

                        <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
                            Create, schedule, and analyze your LinkedIn content with AI-powered tools designed for founders and creators.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link href="/login">
                                <Button size="lg" className="rounded-full px-8 h-12 text-base">
                                    Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                            <Link href="#features">
                                <Button variant="outline" size="lg" className="rounded-full px-8 h-12 text-base">
                                    View Features
                                </Button>
                            </Link>
                        </div>

                        <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" /> No credit card required
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" /> AI-powered
                            </div>
                        </div>
                    </motion.div>

                    <motion.div style={{ y: yImage }} className="relative z-10 hidden lg:block">
                        {/* TODO: Add actual screenshot later */}
                        <div className="relative rounded-xl border bg-background/50 backdrop-blur-md shadow-2xl p-2">
                            <div className="rounded-lg overflow-hidden border bg-card aspect-[4/3] flex items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-800">
                                <div className="text-center p-8">
                                    <p className="text-muted-foreground mb-4">Dashboard Preview</p>
                                    {/* Placeholder for now, can replace with Image */}
                                    <div className="mx-auto w-32 h-32 bg-primary/20 rounded-full flex items-center justify-center animate-pulse">
                                        <span className="text-4xl">✨</span>
                                    </div>
                                </div>
                            </div>

                            {/* Floating Card 1 */}
                            <motion.div
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="absolute -left-12 top-20 bg-background border rounded-lg p-4 shadow-xl max-w-[200px]"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600">AI</div>
                                    <div className="text-sm font-semibold">Viral Post</div>
                                </div>
                                <div className="h-2 w-full bg-muted rounded mb-1"></div>
                                <div className="h-2 w-2/3 bg-muted rounded"></div>
                            </motion.div>

                            {/* Floating Card 2 */}
                            <motion.div
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.8 }}
                                className="absolute -right-8 bottom-20 bg-background border rounded-lg p-4 shadow-xl"
                            >
                                <div className="text-sm font-medium mb-1">Engagement Rate</div>
                                <div className="text-2xl font-bold text-green-500">+124% 📈</div>
                            </motion.div>
                        </div>
                    </motion.div>

                </div>
            </div>
        </div>
    );
}
