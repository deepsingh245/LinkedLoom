/**
 * Centralised query key factory.
 * 
 * Using a factory ensures:
 * - Type-safe keys across all hooks
 * - Predictable invalidation (invalidate all posts: queryKeys.posts.all(userId))
 * - No key string typos
 */
export const queryKeys = {
  posts: {
    all: (userId: string) => ['posts', userId] as const,
    scheduled: (userId: string) => ['posts', userId, 'scheduled'] as const,
    drafts: (userId: string) => ['posts', userId, 'drafts'] as const,
    detail: (postId: string) => ['posts', 'detail', postId] as const,
  },
  analytics: {
    dashboard: (userId: string) => ['analytics', 'dashboard', userId] as const,
  },
  integrations: {
    linkedinAuth: () => ['integrations', 'linkedin', 'authUrl'] as const,
    redditAuth: () => ['integrations', 'reddit', 'authUrl'] as const,
  },
} as const;
