import { AuthProvider } from "@/components/providers/auth-provider";
import SettingsLayout from "@/components/layout/SettingsLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <SettingsLayout>{children}</SettingsLayout>
        </AuthProvider>
    );
}
