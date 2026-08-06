// app/(public)/layout.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import axios from "axios";

async function getCurrentUser() {
    const token = (await cookies()).get("token")?.value;
    if (!token) return null;

    try {
        const res = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/current-user`,
            { headers: { Cookie: `token=${token}` } }
        );
        return res.data;
    } catch {
        return null;
    }
}

export default async function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getCurrentUser();
    if (user) {
        redirect("/dashboard");
    }

    return children;
}
