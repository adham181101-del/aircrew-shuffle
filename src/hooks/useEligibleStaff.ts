import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { profiler } from '@/lib/performance'
import { useMemo } from 'react'

// Query keys
export const eligibleStaffKeys = {
  all: ['eligible-staff'] as const,
  forSwap: (baseLocation: string, swapDate: string, requesterId: string) => 
    [...eligibleStaffKeys.all, 'swap', baseLocation, swapDate, requesterId] as const,
}

/**
 * React Query hook for fetching eligible staff for swap
 * Includes caching and automatic deduplication
 */
export const useEligibleStaffForSwap = (
  baseLocation: string | null,
  swapDate: string | null,
  requesterId: string | null,
  options?: {
    enabled?: boolean
    staleTime?: number
  }
) => {
  const enabled = useMemo(() => {
    return !!(baseLocation && swapDate && requesterId && (options?.enabled !== false))
  }, [baseLocation, swapDate, requesterId, options?.enabled])

  return useQuery({
    queryKey: eligibleStaffKeys.forSwap(
      baseLocation || '',
      swapDate || '',
      requesterId || ''
    ),
    queryFn: async () => {
      if (!baseLocation || !swapDate || !requesterId) {
        return []
      }

      profiler.mark(`fetch eligible staff for ${swapDate}`, 'fetch')
      const startTime = performance.now()

      try {
        // Try database function first
        const { data: eligibleStaffData, error: eligibleError } = await (supabase as any)
          .rpc('get_eligible_staff_for_swap', {
            requester_base_location: baseLocation,
            swap_date: swapDate,
            requester_id: requesterId
          })

        if (eligibleError) {
          console.error('Error fetching eligible staff:', eligibleError)
          throw eligibleError
        }

        const duration = performance.now() - startTime
        profiler.logFetch('get_eligible_staff_for_swap', 'RPC', duration)

        if (eligibleStaffData && Array.isArray(eligibleStaffData)) {
          return eligibleStaffData
        }

        return []
      } catch (rpcError) {
        console.log('RPC function failed, falling back to manual query...')
        
        // Fallback to manual query
        const { data: baseStaff, error: staffError } = await supabase
          .from('staff')
          .select('*')
          .eq('base_location', baseLocation)
          .neq('id', requesterId)

        if (staffError) {
          throw staffError
        }

        // Get shifts for the selected date
        const { data: shiftsOnDate, error: shiftsError } = await supabase
          .from('shifts')
          .select('staff_id')
          .eq('date', swapDate)

        if (shiftsError) {
          throw shiftsError
        }

        // Filter to eligible staff (those who are OFF)
        const workingStaffIds = new Set(shiftsOnDate?.map(s => s.staff_id) || [])
        const eligibleList = baseStaff?.filter(staff => !workingStaffIds.has(staff.id)) || []

        const duration = performance.now() - startTime
        profiler.logFetch('get_eligible_staff_for_swap (fallback)', 'FETCH', duration)

        return eligibleList
      }
    },
    enabled,
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes - eligible staff doesn't change often
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Use cache if available
    retry: 1,
  })
}

