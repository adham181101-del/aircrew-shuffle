import { supabase } from '@/integrations/supabase/client'
import { executeShiftSwap } from '@/lib/shifts'

export type SwapRequestForExecution = {
  id: string
  requester_shift_id: string
  accepter_id: string | null
  counter_offer_date?: string | null
  accepter_shift_id?: string | null
  requester_shift?: { date: string; time: string } | null
}

/** Cancel other pending broadcast requests for the same shift (after one is filled). */
export async function cancelSiblingPendingSwapRequests(
  requesterShiftId: string,
  exceptRequestId: string
): Promise<void> {
  const { error } = await supabase
    .from('swap_requests')
    .update({ status: 'canceled' })
    .eq('requester_shift_id', requesterShiftId)
    .eq('status', 'pending')
    .neq('id', exceptRequestId)

  if (error) throw error
}

/** Revoke entire broadcast: all pending rows for this requester + shift. */
export async function revokeAllPendingSwapRequestsForShift(
  requesterId: string,
  requesterShiftId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('swap_requests')
    .delete()
    .eq('requester_id', requesterId)
    .eq('requester_shift_id', requesterShiftId)
    .eq('status', 'pending')
    .select('id')

  if (error) throw error
  return data?.length ?? 0
}

export async function verifyRequesterShiftExists(requesterShiftId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('shifts')
    .select('id')
    .eq('id', requesterShiftId)
    .maybeSingle()

  return !error && !!data
}

/** Execute roster change, mark request accepted, cancel sibling pending requests. */
export async function completeSwapAcceptance(swapRequest: SwapRequestForExecution): Promise<void> {
  await executeShiftSwap(swapRequest)

  const { error: acceptError } = await supabase
    .from('swap_requests')
    .update({ status: 'accepted' })
    .eq('id', swapRequest.id)

  if (acceptError) throw acceptError

  await cancelSiblingPendingSwapRequests(swapRequest.requester_shift_id, swapRequest.id)
}

/** Resolve shift time for WHL when requester takes a counter-offer day. */
export async function resolveCounterOfferShiftTime(
  accepterId: string,
  counterOfferDate: string,
  fallbackTime: string
): Promise<string> {
  const { data } = await supabase
    .from('shifts')
    .select('time')
    .eq('staff_id', accepterId)
    .eq('date', counterOfferDate)
    .maybeSingle()

  return data?.time ?? fallbackTime
}
