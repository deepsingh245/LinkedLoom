export enum Tone {
  PROFESSIONAL = 'Professional',
  CASUAL = 'Casual',
  VIRAL = 'Viral',
  FOUNDER = 'Thought Leader',
  CONTROVERSIAL = 'Controversial'
}

export enum PostStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED'
}

export interface Post {
  id: string;
  content: string;
  tone: Tone;
  status: PostStatus;
  createdAt: string;
  scheduledFor?: string;
  stats?: {
    impressions: number;
    likes: number;
    comments: number;
    shares: number;
  };
}

export interface AnalyticsData {
  date: string;
  impressions: number;
  engagement: number;
}

export interface UserProfile {
  name: string;
  headline: string;
  avatarUrl: string;
}
