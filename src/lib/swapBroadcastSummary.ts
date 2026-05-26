import type { SwapRequestWithDetails } from '@/hooks/useSwapRequests'

export type SwapBroadcastSummary = {
  requesterShiftId: string
  shiftDate: string
  shiftTime: string
  waiting: number
  counterOffers: number
  declined: number
  canceled: number
  accepted: number
  requests: SwapRequestWithDetails[]
  createdAt: string
}

export function groupSwapRequestsByShift(
  requests: SwapRequestWithDetails[]
): SwapBroadcastSummary[] {
  const byShift = new Map<string, SwapRequestWithDetails[]>()

  for (const request of requests) {
    if (request.is_dummy) continue
    const key = request.requester_shift_id
    if (!byShift.has(key)) byShift.set(key, [])
    byShift.get(key)!.push(request)
  }

  const summaries: SwapBroadcastSummary[] = []

  for (const [requesterShiftId, group] of byShift) {
    const shift = group[0]?.requester_shift
    let waiting = 0
    let counterOffers = 0
    let declined = 0
    let canceled = 0
    let accepted = 0

    for (const r of group) {
      if (r.status === 'pending') {
        if (r.counter_offer_date) counterOffers++
        else waiting++
      } else if (r.status === 'declined') declined++
      else if (r.status === 'canceled') canceled++
      else if (r.status === 'accepted') accepted++
    }

    summaries.push({
      requesterShiftId,
      shiftDate: shift?.date ?? '—',
      shiftTime: shift?.time ?? '—',
      waiting,
      counterOffers,
      declined,
      canceled,
      accepted,
      requests: group.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
      createdAt: group.reduce(
        (latest, r) =>
          r.created_at > latest ? r.created_at : latest,
        group[0].created_at
      ),
    })
  }

  return summaries.sort((a, b) => {
    const dateCmp = b.shiftDate.localeCompare(a.shiftDate)
    if (dateCmp !== 0) return dateCmp
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export function formatBroadcastStatusLine(summary: SwapBroadcastSummary): string {
  const parts: string[] = []

  if (summary.waiting > 0) {
    parts.push(
      `Waiting on ${summary.waiting} ${summary.waiting === 1 ? 'person' : 'people'}`
    )
  }
  if (summary.counterOffers > 0) {
    parts.push(
      `${summary.counterOffers} counter-offer${summary.counterOffers === 1 ? '' : 's'}`
    )
  }
  if (summary.declined > 0) {
    parts.push(`${summary.declined} declined`)
  }
  if (summary.canceled > 0) {
    parts.push(`${summary.canceled} cancelled`)
  }
  if (summary.accepted > 0) {
    parts.push(`${summary.accepted} accepted`)
  }

  if (parts.length === 0) {
    return 'No responses yet'
  }

  return parts.join(' · ')
}

export function broadcastIsActive(summary: SwapBroadcastSummary): boolean {
  return summary.waiting > 0 || summary.counterOffers > 0
}
