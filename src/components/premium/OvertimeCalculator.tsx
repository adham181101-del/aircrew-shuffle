import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { PremiumTotalsSummary } from './PremiumCalculator'
import {
  computeOvertimeBreakdown,
  loadOvertimeRates,
  loadPeriodOvertimeHours,
  saveOvertimeRates,
  savePeriodOvertimeHours,
} from '@/lib/payrollStorage'

interface OvertimeCalculatorProps {
  summary: PremiumTotalsSummary | null
  onOvertimeChange?: (periodId: string, overtimePay: number) => void
}

export const OvertimeCalculator = ({ summary, onOvertimeChange }: OvertimeCalculatorProps) => {
  const periodId = summary?.periodId ?? ''

  const [normalRate, setNormalRate] = useState('')
  const [sundayBankHolidayRate, setSundayBankHolidayRate] = useState('')
  const [normalOvertimeHours, setNormalOvertimeHours] = useState('')
  const [sundayBankHolidayHours, setSundayBankHolidayHours] = useState('')

  useEffect(() => {
    const rates = loadOvertimeRates()
    setNormalRate(rates.normalRate)
    setSundayBankHolidayRate(rates.sundayBankHolidayRate)
  }, [])

  useEffect(() => {
    if (!periodId) return
    const hours = loadPeriodOvertimeHours(periodId)
    setNormalOvertimeHours(hours.normalHours)
    setSundayBankHolidayHours(hours.sundayBankHolidayHours)
  }, [periodId])

  const persistRates = useCallback((nextNormal: string, nextSundayBh: string) => {
    saveOvertimeRates({ normalRate: nextNormal, sundayBankHolidayRate: nextSundayBh })
  }, [])

  const persistHours = useCallback(
    (nextNormalHours: string, nextSundayBhHours: string) => {
      if (!periodId) return
      savePeriodOvertimeHours(periodId, {
        normalHours: nextNormalHours,
        sundayBankHolidayHours: nextSundayBhHours,
      })
    },
    [periodId]
  )

  const breakdown = useMemo(
    () =>
      computeOvertimeBreakdown(
        normalOvertimeHours,
        sundayBankHolidayHours,
        normalRate,
        sundayBankHolidayRate
      ),
    [normalOvertimeHours, sundayBankHolidayHours, normalRate, sundayBankHolidayRate]
  )

  useEffect(() => {
    if (!periodId) return
    onOvertimeChange?.(periodId, breakdown.overtimePay)
  }, [periodId, breakdown.overtimePay, onOvertimeChange])

  const totalWithOvertime = useMemo(() => {
    if (!summary) return breakdown.overtimePay
    return summary.totalWithoutOvertime + breakdown.overtimePay
  }, [summary, breakdown.overtimePay])

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-md border border-gray-200">
        <CardHeader>
          <CardTitle>Overtime Calculator</CardTitle>
          {summary?.periodLabel && (
            <p className="text-sm text-gray-600">
              Pay period: <span className="font-semibold">{summary.periodLabel}</span>
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!summary && (
            <p className="text-sm text-gray-600">
              Select a pay period on the <span className="font-semibold">Premiums</span> tab first. Your
              saved rates and hours for that period will load here automatically.
            </p>
          )}

          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs uppercase text-gray-500">Base salary</p>
                <p className="text-lg font-semibold">£{summary.baseSalary.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Premiums + leave</p>
                <p className="text-lg font-semibold">
                  £{(summary.premiumAmount + summary.leavePremium).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Total before overtime</p>
                <p className="text-lg font-semibold text-emerald-700">
                  £{summary.totalWithoutOvertime.toFixed(2)}
                </p>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-600">
            Your normal and Sunday / bank holiday rates are saved on this device and reused each month.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Normal overtime rate (£/hour)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={normalRate}
                onChange={(e) => {
                  setNormalRate(e.target.value)
                  persistRates(e.target.value, sundayBankHolidayRate)
                }}
                placeholder="e.g. 22.50"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Sunday / bank holiday rate (£/hour)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={sundayBankHolidayRate}
                onChange={(e) => {
                  setSundayBankHolidayRate(e.target.value)
                  persistRates(normalRate, e.target.value)
                }}
                placeholder="e.g. 22.50"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Normal overtime hours
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={normalOvertimeHours}
                onChange={(e) => {
                  setNormalOvertimeHours(e.target.value)
                  persistHours(e.target.value, sundayBankHolidayHours)
                }}
                placeholder="e.g. 8"
                disabled={!periodId}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Sunday / bank holiday hours
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={sundayBankHolidayHours}
                onChange={(e) => {
                  setSundayBankHolidayHours(e.target.value)
                  persistHours(normalOvertimeHours, e.target.value)
                }}
                placeholder="e.g. 6"
                disabled={!periodId}
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-600 mb-3">Overtime breakdown</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-700">
                  Normal ({breakdown.normalHours.toFixed(2)}h × £{breakdown.normalRate.toFixed(2)})
                </span>
                <span className="font-semibold text-slate-900">
                  £{breakdown.normalOvertimePay.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-700">
                  Sunday / bank holiday ({breakdown.sundayBhHours.toFixed(2)}h × £
                  {breakdown.sundayBankHolidayRate.toFixed(2)})
                </span>
                <span className="font-semibold text-slate-900">
                  £{breakdown.sundayBankHolidayPay.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="py-4">
                <p className="text-xs uppercase text-blue-700 mb-1">Overtime pay (this period)</p>
                <p className="text-2xl font-bold text-blue-900">£{breakdown.overtimePay.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase text-emerald-700 mb-1">Total including overtime</p>
                  <p className="text-2xl font-bold text-emerald-900">£{totalWithOvertime.toFixed(2)}</p>
                </div>
                <Badge className="bg-emerald-600 text-white">Period total</Badge>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default OvertimeCalculator
