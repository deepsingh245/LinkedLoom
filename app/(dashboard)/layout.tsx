// app/(dashboard)/layout.tsx
import { AuthProvider } from "@/components/auth-provider";
import DashboardLayout from "@/components/layout/Shell";
import { api } from "@/lib/api";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
// function removed

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <DashboardLayout>{children}</DashboardLayout>
        </AuthProvider>
    );
}
