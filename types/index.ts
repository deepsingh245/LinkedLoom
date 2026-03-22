export interface Post {
  id: string;
  content: string;
  status: "PUBLISHED" | "SCHEDULED" | "DRAFT" | "published" | "scheduled" | "draft" | string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  date?: string;
  topic?: string;
  tone?: string;
  mediaUrls?: string[];
  imageUrl?: string | null;
  articleUrl?: string | null;
  linkedinUrn?: string;
  versions?: any[];
  user_id?: string;
  scheduledFor?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  publishedAt?: Date | string;
}

export interface Stats {
  impressions: number;
  engagement: string;
  followers: number;
  profileViews: number;
  trendingTopics: string[];
}

export interface AnalyticsData {
  name: string;
  views: number;
  engagement: number;
}
