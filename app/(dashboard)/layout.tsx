// app/(dashboard)/layout.tsx
import { AuthProvider } from "@/components/providers/auth-provider";
import { DataProvider } from "@/components/providers/data-provider";
import DashboardLayout from "@/components/layout/Shell";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <DataProvider>
                <DashboardLayout>{children}</DashboardLayout>
            </DataProvider>
        </AuthProvider>
    );
}

