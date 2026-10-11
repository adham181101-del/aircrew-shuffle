/** Persisted staff overtime rates and per pay-period inputs (local device). */

export interface OvertimeRates {
  normalRate: string
  sundayBankHolidayRate: string
}

export type OvertimeExtraKind = 'short' | 'full'
export type OvertimeRateKind = 'normal' | 'sundayBh'

export interface OvertimeExtra {
  id: string
  kind: OvertimeExtraKind
  /** Legacy; weekday vs Sunday is derived from `date` when present. */
  rateKind?: OvertimeRateKind
  /** YYYY-MM-DD */
  date: string
  /** Roster range `HH:MM-HH:MM` when the extra was added with times. */
  time?: string
  start?: string
  end?: string
  /** Linked calendar shift — its shift premiums are excluded. */
  shiftId?: string
  /** True when this extra created the calendar shift (safe to delete with the extra). */
  createdShift?: boolean
}

export interface PeriodOvertimeHours {
  /** Legacy duty-hour totals (converted to paid hours when no extras are listed). */
  normalHours: string
  sundayBankHolidayHours: string
  /** When true, OT pay is added on top of rostered pay and OT extras get no SP1–SP3. */
  addOnTopOfScheduled: boolean
  extras: OvertimeExtra[]
}

const RATES_KEY = 'aircrew_overtime_rates_v1'
const PERIOD_PREFIX = 'aircrew_payroll_period_v1_'

const defaultRates: OvertimeRates = { normalRate: '', sundayBankHolidayRate: '' }
const defaultHours: PeriodOvertimeHours = {
  normalHours: '',
  sundayBankHolidayHours: '',
  addOnTopOfScheduled: true,
  extras: [],
}

/** England & Wales bank holidays covering current BA pay calendars. */
const UK_BANK_HOLIDAYS = new Set([
  '2025-01-01',
  '2025-04-18',
  '2025-04-21',
  '2025-05-05',
  '2025-05-26',
  '2025-08-25',
  '2025-12-25',
  '2025-12-26',
  '2026-01-01',
  '2026-04-03',
  '2026-04-06',
  '2026-05-04',
  '2026-05-25',
  '2026-08-31',
  '2026-12-25',
  '2026-12-26',
  '2027-01-01',
  '2027-03-26',
  '2027-03-29',
  '2027-05-03',
  '2027-05-31',
  '2027-08-30',
  '2027-12-27',
  '2027-12-28',
])

export function newOvertimeExtraId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function isSundayOrBankHoliday(dateIso: string): boolean {
  if (!dateIso) return false
  if (UK_BANK_HOLIDAYS.has(dateIso)) return true
  const day = new Date(`${dateIso}T00:00:00`).getDay()
  return day === 0
}

export function rateKindForDate(dateIso: string): OvertimeRateKind {
  return isSundayOrBankHoliday(dateIso) ? 'sundayBh' : 'normal'
}

export function resolvedRateKind(extra: OvertimeExtra): OvertimeRateKind {
  if (extra.date) return rateKindForDate(extra.date)
  return extra.rateKind === 'sundayBh' ? 'sundayBh' : 'normal'
}

export function extraKindFromDutyHours(dutyHours: number): OvertimeExtraKind {
  return dutyHours <= OT_SHORT_DUTY_MAX_HOURS ? 'short' : 'full'
}

export function extraTimeRange(extra: OvertimeExtra): string {
  if (extra.time) return extra.time
  if (extra.start && extra.end) return `${extra.start}-${extra.end}`
  return extra.kind === 'full' ? '05:00-14:00' : '06:00-12:00'
}

/** Short extra (< 6h duty): 30 min unpaid break. */
export const OT_SHORT_PAID_HOURS = 5.5
/** Full extra (> 6h duty): 1h unpaid break on a 9h extra → 8h paid. */
export const OT_FULL_PAID_HOURS = 8
export const OT_SHORT_DUTY_MAX_HOURS = 6
export const OT_FULL_DUTY_HOURS = 9

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return { ...fallback, ...JSON.parse(raw) } as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore quota / private mode
  }
}

export function loadOvertimeRates(): OvertimeRates {
  return readJson(RATES_KEY, defaultRates)
}

export function saveOvertimeRates(rates: OvertimeRates): void {
  writeJson(RATES_KEY, rates)
}

export function loadPeriodOvertimeHours(periodId: string): PeriodOvertimeHours {
  if (!periodId) return { ...defaultHours, extras: [] }
  const loaded = readJson(`${PERIOD_PREFIX}${periodId}_ot`, defaultHours)
  return {
    ...defaultHours,
    ...loaded,
    extras: Array.isArray(loaded.extras) ? loaded.extras : [],
    addOnTopOfScheduled: loaded.addOnTopOfScheduled !== false,
  }
}

export function savePeriodOvertimeHours(periodId: string, hours: PeriodOvertimeHours): void {
  if (!periodId) return
  writeJson(`${PERIOD_PREFIX}${periodId}_ot`, hours)
}

export function loadPeriodBaseSalary(periodId: string): string {
  if (!periodId) return ''
  return readJson(`${PERIOD_PREFIX}${periodId}_salary`, { value: '' }).value ?? ''
}

export function savePeriodBaseSalary(periodId: string, value: string): void {
  if (!periodId) return
  writeJson(`${PERIOD_PREFIX}${periodId}_salary`, { value })
}

const PENSION_PREFIX = 'aircrew_pension_pct_v1_'

export function loadPensionDeductionPercent(staffId: string): string {
  if (!staffId) return '2'
  return readJson(`${PENSION_PREFIX}${staffId}`, { percent: '2' }).percent ?? '2'
}

export function savePensionDeductionPercent(staffId: string, percent: string): void {
  if (!staffId) return
  writeJson(`${PENSION_PREFIX}${staffId}`, { percent })
}

export function parsePositive(value: string): number {
  const n = parseFloat(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function paidHoursForOvertimeKind(kind: OvertimeExtraKind): number {
  return kind === 'short' ? OT_SHORT_PAID_HOURS : OT_FULL_PAID_HOURS
}

/** Unpaid break taken off duty length. 30 min at 6h or under; 1h when longer. */
export const OT_SHORT_UNPAID_HOURS = 0.5
export const OT_FULL_UNPAID_HOURS = 1

/**
 * Paid hours for one overtime extra: clock time minus the unpaid break.
 * 6 hours or under: deduct 30 minutes (a 6h duty pays 5.5h).
 * Over 6 hours: deduct 1 hour (04:15–12:30 is 8.25h duty → 7.25h paid).
 */
export function overtimePaidHoursForDuty(dutyHours: number): number {
  if (!Number.isFinite(dutyHours) || dutyHours <= 0) return 0
  const unpaid = dutyHours <= OT_SHORT_DUTY_MAX_HOURS ? OT_SHORT_UNPAID_HOURS : OT_FULL_UNPAID_HOURS
  const paidMinutes = Math.round((dutyHours - unpaid) * 60)
  return Math.max(0, paidMinutes / 60)
}

/** Same break rule when a period only has a lump of duty hours. */
export function overtimePaidHoursFromDutyTotal(dutyHours: number): number {
  return overtimePaidHoursForDuty(dutyHours)
}

export function overtimeExtraDates(hours: PeriodOvertimeHours): Set<string> {
  const dates = new Set<string>()
  for (const extra of hours.extras ?? []) {
    if (extra.date) dates.add(extra.date)
  }
  return dates
}

/** Duty length from a `HH:MM-HH:MM` range (overnight supported). */
export function dutyHoursFromTimeRange(timeRange: string): number {
  const [start, end] = timeRange.split('-')
  if (!start || !end) return 0
  const toMin = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10))
    if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN
    return h * 60 + m
  }
  const startMin = toMin(start)
  let endMin = toMin(end)
  if (!Number.isFinite(startMin) || !Number.isFinite(endMin)) return 0
  if (endMin <= startMin) endMin += 24 * 60
  return (endMin - startMin) / 60
}

/**
 * Calendar shifts that are overtime extras (so SP1–SP3 can be omitted).
 * Rostered shifts on the same day keep their early-hour premiums.
 */
export function overtimeExtraShiftIds(
  extras: OvertimeExtra[],
  shifts: Array<{ id: string; date: string; time: string }>
): Set<string> {
  const ids = new Set<string>()
  const claimed = new Set<string>()
  const unmatched: OvertimeExtra[] = []

  for (const extra of extras ?? []) {
    if (extra.shiftId) {
      ids.add(extra.shiftId)
      claimed.add(extra.shiftId)
    } else if (extra.date) {
      unmatched.push(extra)
    }
  }

  const extrasByDate = new Map<string, OvertimeExtra[]>()
  for (const extra of unmatched) {
    const list = extrasByDate.get(extra.date) ?? []
    list.push(extra)
    extrasByDate.set(extra.date, list)
  }

  for (const [date, dateExtras] of extrasByDate) {
    const dayShifts = shifts
      .filter((shift) => shift.date === date && !claimed.has(shift.id))
      .map((shift) => ({ ...shift, hours: dutyHoursFromTimeRange(shift.time) }))
      .sort((a, b) => a.time.localeCompare(b.time))

    for (const extra of dateExtras) {
      const unused = dayShifts.filter((shift) => !claimed.has(shift.id))
      if (unused.length === 0) break

      const wantShort = extra.kind === 'short'
      const scored = unused.map((shift, index) => {
        const durationMatch = wantShort
          ? shift.hours <= OT_SHORT_DUTY_MAX_HOURS
          : shift.hours > OT_SHORT_DUTY_MAX_HOURS
        return { shift, score: (durationMatch ? 2 : 0) + index }
      })
      scored.sort((a, b) => b.score - a.score)
      const chosen = scored[0].shift
      claimed.add(chosen.id)
      ids.add(chosen.id)
    }
  }

  return ids
}

function paidHoursFromExtras(extras: OvertimeExtra[], rateKind: OvertimeRateKind): number {
  return extras
    .filter((extra) => resolvedRateKind(extra) === rateKind)
    .reduce((sum, extra) => sum + extraPaidHours(extra), 0)
}

export function extraPaidHours(extra: OvertimeExtra): number {
  const range = extra.time || (extra.start && extra.end ? `${extra.start}-${extra.end}` : '')
  if (range) return overtimePaidHoursForDuty(dutyHoursFromTimeRange(range))
  return paidHoursForOvertimeKind(extra.kind)
}

/** OT pay uses paid hours after unpaid breaks, not rostered duty length. */
export function computeOvertimeBreakdown(period: PeriodOvertimeHours, rates: OvertimeRates) {
  const extras = period.extras ?? []
  const useExtras = extras.length > 0
  const nr = parsePositive(rates.normalRate)
  const sbr = parsePositive(rates.sundayBankHolidayRate)

  const normalPaidHours = useExtras
    ? paidHoursFromExtras(extras, 'normal')
    : overtimePaidHoursFromDutyTotal(parsePositive(period.normalHours))
  const sundayBhPaidHours = useExtras
    ? paidHoursFromExtras(extras, 'sundayBh')
    : overtimePaidHoursFromDutyTotal(parsePositive(period.sundayBankHolidayHours))

  const normalOvertimePay = normalPaidHours * nr
  const sundayBankHolidayPay = sundayBhPaidHours * sbr
  const overtimePay = normalOvertimePay + sundayBankHolidayPay

  return {
    normalHours: normalPaidHours,
    sundayBhHours: sundayBhPaidHours,
    normalRate: nr,
    sundayBankHolidayRate: sbr,
    normalOvertimePay,
    sundayBankHolidayPay,
    overtimePay,
    addOnTopOfScheduled: period.addOnTopOfScheduled !== false,
    extras,
  }
}

export function extraOvertimePay(extra: OvertimeExtra, rates: OvertimeRates): number {
  const hours = extraPaidHours(extra)
  const rate =
    resolvedRateKind(extra) === 'sundayBh'
      ? parsePositive(rates.sundayBankHolidayRate)
      : parsePositive(rates.normalRate)
  return hours * rate
}

export function appendOvertimeExtra(periodId: string, extra: OvertimeExtra): void {
  const period = loadPeriodOvertimeHours(periodId)
  savePeriodOvertimeHours(periodId, {
    ...period,
    addOnTopOfScheduled: true,
    extras: [...(period.extras ?? []), extra],
  })
}

export function removeOvertimeExtra(periodId: string, extraId: string): OvertimeExtra | null {
  const period = loadPeriodOvertimeHours(periodId)
  const extras = period.extras ?? []
  const removed = extras.find((extra) => extra.id === extraId) ?? null
  savePeriodOvertimeHours(periodId, {
    ...period,
    extras: extras.filter((extra) => extra.id !== extraId),
  })
  return removed
}

export function loadAllOvertimeExtras(periodIds: string[]): OvertimeExtra[] {
  return periodIds.flatMap((id) => loadPeriodOvertimeHours(id).extras ?? [])
}
