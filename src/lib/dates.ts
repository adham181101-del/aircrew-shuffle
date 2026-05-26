/** Parse YYYY-MM-DD (or DD/MM/YYYY) as local midnight — avoids UTC off-by-one in UI. */
export function parseLocalDate(dateStr: string): Date {
  const trimmed = dateStr.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('/').map(Number)
    return new Date(year, month - 1, day)
  }
  const fallback = new Date(trimmed)
  return Number.isNaN(fallback.getTime()) ? new Date() : fallback
}

export function toDatabaseDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function normalizeToDatabaseDate(dateStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    return dateStr.trim()
  }
  const [dayStr, monthStr, yearStr] = dateStr.split('/')
  return `${yearStr}-${monthStr.padStart(2, '0')}-${dayStr.padStart(2, '0')}`
}

export function getTodayDatabaseDate(): string {
  return toDatabaseDate(new Date())
}

/** Compare two database date strings (YYYY-MM-DD). */
export function compareDatabaseDates(a: string, b: string): number {
  return normalizeToDatabaseDate(a).localeCompare(normalizeToDatabaseDate(b))
}

export function formatDateGB(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  return parseLocalDate(normalizeToDatabaseDate(dateStr)).toLocaleDateString('en-GB', options)
}

export function isPastDatabaseDate(dateStr: string): boolean {
  const today = parseLocalDate(getTodayDatabaseDate())
  today.setHours(0, 0, 0, 0)
  const d = parseLocalDate(normalizeToDatabaseDate(dateStr))
  d.setHours(0, 0, 0, 0)
  return d < today
}

export function isSameCalendarMonth(dateStr: string, month: Date): boolean {
  const d = parseLocalDate(normalizeToDatabaseDate(dateStr))
  return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear()
}
