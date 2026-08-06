"use client";
import {
    Wand2,
    Calendar,
    BarChart3,
    Zap,
    LayoutTemplate,
    ShieldCheck
} from "lucide-react";

const features = [
    {
        icon: <Wand2 className="h-10 w-10 text-pink-500" />,
        title: "AI Post Generator",
        description: "Generate viral LinkedIn posts in seconds with advanced AI models tailored for professional content."
    },
    {
        icon: <Calendar className="h-10 w-10 text-blue-500" />,
        title: "Smart Scheduling",
        description: "Plan your content calendar with drag-and-drop ease. Auto-schedule for peak engagement times."
    },
    {
        icon: <BarChart3 className="h-10 w-10 text-green-500" />,
        title: "Deep Analytics",
        description: "Track what's working with detailed metrics on impressions, engagement, and follower growth."
    },
    {
        icon: <LayoutTemplate className="h-10 w-10 text-purple-500" />,
        title: "Templates Library",
        description: "Access proven hook templates and post structures used by top LinkedIn creators."
    },
    {
        icon: <Zap className="h-10 w-10 text-yellow-500" />,
        title: "Brand Voice",
        description: "Train the AI on your writing style so every post sounds authentically like you."
    },
    {
        icon: <ShieldCheck className="h-10 w-10 text-orange-500" />,
        title: "Safe & Secure",
        description: "We use official APIs and enterprise-grade security to keep your account safe."
    }
];

export function LandingFeatures() {
    return (
        <section id="features" className="py-24 bg-muted/30">
            <div className="container px-4">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                        Everything you need to grow
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Stop struggling with content creation. LinkedLoom gives you the tools to build your personal brand at scale.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, i) => (
                        <div key={i} className="group relative overflow-hidden rounded-2xl border bg-background p-8 hover:shadow-lg transition-all duration-300">
                            <div className="mb-4 inline-block rounded-lg bg-muted p-3 group-hover:bg-primary/10 transition-colors">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                            <p className="text-muted-foreground">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
