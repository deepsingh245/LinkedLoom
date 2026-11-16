import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query/query-keys';
import { callableErrorMessage } from '@/lib/firebase/errors';
import { dangerToast, successToast } from '@/lib/toast';

export function useContextDocs(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.autopilot.context(userId!),
    queryFn: () => api.firebaseService.getContextDocs(userId!),
    enabled: !!userId,
  });
}

function useInvalidateContext(userId?: string) {
  const queryClient = useQueryClient();
  return () => {
    if (userId) queryClient.invalidateQueries({ queryKey: queryKeys.autopilot.context(userId) });
  };
}

/** Upload one file at a time so each gets its own error message (size, limits, not text…). */
export function useAddContextDoc(userId?: string) {
  const invalidate = useInvalidateContext(userId);
  return useMutation({
    mutationFn: ({ file, personaId }: { file: File; personaId: string | null }) => api.firebaseService.addContextDoc(file, personaId),
    onSettled: invalidate,
    onSuccess: (_result, { file }) => successToast(`Added ${file.name}.`),
    onError: (error, { file }) => dangerToast(`${file.name}: ${callableErrorMessage(error, 'Could not add the file.')}`),
  });
}

export function useUpdateContextDoc(userId?: string) {
  const invalidate = useInvalidateContext(userId);
  return useMutation({
    mutationFn: ({ docId, ...patch }: { docId: string; enabled?: boolean; personaId?: string | null }) =>
      api.firebaseService.updateContextDoc(docId, patch),
    onSettled: invalidate,
    onError: (error) => dangerToast(callableErrorMessage(error, 'Could not update the file.')),
  });
}

export function useDeleteContextDoc(userId?: string) {
  const invalidate = useInvalidateContext(userId);
  return useMutation({
    mutationFn: (docId: string) => api.firebaseService.deleteContextDoc(docId),
    onSettled: invalidate,
    onSuccess: () => successToast('File removed.'),
    onError: (error) => dangerToast(callableErrorMessage(error, 'Could not remove the file.')),
  });
}
