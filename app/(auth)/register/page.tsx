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
import { dangerToast, successToast } from "@/lib/toast";
import { registerSchema } from "@/lib/schemas/auth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const { formState: { isSubmitting } } = form;

  const onSubmit = async (data: RegisterFormValues) => {
    setError("");

    try {
      await api.firebaseService.registerWithEmailAndPassword(
        data.email,
        data.password,
        null
      );
      successToast("Registration successful! Please login.");
      router.push(Routes.LOGIN);
    } catch (err: unknown) {
      const errorMessage = (err as Error).message || "Registration failed";
      setError(errorMessage);
      dangerToast(errorMessage);
    }
  };

  const loginWithGoogle = async () => {
    try {
      await api.firebaseService.loginWithGoogle();
      router.push(Routes.DASHBOARD);
    } catch (error) {
      console.error(error);
      dangerToast("Google Login failed");
    }
  };

  const loginWithLinkedin = async () => {
    try {
      const data = await api.firebaseService.getLinkedInAuthUrl();
      if (data.url) {
        window.location.href = data.url;
      } else {
        dangerToast("Failed to initialize LinkedIn login.");
      }
    } catch (error) {
      console.error(error);
      dangerToast("LinkedIn Login failed");
    }
  };

  return (
    <>
      <AuthHeader title="Create your account" description="Start with the AI writer and scheduler today." />
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
                  <Input type="password" autoComplete="new-password" className="h-11" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" className="h-11" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
        </form>
      </Form>
      <AuthDivider />
      <SocialButtons onGoogle={loginWithGoogle} onLinkedIn={loginWithLinkedin} disabled={isSubmitting} />
      <p className="mt-8 text-[14px] text-muted-foreground">
        Already have an account?{" "}
        <Link href={Routes.LOGIN} className="font-medium text-teal-ink underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
