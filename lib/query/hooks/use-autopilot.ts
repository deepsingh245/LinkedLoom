import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query/query-keys';
import { dangerToast, successToast } from '@/lib/toast';
import type { PersonaInput, PersonaStatus } from '@/types/autopilot';

// Callable errors carry the backend's readable message (e.g. version conflicts, limits).
const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message && error.message !== 'internal' ? error.message : fallback;

/**
 * All personas in the user's workspace, newest first.
 */
export function usePersonas(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.autopilot.personas(userId!),
    queryFn: () => api.firebaseService.getPersonas(userId!),
    enabled: !!userId,
  });
}

/**
 * A single persona.
 */
export function usePersona(userId: string | undefined, personaId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.autopilot.persona(userId!, personaId!),
    queryFn: () => api.firebaseService.getPersona(userId!, personaId!),
    enabled: !!userId && !!personaId,
  });
}

/**
 * Workspace-level Autopilot settings (global kill switch).
 */
export function useAutopilotSettings(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.autopilot.settings(userId!),
    queryFn: () => api.firebaseService.getAutopilotSettings(userId!),
    enabled: !!userId,
  });
}

function useInvalidateAutopilot(userId?: string) {
  const queryClient = useQueryClient();
  return () => {
    if (userId) queryClient.invalidateQueries({ queryKey: queryKeys.autopilot.all(userId) });
  };
}

export function useCreatePersona(userId?: string) {
  const invalidate = useInvalidateAutopilot(userId);
  return useMutation({
    mutationFn: (persona: PersonaInput) => api.firebaseService.createPersona(persona),
    onSuccess: () => {
      invalidate();
      successToast('Persona created.');
    },
    onError: (error) => {
      dangerToast(errorMessage(error, 'Failed to create persona.'));
    },
  });
}

export function useUpdatePersona(userId?: string) {
  const invalidate = useInvalidateAutopilot(userId);
  return useMutation({
    mutationFn: ({ personaId, expectedVersion, persona }: { personaId: string; expectedVersion: number; persona: PersonaInput }) =>
      api.firebaseService.updatePersona(personaId, expectedVersion, persona),
    onSuccess: () => {
      invalidate();
      successToast('Persona saved.');
    },
    onError: (error) => {
      dangerToast(errorMessage(error, 'Failed to save persona.'));
    },
  });
}

export function useSetPersonaStatus(userId?: string) {
  const invalidate = useInvalidateAutopilot(userId);
  return useMutation({
    mutationFn: ({ personaId, status }: { personaId: string; status: PersonaStatus }) =>
      api.firebaseService.setPersonaStatus(personaId, status),
    onSuccess: (_data, { status }) => {
      invalidate();
      successToast(
        status === 'paused' ? 'Persona paused.' : status === 'archived' ? 'Persona archived.' : 'Persona active.'
      );
    },
    onError: (error) => {
      dangerToast(errorMessage(error, 'Failed to update persona status.'));
    },
  });
}

export function useDeletePersona(userId?: string) {
  const invalidate = useInvalidateAutopilot(userId);
  return useMutation({
    mutationFn: (personaId: string) => api.firebaseService.deletePersona(personaId),
    onSuccess: () => {
      invalidate();
      successToast('Persona deleted.');
    },
    onError: (error) => {
      dangerToast(errorMessage(error, 'Failed to delete persona.'));
    },
  });
}

export function useSetAutopilotEnabled(userId?: string) {
  const invalidate = useInvalidateAutopilot(userId);
  return useMutation({
    mutationFn: (enabled: boolean) => api.firebaseService.setAutopilotEnabled(enabled),
    onSuccess: ({ autopilotEnabled }) => {
      invalidate();
      successToast(autopilotEnabled ? 'Autopilot turned on.' : 'Autopilot stopped for all personas.');
    },
    onError: (error) => {
      dangerToast(errorMessage(error, 'Failed to change Autopilot.'));
    },
  });
}
