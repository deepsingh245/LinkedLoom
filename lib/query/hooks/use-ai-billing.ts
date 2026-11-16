import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query/query-keys';
import { callableErrorMessage } from '@/lib/firebase/errors';
import { dangerToast, successToast } from '@/lib/toast';
import type { AIProviderId } from '@/types/ai';

/** BYOK connections (metadata only – keys never reach the browser). */
export function useAIConnections(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.autopilot.connections(userId!),
    queryFn: () => api.firebaseService.getAIConnections(userId!),
    enabled: !!userId,
  });
}

export function useCreditWallet(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.autopilot.wallet(userId!),
    queryFn: () => api.firebaseService.getCreditWallet(userId!),
    enabled: !!userId,
  });
}

export function useCreditLedger(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.autopilot.ledger(userId!),
    queryFn: () => api.firebaseService.getCreditLedger(userId!),
    enabled: !!userId,
  });
}

export function useUsageRecords(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.autopilot.usage(userId!),
    queryFn: () => api.firebaseService.getUsageRecords(userId!),
    enabled: !!userId,
  });
}

function useInvalidateAutopilot(userId?: string) {
  const queryClient = useQueryClient();
  return () => {
    if (userId) queryClient.invalidateQueries({ queryKey: queryKeys.autopilot.all(userId) });
  };
}

export function useAddAIConnection(userId?: string) {
  const invalidate = useInvalidateAutopilot(userId);
  return useMutation({
    mutationFn: (input: { provider: AIProviderId; label: string; apiKey: string }) => api.firebaseService.addAIConnection(input),
    onSuccess: () => {
      invalidate();
      successToast('API key verified and saved.');
    },
    onError: (error) => {
      dangerToast(callableErrorMessage(error, 'Failed to add the API key.'));
    },
  });
}

export function useTestAIConnection(userId?: string) {
  const invalidate = useInvalidateAutopilot(userId);
  return useMutation({
    mutationFn: (connectionId: string) => api.firebaseService.testAIConnection(connectionId),
    onSuccess: (result) => {
      invalidate();
      if (result.status === 'active') successToast(result.message);
      else dangerToast(result.message);
    },
    onError: (error) => {
      dangerToast(callableErrorMessage(error, 'Failed to test the API key.'));
    },
  });
}

export function useRevokeAIConnection(userId?: string) {
  const invalidate = useInvalidateAutopilot(userId);
  return useMutation({
    mutationFn: (connectionId: string) => api.firebaseService.revokeAIConnection(connectionId),
    onSuccess: (result) => {
      invalidate();
      successToast(
        result.detachedPersonas
          ? `Key removed. ${result.detachedPersonas} persona(s) switched to managed credits.`
          : 'Key removed.'
      );
    },
    onError: (error) => {
      dangerToast(callableErrorMessage(error, 'Failed to remove the API key.'));
    },
  });
}

export function useTestPersonaGeneration(userId?: string) {
  const invalidate = useInvalidateAutopilot(userId);
  return useMutation({
    mutationFn: ({ personaId, topic }: { personaId: string; topic?: string }) =>
      api.firebaseService.testPersonaGeneration(personaId, topic),
    // Credits and usage changed either way.
    onSettled: invalidate,
    onError: (error) => {
      dangerToast(callableErrorMessage(error, 'Test generation failed.'));
    },
  });
}
