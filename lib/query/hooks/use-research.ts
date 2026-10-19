import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query/query-keys';
import { callableErrorMessage } from '@/lib/firebase/errors';
import { dangerToast, successToast } from '@/lib/toast';
import type { WorkflowRun } from '@/types/research';

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
    refetchInterval: (query) => query.state.data?.some((run) => run.status === 'queued' || run.status === 'running') ? 10_000 : 5 * 60_000,
  });
}

/** Scheduled runs that need attention in the last seven days. */
export function countScheduledRunAlerts(runs: WorkflowRun[]): number {
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return runs.filter((run) =>
    run.trigger === 'scheduled' &&
    (run.status === 'failed' || run.status === 'skipped') &&
    ((run.createdAt ?? run.startedAt)?.getTime() ?? 0) >= since
  ).length;
}

function useInvalidateAutopilot(userId?: string) {
  const queryClient = useQueryClient();
  return () => {
    if (userId) queryClient.invalidateQueries({ queryKey: queryKeys.autopilot.all(userId) });
  };
}

/** Start a queued run; callers follow the returned runId in Firestore. */
export function useRunResearch(userId?: string) {
  const invalidate = useInvalidateAutopilot(userId);
  return useMutation({
    mutationFn: (personaId: string) => api.firebaseService.runResearch(personaId),
    // Make the queued run visible in history immediately. The run document remains live.
    onSettled: invalidate,
    onError: (error) => {
      dangerToast(callableErrorMessage(error, 'Research run failed.'));
    },
  });
}

export function useCancelRun(userId?: string) {
  const invalidate = useInvalidateAutopilot(userId);
  return useMutation({
    mutationFn: (runId: string) => api.firebaseService.cancelRun(runId),
    onSuccess: invalidate,
    onError: (error) => dangerToast(callableErrorMessage(error, 'Could not cancel the run.')),
  });
}

export function useRetryRun(userId?: string) {
  const invalidate = useInvalidateAutopilot(userId);
  return useMutation({
    mutationFn: (runId: string) => api.firebaseService.retryRun(runId),
    onSuccess: () => {
      invalidate();
      successToast('Research run queued.');
    },
    onError: (error) => dangerToast(callableErrorMessage(error, 'Could not run research again.')),
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

/** Sample drafts for a persona, delivered to the approval queue the same way research drafts arrive. */
export function useRunPersonaDemo(userId?: string) {
  const invalidate = useInvalidateAutopilot(userId);
  return useMutation({
    mutationFn: (personaId: string) => api.firebaseService.runPersonaDemo(personaId),
    // Drafts and credits change even if the UI is closed before the call returns.
    onSettled: invalidate,
    onError: (error) => {
      dangerToast(callableErrorMessage(error, 'The demo could not run.'));
    },
  });
}
