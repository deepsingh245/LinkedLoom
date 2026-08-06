import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,       // 5 minutes — data is "fresh" and won't refetch
      gcTime: 1000 * 60 * 30,          // 30 minutes — cache is garbage-collected after this
      retry: 1,                         // Retry once on failure
      refetchOnWindowFocus: false,      // Don't refetch when user alt-tabs back
    },
    mutations: {
      retry: 0,                         // Don't retry mutations (could cause duplicates)
    },
  },
});
