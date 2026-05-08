import { getShiftTimeOfDay, type Shift } from '@/lib/shifts'

export const WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const

export const buildMonthGrid = (currentMonth: Date): Array<Date | null> => {
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0).getDate()
  const leadingEmptyCount = firstDay.getDay()
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

export function isDoubleShift(timeRange: string): boolean {
  return timeRange === '04:15-22:15'
}

/** Desktop palette class names (paired with ShiftCalendar injected styles). */
export function getShiftPaletteClass(timeOfDay: string, isSwapped: boolean, timeRange: string): string {
  if (isSwapped) return 'shift-swapped'
  if (isDoubleShift(timeRange)) return 'shift-double'
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

/** Mobile abbreviated shift line (NIGHT → NGT per product spec). */
export function getMobileShiftAbbrevLine(shift: Shift): string {
  if (shift.is_swapped) return 'SWAP'
  if (isDoubleShift(shift.time)) return 'LONG'
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
  if (isDoubleShift(shift.time)) return 'DOUBLE'
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
  if (isDoubleShift(shift.time)) return 'double'
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
