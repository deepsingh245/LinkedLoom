import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query/query-keys';
import { callableErrorMessage } from '@/lib/firebase/errors';
import { dangerToast, successToast } from '@/lib/toast';

export function useContentItems(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.autopilot.drafts(userId!),
    queryFn: () => api.firebaseService.getContentItems(userId!),
    enabled: !!userId,
  });
}

export function useRuns(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.autopilot.runs(userId!),
    queryFn: () => api.firebaseService.getRuns(userId!),
    enabled: !!userId,
  });
}

function useInvalidateAutopilot(userId?: string) {
  const queryClient = useQueryClient();
  return () => {
    if (userId) queryClient.invalidateQueries({ queryKey: queryKeys.autopilot.all(userId) });
  };
}

/**
 * Start a research run. The call returns when the run finishes (minutes); progress is shown by
 * subscribing to the run document, so callers pass the id of the run they discover via useLatestRun.
 */
export function useRunResearch(userId?: string) {
  const invalidate = useInvalidateAutopilot(userId);
  return useMutation({
    mutationFn: (personaId: string) => api.firebaseService.runResearch(personaId),
    // Credits, drafts and run history all changed, even when the run only partly succeeded.
    onSettled: invalidate,
    onError: (error) => {
      dangerToast(callableErrorMessage(error, 'Research run failed.'));
    },
  });
}

export function useUpdateContentItem(userId?: string) {
  const invalidate = useInvalidateAutopilot(userId);
  return useMutation({
    mutationFn: ({ contentId, text }: { contentId: string; text: string }) => api.firebaseService.updateContentItem(contentId, text),
    onSuccess: () => {
      invalidate();
      successToast('Draft saved.');
    },
    onError: (error) => {
      dangerToast(callableErrorMessage(error, 'Failed to save the draft.'));
    },
  });
}

export function useSetContentStatus(userId?: string) {
  const invalidate = useInvalidateAutopilot(userId);
  return useMutation({
    mutationFn: ({ contentId, status }: { contentId: string; status: 'pending' | 'rejected' }) =>
      api.firebaseService.setContentStatus(contentId, status),
    onSuccess: (_d, { status }) => {
      invalidate();
      successToast(status === 'rejected' ? 'Draft rejected.' : 'Draft restored.');
    },
    onError: (error) => {
      dangerToast(callableErrorMessage(error, 'Failed to update the draft.'));
    },
  });
}

export function useExportContentToDraft(userId?: string) {
  const invalidate = useInvalidateAutopilot(userId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contentId: string) => api.firebaseService.exportContentToDraft(contentId),
    onSuccess: () => {
      invalidate();
      // The new post shows up in the normal drafts list.
      if (userId) queryClient.invalidateQueries({ queryKey: queryKeys.posts.all(userId) });
      successToast('Saved to your drafts. Edit and schedule it from Create Post or Content Library.');
    },
    onError: (error) => {
      dangerToast(callableErrorMessage(error, 'Failed to save to your drafts.'));
    },
  });
}
