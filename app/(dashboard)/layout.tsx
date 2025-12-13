import DashboardLayout from "@/components/layout/Shell";

export default function Layout({ children }: { children: React.ReactNode }) {
    return <DashboardLayout>{children}</DashboardLayout>;
}
