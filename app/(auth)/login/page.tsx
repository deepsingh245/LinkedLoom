"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";
import { LinkedinIcon } from "lucide-react";
import { Routes } from "@/lib/routes";
import { dangerToast } from "@/lib/toast";
import { loginSchema } from "@/lib/schemas/auth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { formState: { isSubmitting } } = form;

  const onSubmit = async (data: LoginFormValues) => {
    setError("");

    try {
      const user = await api.firebaseService.loginWithEmailAndPassword(
        data.email,
        data.password
      );
      if (user) {
        router.push(Routes.DASHBOARD);
      } else {
        setError("Login failed: No user returned.");
      }
    } catch (err: unknown) {
        dangerToast((err as Error).message || "Login failed");
        setError((err as Error).message || "Login failed");
    }
  };

  const loginWithGoogle = async () => {
    try {
        await api.firebaseService.loginWithGoogle();
        router.push(Routes.DASHBOARD);
    } catch (error) {
        console.error(error)
        dangerToast("Google Login failed")
    }
  }

  const loginWithLinkedin = async () => {
    try {
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
    }
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-[#080808] overflow-hidden p-4">
      {/* Animated Background Blobs */}
      <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] bg-[#63d496]/15 rounded-full blur-[120px] animate-blob" />
      <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#6490d4]/15 rounded-full blur-[120px] animate-blob" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-[-20%] left-[10%] w-[55%] h-[55%] bg-[#c890f0]/15 rounded-full blur-[120px] animate-blob" style={{ animationDelay: '4s' }} />
      <div className="absolute top-[30%] right-[-20%] w-[50%] h-[50%] bg-[#63d496]/10 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '6s' }} />
      <div className="absolute bottom-[20%] right-[10%] w-[40%] h-[40%] bg-[#6490d4]/10 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '8s' }} />
      
      {/* Subtle Grid / Noise Pattern */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-25 brightness-50 contrast-150 pointer-events-none mix-blend-overlay" />
      <div className="absolute inset-0 bg-linear-to-tr from-[#080808] via-transparent to-[#080808] opacity-70 pointer-events-none" />
      
      <Card className="w-full max-w-md shadow-2xl border-[#1e1e2a] bg-[#13131a]/80 backdrop-blur-xl fade-up relative z-10">
        <CardHeader className="space-y-1.5 pb-6">
          <div className="flex justify-center mb-4">
            <Link href={Routes.HOME}>
              <div className="h-12 w-12 bg-linear-to-br from-[#63d496] to-[#3db87a] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(99,212,150,0.3)] transition-transform duration-200 hover:scale-105">
                <span className="text-[#0a1a10] font-bold text-xl">L</span>
              </div>
            </Link>
          </div>
          <CardTitle className="text-[28px] font-display font-semibold tracking-tight text-center text-[#f0f0f8]">Welcome back</CardTitle>
          <CardDescription className="text-center text-[#8888a0] text-sm">
            Enter your email to sign in to your accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Signing In..." : "Sign In"}
              </Button>
            </form>
          </Form>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#2a2a3a]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#13131a] px-2 text-[#8888a0]">
                Or continue with
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={loginWithGoogle}
              disabled={isSubmitting}
              className="bg-[#1a1a24] border-[#2a2a3a] hover:bg-[#222230] hover:border-[#63d496]/50 text-[#e0e0f0] transition-all duration-200"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
            <Button
              variant="outline"
              onClick={loginWithLinkedin}
              disabled={isSubmitting}
              className="bg-[#1a1a24] border-[#2a2a3a] hover:bg-[#222230] hover:border-[#6490d4]/50 text-[#e0e0f0] transition-all duration-200"
            >
              <LinkedinIcon className="mr-2 h-4 w-4 text-[#6490d4]" />
              Linkedin
            </Button>
          </div>
        </CardContent>
        <CardFooter className="text-sm text-center block text-[#8888a0]">
          Don't have an account?{" "}
          <Link href={Routes.REGISTER} className="font-semibold text-[#63d496] hover:underline">
            Sign up
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
