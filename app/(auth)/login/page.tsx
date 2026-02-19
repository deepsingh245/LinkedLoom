"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { LinkedinIcon } from "lucide-react"
import { Routes } from "@/lib/routes"
import { dangerToast } from "@/lib/toast"

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const user = await api.firebaseService.loginWithEmailAndPassword(email, password)
            if (user) {
                router.push(Routes.DASHBOARD)
            } else {
                setError("Login failed: No user returned.")
            }
        } catch (err: any) {
            setError(err.message || "Login failed")
        } finally {
            setLoading(false)
        }
    }

    const loginWithLinkedin = async () => {
        try {
            setLoading(true)
            const { url } = await api.firebaseService.getLinkedInAuthUrl()
            window.location.href = url
        } catch (error) {
            console.error(error)
            dangerToast("Login failed")
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl">Login</CardTitle>
                    <CardDescription>Please Login With your Linkedin</CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                    <CardContent className="space-y-4">
                        {error && <div className="text-sm text-red-500">{error}</div>}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
                            {loading ? "Logging in..." : "Login"}
                        </Button>
                    </CardContent>
                </form>
                <CardFooter className="flex flex-col space-y-3">
                    <div className="flex gap-4">
                        <Button variant="outline" className="cursor-pointer"
                            onClick={loginWithLinkedin}
                        ><LinkedinIcon />Linkedin</Button>
                        {/* <Button variant="outline" className="cursor-pointer"><Mail />Google</Button  > */}
                    </div>
                    <div className="text-sm text-center text-muted-foreground">
                        Don't have an account? <Link href={Routes.REGISTER} className="underline">Sign up</Link>
                    </div>
                </CardFooter>

            </Card>
        </div >
    )
}
