import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query/query-keys';
import { callableErrorMessage } from '@/lib/firebase/errors';
import { dangerToast, successToast } from '@/lib/toast';
import type { PublishOutcome } from '@/types/research';

/** Last time the publishing scheduler ran. Checked every minute while a page that shows publishing health is open. */
export function usePublisherHeartbeat() {
  return useQuery({
    queryKey: queryKeys.publishing.heartbeat(),
    queryFn: () => api.firebaseService.getPublisherHeartbeat(),
    refetchInterval: 60_000,
    retry: false,
  });
}

function useRefreshPosts(userId?: string) {
  const queryClient = useQueryClient();
  return () => {
    if (!userId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.posts.all(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.autopilot.all(userId) });
  };
}

/** Explains what happened after a publish attempt that the user triggered. */
function reportOutcome(outcome: PublishOutcome) {
  if (outcome.status === 'PUBLISHED') successToast('Published.');
  else if (outcome.status === 'RETRY_PENDING') successToast("The network is busy. We'll try again shortly.");
  else dangerToast(outcome.error ?? 'Publishing did not complete.');
}

export function usePublishPostById(userId?: string) {
  const refresh = useRefreshPosts(userId);
  return useMutation({
    mutationFn: (postId: string) => api.firebaseService.publishPostById(postId),
    onSettled: refresh,
    onSuccess: reportOutcome,
    onError: (error) => dangerToast(callableErrorMessage(error, 'Could not publish the post.')),
  });
}

export function useRepublishPost(userId?: string) {
  const refresh = useRefreshPosts(userId);
  return useMutation({
    mutationFn: (postId: string) => api.firebaseService.republishPost(postId, 'linkedin'),
    onSettled: refresh,
    onSuccess: reportOutcome,
    onError: (error) => dangerToast(callableErrorMessage(error, 'Could not publish the post again.')),
  });
}
