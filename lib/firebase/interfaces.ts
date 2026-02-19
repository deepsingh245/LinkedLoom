// Post interface removed, use @/types instead

export interface DashboardData {
    id?: string;
    totalPosts: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    chartData?: any[];
    metrics?: {
        impressions: string;
        followers: string;
        engagement: string;
        views: string;
    };
}
