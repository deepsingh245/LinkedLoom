import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import { api } from '@/lib/api';
import { Post } from '@/types';
import { successToast, dangerToast } from '@/lib/toast';

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Fetch all posts for a user. This is the primary query —
 * useScheduledPosts and useDraftPosts derive from this cache.
 */
export function usePosts(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.posts.all(userId!),
    queryFn: () => api.firebaseService.getAllPosts(userId!),
    enabled: !!userId,
  });
}

/**
 * Derived query: returns only SCHEDULED posts.
 * Uses `select` to filter from the same cache as usePosts — zero additional Firestore reads.
 */
export function useScheduledPosts(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.posts.all(userId!),
    queryFn: () => api.firebaseService.getAllPosts(userId!),
    enabled: !!userId,
    select: (posts: Post[]) =>
      posts.filter(
        (p) => p.status?.toUpperCase() === 'SCHEDULED' && p.scheduledFor && new Date(p.scheduledFor) > new Date()
      ),
  });
}

/**
 * Derived query: returns only DRAFT posts.
 * Uses `select` to filter from the same cache as usePosts — zero additional Firestore reads.
 */
export function useDraftPosts(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.posts.all(userId!),
    queryFn: () => api.firebaseService.getAllPosts(userId!),
    enabled: !!userId,
    select: (posts: Post[]) =>
      posts.filter((p) => p.status?.toUpperCase() === 'DRAFT'),
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

/**
 * Create a new post. Invalidates the posts cache on success.
 */
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postData: Partial<Post>) => api.firebaseService.createPost(postData),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all(variables.user_id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.dashboard(variables.user_id!) });
    },
    onError: () => {
      dangerToast('Failed to save post.');
    },
  });
}

/**
 * Update an existing post. Invalidates the posts cache on success.
 */
export function useUpdatePost(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, data }: { postId: string; data: Partial<Post> }) =>
      api.firebaseService.updatePost(postId, data),
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.posts.all(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.analytics.dashboard(userId) });
      }
    },
    onError: () => {
      dangerToast('Failed to update post.');
    },
  });
}

/**
 * Delete a post with optimistic removal from cache.
 */
export function useDeletePost(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => api.firebaseService.deletePost(postId),
    onMutate: async (postId) => {
      if (!userId) return;
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.all(userId) });

      // Snapshot the previous value
      const previous = queryClient.getQueryData<Post[]>(queryKeys.posts.all(userId));

      // Optimistically remove the post from cache
      queryClient.setQueryData<Post[]>(queryKeys.posts.all(userId), (old) =>
        old?.filter((p) => p.id !== postId)
      );

      return { previous };
    },
    onError: (_err, _postId, context) => {
      // Rollback on error
      if (userId && context?.previous) {
        queryClient.setQueryData(queryKeys.posts.all(userId), context.previous);
      }
      dangerToast('Failed to delete post.');
    },
    onSuccess: () => {
      successToast('Post deleted.');
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.analytics.dashboard(userId) });
      }
    },
    onSettled: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.posts.all(userId) });
      }
    },
  });
}

/**
 * Schedule a post. Optimistically updates status to SCHEDULED.
 */
export function useSchedulePost(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, scheduledFor }: { postId: string; scheduledFor: string }) =>
      api.firebaseService.schedulePost(postId, scheduledFor),
    onMutate: async ({ postId, scheduledFor }) => {
      if (!userId) return;
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.all(userId) });
      const previous = queryClient.getQueryData<Post[]>(queryKeys.posts.all(userId));

      queryClient.setQueryData<Post[]>(queryKeys.posts.all(userId), (old) =>
        old?.map((p) =>
          p.id === postId ? { ...p, status: 'SCHEDULED', scheduledFor: new Date(scheduledFor) } : p
        )
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (userId && context?.previous) {
        queryClient.setQueryData(queryKeys.posts.all(userId), context.previous);
      }
      dangerToast('Failed to schedule post.');
    },
    onSuccess: () => {
      successToast('Post scheduled successfully.');
    },
    onSettled: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.posts.all(userId) });
      }
    },
  });
}

/**
 * Unschedule a post (move to draft). Optimistically updates status to DRAFT.
 */
export function useUnschedulePost(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => api.firebaseService.unschedulePost(postId),
    onMutate: async (postId) => {
      if (!userId) return;
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.all(userId) });
      const previous = queryClient.getQueryData<Post[]>(queryKeys.posts.all(userId));

      queryClient.setQueryData<Post[]>(queryKeys.posts.all(userId), (old) =>
        old?.map((p) =>
          p.id === postId ? { ...p, status: 'DRAFT', scheduledFor: null } : p
        )
      );

      return { previous };
    },
    onError: (_err, _postId, context) => {
      if (userId && context?.previous) {
        queryClient.setQueryData(queryKeys.posts.all(userId), context.previous);
      }
      dangerToast('Failed to unschedule post.');
    },
    onSuccess: () => {
      successToast('Post unscheduled and moved to drafts.');
    },
    onSettled: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.posts.all(userId) });
      }
    },
  });
}

/**
 * Publish a post immediately to LinkedIn.
 */
export function usePublishPostNow(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      content,
      articleUrl,
      imageUrl,
    }: {
      content: string;
      articleUrl?: string;
      imageUrl?: string;
    }) => {
      if (!userId) throw new Error('User not authenticated');
      return api.firebaseService.publishPostNow(userId, content, articleUrl, imageUrl);
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.posts.all(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.analytics.dashboard(userId) });
      }
    },
    onError: () => {
      dangerToast('Failed to publish post.');
    },
  });
}
