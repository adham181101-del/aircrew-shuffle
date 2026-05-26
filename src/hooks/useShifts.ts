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
    staleTime: 30 * 1000, // Short stale window so edits show quickly after refetch
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
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
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
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
      await queryClient.refetchQueries({ queryKey: shiftKeys.all, type: 'active' })
      profiler.mark('shifts cache invalidated and refetched', 'fetch')
    },
  })
}

