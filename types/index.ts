export interface Post {
  id: number | string;
  content: string;
  status: "published" | "scheduled" | "draft";
  views: number;
  likes: number;
  comments: number;
  shares: number;
  date: string;
  topic?: string;
  tone?: string;
  mediaUrls?: string[];
  linkedinPostId?: string;
  versions?: any[];
  authorId?: string;
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
