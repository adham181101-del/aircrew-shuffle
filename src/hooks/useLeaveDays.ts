import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMyLeaveDays, addLeaveDay, removeLeaveDay, type LeaveDay } from '@/lib/leave'
import { profiler } from '@/lib/performance'

// Query keys
export const leaveDaysKeys = {
  all: ['leave-days'] as const,
  mine: ['leave-days', 'mine'] as const,
}

/**
 * React Query hook for fetching user's leave days
 */
export const useLeaveDays = () => {
  return useQuery({
    queryKey: leaveDaysKeys.mine,
    queryFn: async () => {
      profiler.mark('fetch leave days', 'fetch')
      const leaveDays = await getMyLeaveDays()
      return leaveDays
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}

/**
 * Mutation to add a leave day
 */
export const useAddLeaveDay = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (dateIso: string) => {
      profiler.mark(`add leave day ${dateIso}`, 'fetch')
      const success = await addLeaveDay(dateIso)
      if (success) {
        await queryClient.invalidateQueries({ queryKey: leaveDaysKeys.all })
      }
      return success
    },
  })
}

/**
 * Mutation to remove a leave day
 */
export const useRemoveLeaveDay = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (dateIso: string) => {
      profiler.mark(`remove leave day ${dateIso}`, 'fetch')
      const success = await removeLeaveDay(dateIso)
      if (success) {
        await queryClient.invalidateQueries({ queryKey: leaveDaysKeys.all })
      }
      return success
    },
  })
}

