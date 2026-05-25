import { getShiftTimeOfDay, getShiftDurationHours, type Shift } from '@/lib/shifts'
import { LONG_SHIFT_HOURS_THRESHOLD } from '@/lib/payrollConstants'

/** Monday-first week header (ISO-style roster grid). */
export const WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const

export const buildMonthGrid = (currentMonth: Date): Array<Date | null> => {
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0).getDate()
  // getDay(): Sun=0 … Sat=6 → Mon-first padding
  const leadingEmptyCount = (firstDay.getDay() + 6) % 7
  const cells: Array<Date | null> = []

  for (let i = 0; i < leadingEmptyCount; i++) cells.push(null)
  for (let day = 1; day <= lastDay; day++) cells.push(new Date(year, month, day))

  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export const formatDateStr = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Long day = single shift over 16 hours (not only the legacy double-shift band). */
export function isLongShift(timeRange: string): boolean {
  return getShiftDurationHours(timeRange) > LONG_SHIFT_HOURS_THRESHOLD
}

/** @deprecated Use isLongShift — kept for imports during transition */
export function isDoubleShift(timeRange: string): boolean {
  return isLongShift(timeRange)
}

/** Desktop palette class names (paired with ShiftCalendar injected styles). */
export function getShiftPaletteClass(timeOfDay: string, isSwapped: boolean, timeRange: string): string {
  if (isSwapped) return 'shift-swapped'
  if (isLongShift(timeRange)) return 'shift-double'
  switch (timeOfDay) {
    case 'morning':
      return 'shift-morning'
    case 'afternoon':
      return 'shift-afternoon'
    case 'evening':
      return 'shift-evening'
    default:
      return 'shift-day'
  }
}

/** Split roster range on ASCII/en/em hyphen for compact mobile stacking. */
export function splitShiftTimeRange(timeRange: string): { start: string; end: string | null } {
  const t = String(timeRange).trim()
  if (!t) return { start: '', end: null }
  const parts = t.split(/[-–—]/, 2)
  const head = parts[0]?.trim()
  if (parts.length >= 2 && head) {
    const tail = parts[1]?.trim() ?? ''
    return { start: head, end: tail || null }
  }
  return { start: t, end: null }
}

/** First segment of roster time — mobile tiles; full span in dialogs. */
export function getShiftGridStartTime(timeRange: string): string {
  return splitShiftTimeRange(timeRange).start
}

/** Mobile abbreviated shift line (NIGHT → NGT per product spec). */
export function getMobileShiftAbbrevLine(shift: Shift): string {
  if (shift.is_swapped) return 'SWAP'
  if (isLongShift(shift.time)) return 'LONG'
  const tod = getShiftTimeOfDay(shift.time)
  switch (tod) {
    case 'morning':
      return 'MORN'
    case 'afternoon':
      return 'AFTN'
    case 'evening':
    default:
      return 'NGT'
  }
}

/** Desktop legend / tile title wording. */
export function getDesktopShiftTileLabel(shift: Shift): string {
  if (shift.is_swapped) return 'SWAPPED'
  if (isLongShift(shift.time)) return 'LONG'
  const tod = getShiftTimeOfDay(shift.time)
  return tod.charAt(0).toUpperCase() + tod.slice(1)
}

export type MobileTilePalette =
  | 'morning'
  | 'afternoon'
  | 'evening'
  | 'double'
  | 'swapped'
  | 'leave'
  | 'off'

export function getMobileTilePalette(shift: Shift | null, isLeave: boolean): MobileTilePalette {
  if (isLeave) return 'leave'
  if (!shift) return 'off'
  if (shift.is_swapped) return 'swapped'
  if (isLongShift(shift.time)) return 'double'
  const tod = getShiftTimeOfDay(shift.time)
  switch (tod) {
    case 'morning':
      return 'morning'
    case 'afternoon':
      return 'afternoon'
    case 'evening':
    default:
      return 'evening'
  }
}
