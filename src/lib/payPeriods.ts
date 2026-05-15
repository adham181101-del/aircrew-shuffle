/** BA-style pay periods: work window → salary paid in the matching calendar month (period id = YYYY-MM). */

export interface PayPeriod {
  id: string
  label: string
  start: Date
  end: Date
  weeks: 4 | 5
}

export const PREMIUM_PERIODS_2026: PayPeriod[] = [
  { id: '2026-01', label: '7 Dec 2025 - 10 Jan 2026', start: new Date('2025-12-07'), end: new Date('2026-01-10'), weeks: 5 },
  { id: '2026-02', label: '11 Jan - 7 Feb 2026', start: new Date('2026-01-11'), end: new Date('2026-02-07'), weeks: 4 },
  { id: '2026-03', label: '8 Feb - 14 Mar 2026', start: new Date('2026-02-08'), end: new Date('2026-03-14'), weeks: 5 },
  { id: '2026-04', label: '15 Mar - 11 Apr 2026', start: new Date('2026-03-15'), end: new Date('2026-04-11'), weeks: 4 },
  { id: '2026-05', label: '12 Apr - 9 May 2026', start: new Date('2026-04-12'), end: new Date('2026-05-09'), weeks: 4 },
  { id: '2026-06', label: '10 May - 13 Jun 2026', start: new Date('2026-05-10'), end: new Date('2026-06-13'), weeks: 5 },
  { id: '2026-07', label: '14 Jun - 11 Jul 2026', start: new Date('2026-06-14'), end: new Date('2026-07-11'), weeks: 4 },
  { id: '2026-08', label: '12 Jul - 8 Aug 2026', start: new Date('2026-07-12'), end: new Date('2026-08-08'), weeks: 4 },
  { id: '2026-09', label: '9 Aug - 12 Sep 2026', start: new Date('2026-08-09'), end: new Date('2026-09-12'), weeks: 5 },
  { id: '2026-10', label: '13 Sep - 10 Oct 2026', start: new Date('2026-09-13'), end: new Date('2026-10-10'), weeks: 4 },
  { id: '2026-11', label: '11 Oct - 7 Nov 2026', start: new Date('2026-10-11'), end: new Date('2026-11-07'), weeks: 4 },
  { id: '2026-12', label: '8 Nov - 5 Dec 2026', start: new Date('2026-11-08'), end: new Date('2026-12-05'), weeks: 4 },
]

/** Which work period a calendar date falls in (for shift premium tallies). */
export function findWorkPeriodForDate(date: Date): PayPeriod | null {
  const shiftDate = new Date(date)
  shiftDate.setHours(0, 0, 0, 0)

  for (const period of PREMIUM_PERIODS_2026) {
    const periodStart = new Date(period.start)
    periodStart.setHours(0, 0, 0, 0)
    const periodEnd = new Date(period.end)
    periodEnd.setHours(23, 59, 59, 999)

    if (shiftDate >= periodStart && shiftDate <= periodEnd) {
      return period
    }
  }
  return null
}

/**
 * Default period for premiums/overtime UI: the pay cycle you are about to be paid in
 * (period id = paid month, e.g. May 2026 → `2026-05`), not the next work block on the calendar.
 */
export function getDefaultPayPeriod(date = new Date()): PayPeriod {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const byPayMonth = PREMIUM_PERIODS_2026.find((p) => p.id === `${y}-${m}`)
  if (byPayMonth) return byPayMonth

  const inWork = findWorkPeriodForDate(date)
  if (inWork) return inWork

  return PREMIUM_PERIODS_2026[PREMIUM_PERIODS_2026.length - 1]
}

/** Human label for the salary month (period id `2026-05` → May 2026). */
export function getPayMonthLabel(periodId: string): string {
  const [yearStr, monthStr] = periodId.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)
  if (!Number.isFinite(year) || !Number.isFinite(month)) return periodId
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}
