import { normalizeToDatabaseDate } from '@/lib/dates'
import { normalizeTimeRange } from '@/lib/shifts'

export type RosterShiftEntry = { date: string; time: string }

export type RosterShiftChange = {
  date: string
  fromTime: string
  toTime: string
}

export type RosterDiff = {
  added: RosterShiftEntry[]
  removed: RosterShiftEntry[]
  changed: RosterShiftChange[]
  unchanged: number
  leaveAdded: string[]
  leaveRemoved: string[]
}

function normalizeShiftTime(time: string): string {
  return normalizeTimeRange(time) ?? time.trim()
}

/** Dedupe PDF shifts: last occurrence per date wins. */
export function dedupeShiftsByDate(shifts: RosterShiftEntry[]): RosterShiftEntry[] {
  const byDate = new Map<string, string>()
  for (const shift of shifts) {
    byDate.set(shift.date, shift.time)
  }
  return Array.from(byDate.entries())
    .map(([date, time]) => ({ date, time }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function computeRosterDiff(
  existingShifts: RosterShiftEntry[],
  incomingShifts: RosterShiftEntry[],
  existingLeaveDates: string[] = [],
  incomingLeaveDates: string[] = []
): RosterDiff {
  const existingMap = new Map<string, string>()
  for (const s of existingShifts) {
    existingMap.set(s.date, normalizeShiftTime(s.time))
  }

  const incomingMap = new Map<string, string>()
  for (const s of dedupeShiftsByDate(incomingShifts)) {
    incomingMap.set(s.date, normalizeShiftTime(s.time))
  }

  const added: RosterShiftEntry[] = []
  const removed: RosterShiftEntry[] = []
  const changed: RosterShiftChange[] = []
  let unchanged = 0

  for (const [date, time] of incomingMap) {
    if (!existingMap.has(date)) {
      added.push({ date, time })
    } else if (existingMap.get(date) !== time) {
      changed.push({ date, fromTime: existingMap.get(date)!, toTime: time })
    } else {
      unchanged++
    }
  }

  for (const [date, time] of existingMap) {
    if (!incomingMap.has(date)) {
      removed.push({ date, time })
    }
  }

  const existingLeave = new Set(existingLeaveDates.map((d) => normalizeToDatabaseDate(d)))
  const incomingLeave = new Set(incomingLeaveDates.map((d) => normalizeToDatabaseDate(d)))
  const leaveAdded = incomingLeaveDates
    .map((d) => normalizeToDatabaseDate(d))
    .filter((d) => !existingLeave.has(d))
    .sort()
  const leaveRemoved = existingLeaveDates
    .map((d) => normalizeToDatabaseDate(d))
    .filter((d) => !incomingLeave.has(d))
    .sort()

  return {
    added: added.sort((a, b) => a.date.localeCompare(b.date)),
    removed: removed.sort((a, b) => a.date.localeCompare(b.date)),
    changed: changed.sort((a, b) => a.date.localeCompare(b.date)),
    unchanged,
    leaveAdded,
    leaveRemoved,
  }
}

export function formatRosterDiffSummary(diff: RosterDiff): string {
  const parts: string[] = []

  if (diff.changed.length > 0) {
    parts.push(
      `${diff.changed.length} shift${diff.changed.length === 1 ? '' : 's'} changed`
    )
  }
  if (diff.removed.length > 0) {
    parts.push(
      `${diff.removed.length} shift${diff.removed.length === 1 ? '' : 's'} removed`
    )
  }
  if (diff.added.length > 0) {
    parts.push(`${diff.added.length} shift${diff.added.length === 1 ? '' : 's'} added`)
  }
  if (diff.leaveAdded.length > 0) {
    parts.push(
      `${diff.leaveAdded.length} leave day${diff.leaveAdded.length === 1 ? '' : 's'} added`
    )
  }
  if (diff.leaveRemoved.length > 0) {
    parts.push(
      `${diff.leaveRemoved.length} leave day${diff.leaveRemoved.length === 1 ? '' : 's'} removed`
    )
  }

  if (parts.length === 0) {
    return diff.unchanged > 0
      ? `No changes — ${diff.unchanged} shift${diff.unchanged === 1 ? '' : 's'} match your current roster`
      : 'No changes detected'
  }

  return parts.join(', ')
}

export function rosterDiffHasChanges(diff: RosterDiff): boolean {
  return (
    diff.added.length > 0 ||
    diff.removed.length > 0 ||
    diff.changed.length > 0 ||
    diff.leaveAdded.length > 0 ||
    diff.leaveRemoved.length > 0
  )
}

export function formatShiftDate(dateIso: string): string {
  const [y, m, d] = dateIso.split('-').map(Number)
  if (!y || !m || !d) return dateIso
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
