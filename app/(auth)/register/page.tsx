"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { Routes } from "@/lib/routes"
import { LinkedinIcon } from "lucide-react"
import { dangerToast } from "@/lib/toast"

export default function RegisterPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [name, setName] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            await api.firebaseService.registerWithEmailAndPassword(email, password, name)
            router.push(Routes.LOGIN)
        } catch (err: any) {
            setError(err.response?.data?.message || "Registration failed")
        } finally {
            setLoading(false)
        }
    }

    const loginWithGoogle = async () => {
        try {
            setLoading(true)
            await api.firebaseService.loginWithGoogle();
            router.push(Routes.DASHBOARD);
        } catch (error) {
            console.error(error)
            dangerToast("Google Login failed")
        } finally {
            setLoading(false)
        }
    }

    const loginWithLinkedin = async () => {
        try {
            setLoading(true)
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/getLinkedInAuthUrl`)
            const data = await res.json()
            if (data.url) {
                window.location.href = data.url
            } else {
                dangerToast("Failed to initialize LinkedIn login.")
            }
        } catch (error) {
            console.error(error)
            dangerToast("LinkedIn Login failed")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="relative flex items-center justify-center min-h-screen bg-[#080808] overflow-hidden p-4">
            {/* Animated Background Blobs */}
            <div className="absolute top-[-15%] right-[-20%] w-[85%] h-[85%] bg-[#63d496]/20 rounded-full blur-[140px] animate-blob" />
            <div className="absolute bottom-[-20%] left-[-15%] w-[80%] h-[80%] bg-[#6490d4]/20 rounded-full blur-[140px] animate-blob" style={{ animationDelay: '2.4s' }} />
            <div className="absolute top-[20%] left-[-20%] w-[70%] h-[70%] bg-[#c890f0]/20 rounded-full blur-[140px] animate-blob" style={{ animationDelay: '4.8s' }} />
            <div className="absolute bottom-[20%] right-[-10%] w-[60%] h-[60%] bg-[#63d496]/15 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '7.2s' }} />
            
            {/* Subtle Grid / Noise Pattern */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-25 brightness-50 contrast-150 pointer-events-none mix-blend-overlay" />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#080808] via-transparent to-[#080808] opacity-70 pointer-events-none" />

            <Card className="w-full max-w-md shadow-2xl border-[#1e1e2a] bg-[#13131a]/80 backdrop-blur-xl fade-up relative z-10">
                <CardHeader className="space-y-1.5 pb-6">
                    <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 bg-gradient-to-br from-[#63d496] to-[#3db87a] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(99,212,150,0.3)]">
                            <span className="text-[#0a1a10] font-bold text-xl">L</span>
                        </div>
                    </div>
                    <CardTitle className="text-[28px] font-display font-semibold tracking-tight text-center text-[#f0f0f8]">Create Account</CardTitle>
                    <CardDescription className="text-center text-[#8888a0] text-sm">
                        Enter your details to get started with LinkedLoom
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                         <Button 
                            variant="outline" 
                            type="button" 
                            onClick={loginWithGoogle} 
                            disabled={loading}
                            className="bg-[#1a1a24] border-[#2a2a3a] hover:bg-[#222230] hover:border-[#63d496]/50 text-[#e0e0f0] transition-all duration-200"
                        >
                            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google
                        </Button>
                        <Button 
                            variant="outline" 
                            type="button" 
                            onClick={loginWithLinkedin} 
                            disabled={loading}
                            className="bg-[#1a1a24] border-[#2a2a3a] hover:bg-[#222230] hover:border-[#6490d4]/50 text-[#e0e0f0] transition-all duration-200"
                        >
                            <LinkedinIcon className="mr-2 h-4 w-4 text-[#6490d4]" />
                            Linkedin
                        </Button>
                    </div>
                    
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-[#1e1e2a]" />
                        </div>
                        <div className="relative flex justify-center text-[11px] uppercase tracking-widest">
                            <span className="bg-[#13131a] px-3 text-[#5a5a78]">
                                Or continue with
                            </span>
                        </div>
                    </div>
                    
                    <form onSubmit={handleRegister} className="space-y-4">
                        {error && (
                            <div className="p-3 text-sm text-[#f06464] bg-[#f06464]/10 rounded-xl border border-[#f06464]/20 fade-up">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-[#a0a0b8] text-xs font-medium ml-1">Full Name</Label>
                            <Input
                                id="name"
                                placeholder="John Doe"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={loading}
                                className="bg-[#0c0c12] border-[#1e1e2a] focus:border-[#63d496]/50 focus:ring-[#63d496]/20 transition-all h-11 px-4 text-[#e0e0f0] placeholder:text-[#3a3a4a]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-[#a0a0b8] text-xs font-medium ml-1">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                className="bg-[#0c0c12] border-[#1e1e2a] focus:border-[#63d496]/50 focus:ring-[#63d496]/20 transition-all h-11 px-4 text-[#e0e0f0] placeholder:text-[#3a3a4a]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-[#a0a0b8] text-xs font-medium ml-1">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                className="bg-[#0c0c12] border-[#1e1e2a] focus:border-[#63d496]/50 focus:ring-[#63d496]/20 transition-all h-11 px-4 text-[#e0e0f0] placeholder:text-[#3a3a4a]"
                            />
                        </div>
                        <Button 
                            type="submit" 
                            className="w-full bg-gradient-to-br from-[#63d496] to-[#3db87a] text-[#0a1a10] hover:-translate-y-[1px] hover:shadow-[0_8px_24px_rgba(99,212,150,0.3)] active:translate-y-0 transition-all font-semibold h-11 rounded-xl border-none mt-2" 
                            disabled={loading}
                        >
                            {loading ? "Creating account..." : "Register"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center border-t border-[#1e1e2a] p-6 mt-2">
                    <div className="text-sm text-[#8888a0]">
                        Already have an account? <Link href={Routes.LOGIN} className="text-[#63d496] font-medium hover:underline">Login</Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
