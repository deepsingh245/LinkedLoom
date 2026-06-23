import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { dangerToast, successToast } from '@/lib/toast';

/**
 * Disconnect Reddit account. Clears the reddit field on the user profile
 * and deletes the connections/reddit subcollection document.
 * 
 * AuthProvider's onSnapshot listener will automatically pick up the profile change,
 * so we don't need to invalidate any TanStack query here.
 */
export function useDisconnectReddit() {
  return useMutation({
    mutationFn: (uid: string) => api.firebaseService.disconnectReddit(uid),
    onSuccess: () => {
      successToast('Reddit account disconnected.');
    },
    onError: () => {
      dangerToast('Failed to disconnect Reddit.');
    },
  });
}
