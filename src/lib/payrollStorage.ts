/** Persisted staff overtime rates and per pay-period inputs (local device). */

export interface OvertimeRates {
  normalRate: string
  sundayBankHolidayRate: string
}

export interface PeriodOvertimeHours {
  normalHours: string
  sundayBankHolidayHours: string
}

const RATES_KEY = 'aircrew_overtime_rates_v1'
const PERIOD_PREFIX = 'aircrew_payroll_period_v1_'

const defaultRates: OvertimeRates = { normalRate: '', sundayBankHolidayRate: '' }
const defaultHours: PeriodOvertimeHours = { normalHours: '', sundayBankHolidayHours: '' }

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
  if (!periodId) return { ...defaultHours }
  return readJson(`${PERIOD_PREFIX}${periodId}_ot`, defaultHours)
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

export function parsePositive(value: string): number {
  const n = parseFloat(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Normal OT at 1.5×; Sunday / bank holiday OT at 1⅔× (5/3). */
export function computeOvertimeBreakdown(
  normalHours: string,
  sundayBankHolidayHours: string,
  normalRate: string,
  sundayBankHolidayRate: string
) {
  const nh = parsePositive(normalHours)
  const sbh = parsePositive(sundayBankHolidayHours)
  const nr = parsePositive(normalRate)
  const sbr = parsePositive(sundayBankHolidayRate)

  const normalOvertimePay = nh * nr * 1.5
  const sundayBankHolidayPay = sbh * sbr * (5 / 3)
  const overtimePay = normalOvertimePay + sundayBankHolidayPay

  return {
    normalHours: nh,
    sundayBhHours: sbh,
    normalRate: nr,
    sundayBankHolidayRate: sbr,
    normalOvertimePay,
    sundayBankHolidayPay,
    overtimePay,
  }
}
