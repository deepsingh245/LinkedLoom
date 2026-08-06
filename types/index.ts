export type UserRole = "FOUNDER" | "CREATOR" | "JOB_SEEKER" | "SALES";

export interface User {
    id: string;
    name: string;
    email: string;
    image?: string;
    role: UserRole;
    credits: number;
}

export type Tone = "PROFESSIONAL" | "CASUAL" | "VIRAL" | "STORYTELLING" | "CONTROVERSIAL";

export interface Post {
    id: string;
    content: string;
    tone: Tone;
    status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "FAILED";
    scheduledFor?: Date;
    publishedAt?: Date;
    createdAt: Date;
    versions?: string[]; // History of AI generations
    user_id: string;
    mediaUrls: string[];
    linkedinPostId: string;
    analytics?: Analytics;
}

export interface Analytics {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    ctr: number;
}
