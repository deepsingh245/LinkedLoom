export interface PostVersion {
  content: string;
  updatedAt: Date | string;
  // Add other fields from Post that you want to version
}

/** Post lifecycle. Clients write DRAFT / SCHEDULED; the rest is set by the publisher (functions/src/publishing). */
export type PostStatusValue =
  | "DRAFT"
  | "SCHEDULED"
  | "PUBLISHING"
  | "RETRY_PENDING"
  | "PUBLISHED"
  | "PARTIAL"
  | "FAILED"
  | "RECONCILIATION_REQUIRED";

export type PublishPlatform = "linkedin" | "reddit";

export interface PlatformResult {
  status: "published" | "failed" | "unknown";
  id?: string;
  url?: string;
  error?: string;
  kind?: "auth" | "definite" | "transient" | "ambiguous";
}

export interface Post {
  id: string;
  content: string;
  status: PostStatusValue | "published" | "scheduled" | "draft" | string;
  /** Networks this post goes to. Older posts without it go to every connected network. */
  platforms?: PublishPlatform[];
  results?: Partial<Record<PublishPlatform, PlatformResult>>;
  /** "autopilot" for approved Autopilot drafts. */
  source?: "autopilot" | "manual" | string;
  contentItemId?: string;
  personaId?: string;
  publishedUrl?: string;
  error?: string;
  attempts?: number;
  nextAttemptAt?: Date | string;
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
  subreddit?: string;
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
  x?: string;
  linkedin?: string;
  reddit?: string;
  medium?: string;
  preferences?: UserPreferences;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
