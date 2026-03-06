// app/(dashboard)/layout.tsx
import { AuthProvider } from "@/components/auth-provider";
import DashboardLayout from "@/components/layout/Shell";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <DashboardLayout>{children}</DashboardLayout>
        </AuthProvider>
    );
}
