import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import { api } from '@/lib/api';

/**
 * Fetch analytics dashboard data for a user.
 * Stale time is 10 minutes — analytics doesn't need to be real-time.
 */
export function useAnalyticsDashboard(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.analytics.dashboard(userId!),
    queryFn: () => api.firebaseService.getAnalyticsDashboardData(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 10, // 10 minutes — override default 5 min
  });
}
