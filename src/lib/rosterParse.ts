import { normalizeToDatabaseDate } from '@/lib/dates'

export const ROSTER_MONTH_MAP: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
}

/** Normalize PDF text before line-based roster parsing. */
export function coalesceRosterText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\t ]+\n/g, '\n')
    .replace(/\u00A0/g, ' ')
}

export function parseRosterYear(yearStr: string, referenceYear = new Date().getFullYear()): number | null {
  const parsed = parseInt(yearStr, 10)
  if (Number.isNaN(parsed)) return null

  const year = yearStr.length === 2 ? 2000 + parsed : parsed
  if (year < referenceYear - 2 || year > referenceYear + 2) return null
  return year
}

export function rosterPartsToDatabaseDate(
  dayStr: string,
  monthStr: string,
  yearStr: string,
  referenceYear = new Date().getFullYear()
): string | null {
  const month = ROSTER_MONTH_MAP[monthStr.toLowerCase().slice(0, 3)]
  const year = parseRosterYear(yearStr, referenceYear)
  const day = parseInt(dayStr, 10)
  if (!month || !year || Number.isNaN(day) || day < 1 || day > 31) return null

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** BA roster leave descriptors (Date Summary lines without times). */
export function isLeaveDescriptor(descriptor: string): boolean {
  const upper = descriptor.replace(/\s+/g, ' ').trim().toUpperCase()
  if (!upper) return false

  if (/^OFF\b|OFF\s*DAY|REST\s*DAY|STANDBY|SBY|TRAINING|TRG|BLANK/i.test(upper)) {
    return false
  }

  return (
    /LV\s*[-.]?\s*LEAVE/i.test(upper) ||
    /\bLEAVE\b/.test(upper) ||
    /^LV\b/.test(upper) ||
    /\bANNUAL\s+LEAVE\b/.test(upper) ||
    /\bAL\b/.test(upper) ||
    /\bHOLIDAY\b/.test(upper)
  )
}

const ROSTER_DATE_LINE =
  /(\d{1,2})-([A-Za-z]{3})-(\d{2,4})\s*[-–—:]\s*(.+?)(?=\s*\d{1,2}-[A-Za-z]{3}-|\n|$)/gi

const ROSTER_DATE_LINE_ANCHORED =
  /^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})\s*[-–—:]\s*(.+)$/i

export function extractLeaveDatesFromRosterText(text: string): string[] {
  const leaveDates: string[] = []
  const referenceYear = new Date().getFullYear()
  const coalesced = coalesceRosterText(text)

  const tryAdd = (dayStr: string, monthStr: string, yearStr: string) => {
    const dbDate = rosterPartsToDatabaseDate(dayStr, monthStr, yearStr, referenceYear)
    if (dbDate) leaveDates.push(normalizeToDatabaseDate(dbDate))
  }

  const lines = coalesced
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  for (const line of lines) {
    const match = line.match(ROSTER_DATE_LINE_ANCHORED)
    if (!match) continue
    const [, dayStr, monthStr, yearStr, descriptor] = match
    if (!isLeaveDescriptor(descriptor)) continue
    tryAdd(dayStr, monthStr, yearStr)
  }

  // PDFs often break lines; scan full text for date + leave descriptor pairs
  let globalMatch: RegExpExecArray | null
  ROSTER_DATE_LINE.lastIndex = 0
  while ((globalMatch = ROSTER_DATE_LINE.exec(coalesced)) !== null) {
    const [, dayStr, monthStr, yearStr, descriptor] = globalMatch
    if (!isLeaveDescriptor(descriptor)) continue
    tryAdd(dayStr, monthStr, yearStr)
  }

  // Compact form sometimes appears without spaces: "12-May-2025-LV LEAVE"
  const compactRe =
    /(\d{1,2})-([A-Za-z]{3})-(\d{2,4})-?\s*(LV\s*LEAVE|LEAVE|LV\b)/gi
  let compactMatch: RegExpExecArray | null
  while ((compactMatch = compactRe.exec(coalesced)) !== null) {
    const [, dayStr, monthStr, yearStr] = compactMatch
    tryAdd(dayStr, monthStr, yearStr)
  }

  return Array.from(new Set(leaveDates))
}
