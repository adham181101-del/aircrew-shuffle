import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUserShifts, type Shift } from '@/lib/shifts'
import { getCurrentUser } from '@/lib/auth'
import { profiler } from '@/lib/performance'

// Query keys
export const shiftKeys = {
  all: ['shifts'] as const,
  user: (userId: string) => [...shiftKeys.all, 'user', userId] as const,
}

/**
 * React Query hook for fetching user shifts
 * Includes caching, deduplication, and automatic refetching
 */
export const useShifts = () => {
  return useQuery({
    queryKey: shiftKeys.all,
    queryFn: async () => {
      profiler.mark('fetch shifts start', 'fetch')
      const user = await getCurrentUser()
      if (!user) {
        profiler.mark('fetch shifts no user', 'fetch')
        return []
      }
      
      const shifts = await getUserShifts(user.id)
      profiler.mark('fetch shifts end', 'fetch')
      return { shifts, userId: user.id }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - shifts don't change often
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    refetchOnWindowFocus: false, // Don't refetch on tab focus
    refetchOnMount: false, // Use cache if available
  })
}

/**
 * Hook to get shifts for a specific user
 */
export const useUserShifts = (userId: string | null) => {
  return useQuery({
    queryKey: shiftKeys.user(userId || ''),
    queryFn: async () => {
      if (!userId) return []
      profiler.mark(`fetch shifts for user ${userId}`, 'fetch')
      const shifts = await getUserShifts(userId)
      return shifts
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}

/**
 * Mutation to invalidate shifts cache
 */
export const useInvalidateShifts = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: shiftKeys.all })
      profiler.mark('shifts cache invalidated', 'fetch')
    },
  })
}

