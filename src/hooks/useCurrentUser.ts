import { useQuery } from '@tanstack/react-query'
import { getCurrentUser, type Staff, type Company } from '@/lib/auth'
import { profiler } from '@/lib/performance'

// Query keys
export const userKeys = {
  all: ['user'] as const,
  current: ['user', 'current'] as const,
}

/**
 * React Query hook for current user
 * Caches user data to avoid repeated fetches
 */
export const useCurrentUser = () => {
  return useQuery({
    queryKey: userKeys.current,
    queryFn: async () => {
      profiler.mark('fetch current user', 'fetch')
      const user = await getCurrentUser()
      return user
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - user data doesn't change often
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Use cache if available
    retry: 1,
  })
}

