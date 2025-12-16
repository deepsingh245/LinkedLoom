// app/(dashboard)/layout.tsx
import { AuthProvider } from "@/components/auth-provider";
import DashboardLayout from "@/components/layout/Shell";
import { api } from "@/lib/api";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import axios from "axios";

export async function getCurrentUser() {
    const tokenCookie = (await cookies()).get("token")?.value;
    if (!tokenCookie) return null;

    try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/current-user`, {
            headers: {
                Cookie: `token=${tokenCookie}`,
            },
        });
        return res.data;
    } catch (err) {
        return null;
    }
}

export default async function Layout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }

    return (
        <AuthProvider user={user}>
            <DashboardLayout>{children}</DashboardLayout>
        </AuthProvider>
    );
}
