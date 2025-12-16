import Link from "next/link";
import { Github, Twitter, Linkedin } from "lucide-react";

export function LandingFooter() {
    return (
        <footer className="border-t bg-muted/20">
            <div className="container px-4 py-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="col-span-2 md:col-span-1">
                        <Link href="/" className="text-xl font-bold flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">L</div>
                            LinkedLoom
                        </Link>
                        <p className="mt-4 text-sm text-muted-foreground">
                            Supercharge your LinkedIn growth with AI-powered content creation and analytics.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Product</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#features" className="hover:text-primary">Features</Link></li>
                            <li><Link href="/pricing" className="hover:text-primary">Pricing</Link></li>
                            <li><Link href="/blog" className="hover:text-primary">Blog</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Company</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#about" className="hover:text-primary">About</Link></li>
                            <li><Link href="/careers" className="hover:text-primary">Careers</Link></li>
                            <li><Link href="/contact" className="hover:text-primary">Contact</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Legal</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/privacy" className="hover:text-primary">Privacy</Link></li>
                            <li><Link href="/terms" className="hover:text-primary">Terms</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-muted-foreground">
                        © 2024 LinkedLoom. All rights reserved.
                    </p>
                    <div className="flex gap-4">
                        <Link href="#" className="text-muted-foreground hover:text-primary">
                            <Twitter className="h-5 w-5" />
                        </Link>
                        <Link href="#" className="text-muted-foreground hover:text-primary">
                            <Github className="h-5 w-5" />
                        </Link>
                        <Link href="#" className="text-muted-foreground hover:text-primary">
                            <Linkedin className="h-5 w-5" />
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
