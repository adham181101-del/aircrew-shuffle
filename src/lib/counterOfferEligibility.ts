import { isValidDouble, normalizeTimeRange, type Shift } from '@/lib/shifts'
import {
  getTodayDatabaseDate,
  isPastDatabaseDate,
  isSameCalendarMonth,
  normalizeToDatabaseDate,
  parseLocalDate,
  toDatabaseDate,
} from '@/lib/dates'

export type CounterOfferMatchKind = 'standard' | 'double' | 'incompatible'

export type CounterOfferOption = {
  id: string
  date: string
  staff_id: string
  is_counter_offer: true
  matchKind: CounterOfferMatchKind
  /** Accepter shift on counter-offer day (shift requester would cover). */
  userShiftTime: string | null
  /** Requester shift on counter-offer day. */
  requesterShiftTime: string | null
  /** Requester's original shift being swapped (what accepter covers). */
  swapShiftTime: string
  swapShiftDate: string
  canSelect: boolean
}

export function formatShiftTimeLabel(time: string | null): string {
  if (!time) return 'OFF'
  return normalizeTimeRange(time) ?? time
}

export function getShiftStartTime(timeRange: string): string | null {
  const normalized = normalizeTimeRange(timeRange)
  if (!normalized) return null
  return normalized.split('-')[0] ?? null
}

function shiftsOnDate(shifts: Shift[], dateStr: string): Shift[] {
  const key = normalizeToDatabaseDate(dateStr)
  return shifts.filter((s) => normalizeToDatabaseDate(s.date) === key)
}

export type ClassifyCounterOfferParams = {
  date: string
  userShifts: Shift[]
  requesterShifts: Shift[]
  userLeaveDates: Set<string>
  requesterLeaveDates: Set<string>
  canWorkDoubles: boolean
  swapShiftDate: string
  swapShiftTime: string
}

export function classifyCounterOfferDate(
  params: ClassifyCounterOfferParams
): CounterOfferMatchKind | null {
  const {
    date,
    userShifts,
    requesterShifts,
    userLeaveDates,
    requesterLeaveDates,
    canWorkDoubles,
  } = params

  const dateKey = normalizeToDatabaseDate(date)

  if (isPastDatabaseDate(dateKey)) return null
  if (userLeaveDates.has(dateKey) || requesterLeaveDates.has(dateKey)) return null

  const userOnDate = shiftsOnDate(userShifts, dateKey)
  const requesterOnDate = shiftsOnDate(requesterShifts, dateKey)
  const userHasShift = userOnDate.length > 0
  const requesterHasShift = requesterOnDate.length > 0

  // Repay day: requester must be off so they can work the accepter's shift.
  if (userHasShift && !requesterHasShift) {
    return 'standard'
  }

  if (userHasShift && requesterHasShift) {
    const userTime = userOnDate[0]?.time ?? ''
    const requesterTime = requesterOnDate[0]?.time ?? ''
    if (canWorkDoubles && isValidDouble(userTime, requesterTime)) {
      return 'double'
    }
    return 'incompatible'
  }

  // No repay shift for requester, or requester working when they need to be off.
  if (!userHasShift || requesterHasShift) {
    return 'incompatible'
  }

  return 'incompatible'
}

export function buildCounterOfferOptions(params: {
  userId: string
  userShifts: Shift[]
  requesterShifts: Shift[]
  userLeaveDates: Set<string>
  requesterLeaveDates: Set<string>
  canWorkDoubles: boolean
  swapShiftDate: string
  swapShiftTime: string
  targetMonth?: Date
}): CounterOfferOption[] {
  const {
    userId,
    userShifts,
    requesterShifts,
    userLeaveDates,
    requesterLeaveDates,
    canWorkDoubles,
    swapShiftDate,
    swapShiftTime,
    targetMonth,
  } = params

  const today = parseLocalDate(getTodayDatabaseDate())
  today.setHours(0, 0, 0, 0)

  let startDate: Date
  let endDate: Date

  if (targetMonth) {
    startDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1)
    endDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0)
  } else {
    startDate = today
    endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  }

  const daysInMonth = Math.round(
    (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
  ) + 1

  const options: CounterOfferOption[] = []

  for (let i = 0; i < daysInMonth; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    const dateKey = toDatabaseDate(date)

    if (targetMonth && !isSameCalendarMonth(dateKey, targetMonth)) continue

    const kind = classifyCounterOfferDate({
      date: dateKey,
      userShifts,
      requesterShifts,
      userLeaveDates,
      requesterLeaveDates,
      canWorkDoubles,
      swapShiftDate,
      swapShiftTime,
    })

    if (!kind) continue

    const userOnDate = shiftsOnDate(userShifts, dateKey)
    const requesterOnDate = shiftsOnDate(requesterShifts, dateKey)

    options.push({
      id: `counter-offer-${dateKey}`,
      date: dateKey,
      staff_id: userId,
      is_counter_offer: true,
      matchKind: kind,
      userShiftTime: userOnDate[0]?.time ?? null,
      requesterShiftTime: requesterOnDate[0]?.time ?? null,
      swapShiftTime,
      swapShiftDate,
      canSelect: kind === 'standard' || kind === 'double',
    })
  }

  return options.sort((a, b) => a.date.localeCompare(b.date))
}

export function counterOfferCardClass(kind: CounterOfferMatchKind, selected: boolean): string {
  const base =
    'p-3 rounded-lg border cursor-pointer transition-colors text-left w-full'
  if (kind === 'standard' || kind === 'double') {
    return `${base} ${
      selected
        ? 'bg-green-100 border-green-500 ring-2 ring-green-400'
        : 'bg-green-50 border-green-300 hover:bg-green-100'
    }`
  }
  return `${base} bg-orange-50 border-orange-300 opacity-90 cursor-not-allowed`
}
