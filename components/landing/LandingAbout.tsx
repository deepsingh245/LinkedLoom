export function LandingAbout() {
    return (
        <section id="about" className="py-24">
            <div className="container px-4">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-6 order-2 lg:order-1">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                            Built for creators, by creators
                        </h2>
                        <p className="text-lg text-muted-foreground">
                            We understand the struggle of maintaining a consistent LinkedIn presence while running a business.
                        </p>
                        <div className="space-y-4">
                            <p className="text-muted-foreground">
                                LinkedLoom was born out of frustration with complex, expensive enterprise tools. We wanted something fast, beautiful, and effective.
                            </p>
                            <p className="text-muted-foreground">
                                Our mission is to democratize professional branding, giving everyone the power to share their story and expertise with the world.
                            </p>
                        </div>
                    </div>
                    <div className="order-1 lg:order-2">
                        <div className="relative aspect-square rounded-2xl overflow-hidden border bg-muted flex items-center justify-center">
                            {/* Placeholder for About Image */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-primary/20" />
                            <div className="text-center p-8 z-10">
                                <h3 className="text-2xl font-bold mb-2">10k+</h3>
                                <p className="text-muted-foreground">Posts Generated</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
