import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { getCurrentUser, type Staff } from '@/lib/auth'
import { profiler } from '@/lib/performance'

export type SwapRequestWithDetails = {
  id: string
  requester_id: string
  requester_shift_id: string
  accepter_id: string | null
  accepter_shift_id: string | null
  counter_offer_date: string | null
  status: string
  message: string | null
  created_at: string
  is_dummy?: boolean
  dummy_repay_date?: string | null
  final_repay_date?: string | null
  requester_staff?: Staff
  accepter_staff?: Staff
  requester_shift?: any
  accepter_shift?: any
}

// Query keys
export const swapRequestKeys = {
  all: ['swap-requests'] as const,
  incoming: (userId: string) => [...swapRequestKeys.all, 'incoming', userId] as const,
  myRequests: (userId: string) => [...swapRequestKeys.all, 'my-requests', userId] as const,
}

/**
 * Load incoming swap requests (where user is the accepter)
 */
const loadIncomingRequests = async (userId: string): Promise<SwapRequestWithDetails[]> => {
  profiler.mark(`fetch incoming requests for ${userId}`, 'fetch')
  
  const { data, error } = await supabase
    .from('swap_requests')
    .select(`
      *,
      requester_staff:staff!swap_requests_requester_id_fkey(*),
      requester_shift:shifts!swap_requests_requester_shift_id_fkey(*)
    `)
    .eq('accepter_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching incoming requests:', error)
    return []
  }

  return data || []
}

/**
 * Load my swap requests (where user is the requester)
 */
const loadMyRequests = async (userId: string): Promise<SwapRequestWithDetails[]> => {
  profiler.mark(`fetch my requests for ${userId}`, 'fetch')
  
  const { data, error } = await supabase
    .from('swap_requests')
    .select(`
      *,
      accepter_staff:staff!swap_requests_accepter_id_fkey(*),
      requester_shift:shifts!swap_requests_requester_shift_id_fkey(*),
      accepter_shift:shifts!swap_requests_accepter_shift_id_fkey(*)
    `)
    .eq('requester_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching my requests:', error)
    return []
  }

  return data || []
}

/**
 * React Query hook for incoming swap requests
 */
export const useIncomingSwapRequests = (userId: string | null) => {
  return useQuery({
    queryKey: swapRequestKeys.incoming(userId || ''),
    queryFn: () => loadIncomingRequests(userId!),
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute - swap requests can change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Use cache if available
  })
}

/**
 * React Query hook for my swap requests
 */
export const useMySwapRequests = (userId: string | null) => {
  return useQuery({
    queryKey: swapRequestKeys.myRequests(userId || ''),
    queryFn: () => loadMyRequests(userId!),
    enabled: !!userId,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}

/**
 * Hook to invalidate swap requests cache
 */
export const useInvalidateSwapRequests = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: swapRequestKeys.all })
      profiler.mark('swap requests cache invalidated', 'fetch')
    },
  })
}

