"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthDivider, AuthHeader, SocialButtons } from "@/components/auth/AuthParts";
import { api } from "@/lib/api";
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
        const data = await api.firebaseService.getLinkedInAuthUrl()
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
    <>
      <AuthHeader title="Welcome back" description="Sign in to LinkedLoom." />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input autoComplete="email" className="h-11" placeholder="name@example.com" {...field} />
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
                  <Input type="password" autoComplete="current-password" className="h-11" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </Form>
      <AuthDivider />
      <SocialButtons onGoogle={loginWithGoogle} onLinkedIn={loginWithLinkedin} disabled={isSubmitting} />
      <p className="mt-8 text-[14px] text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href={Routes.REGISTER} className="font-medium text-teal-ink underline-offset-4 hover:underline">
          Create one
        </Link>
      </p>
    </>
  );
}
