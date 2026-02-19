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

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl">Create Account</CardTitle>
                    <CardDescription>Enter your details to get started</CardDescription>
                </CardHeader>
                <form onSubmit={handleRegister}>
                    <CardContent className="space-y-4">
                        {error && <div className="text-sm text-red-500">{error}</div>}
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                placeholder="John Doe"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
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
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-2">
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Creating account..." : "Register"}
                        </Button>
                        <div className="text-sm text-center text-muted-foreground">
                            Already have an account? <Link href={Routes.LOGIN} className="underline">Login</Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
