export interface PostVersion {
  content: string;
  updatedAt: Date | string;
  // Add other fields from Post that you want to version
}

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
  versions?: PostVersion[];
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

export interface UserPreferences {
  theme: "dark" | "light" | "system";
  density: "comfortable" | "compact";
  animationsEnabled: boolean;
  notifications: {
    postPublished: boolean;
    weeklyDigest: boolean;

    aiSuggestions: boolean;
    commentAlerts: boolean;
    milestoneAlerts: boolean;
    productUpdates: boolean;
  };
  ai: {
    defaultTone: string;
    language: string;
    autoHashtags: boolean;
    smartSuggestions: boolean;
  };
  privacy: {
    publicProfile: boolean;
    analyticsSharing: boolean;
    twoFactorAuth: boolean;
  };
}

export interface UserProfile {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  jobTitle?: string;
  company?: string;
  location?: string;
  bio?: string;
  phone?: string;
  website?: string;
  twitter?: string;
  linkedin?: string;
  reddit?: string;
  medium?: string;
  preferences?: UserPreferences;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
