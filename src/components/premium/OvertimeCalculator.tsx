import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PremiumTotalsSummary } from './PremiumCalculator'
import { AddOvertimeShiftDialog } from './AddOvertimeShiftDialog'
import {
  computeOvertimeBreakdown,
  extraOvertimePay,
  extraPaidHours,
  extraTimeRange,
  loadOvertimeRates,
  loadPeriodOvertimeHours,
  removeOvertimeExtra,
  resolvedRateKind,
  saveOvertimeRates,
  type OvertimeExtra,
  type PeriodOvertimeHours,
} from '@/lib/payrollStorage'
import { deleteShift } from '@/lib/shifts'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useInvalidateShifts } from '@/hooks/useShifts'
import { Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

interface OvertimeCalculatorProps {
  summary: PremiumTotalsSummary | null
  onOvertimeChange?: (periodId: string, overtimePay: number) => void
}

export const OvertimeCalculator = ({ summary, onOvertimeChange }: OvertimeCalculatorProps) => {
  const periodId = summary?.periodId ?? ''
  const { data: currentUser } = useCurrentUser()
  const invalidateShifts = useInvalidateShifts()

  const [normalRate, setNormalRate] = useState('')
  const [sundayBankHolidayRate, setSundayBankHolidayRate] = useState('')
  const [periodOt, setPeriodOt] = useState<PeriodOvertimeHours>(() => loadPeriodOvertimeHours(''))
  const [addOpen, setAddOpen] = useState(false)

  const reloadPeriod = useCallback(() => {
    if (!periodId) return
    setPeriodOt(loadPeriodOvertimeHours(periodId))
  }, [periodId])

  useEffect(() => {
    const rates = loadOvertimeRates()
    setNormalRate(rates.normalRate)
    setSundayBankHolidayRate(rates.sundayBankHolidayRate)
  }, [])

  useEffect(() => {
    reloadPeriod()
  }, [reloadPeriod])

  const persistRates = useCallback((nextNormal: string, nextSundayBh: string) => {
    saveOvertimeRates({ normalRate: nextNormal, sundayBankHolidayRate: nextSundayBh })
  }, [])

  const rates = useMemo(
    () => ({ normalRate, sundayBankHolidayRate }),
    [normalRate, sundayBankHolidayRate]
  )

  const breakdown = useMemo(() => computeOvertimeBreakdown(periodOt, rates), [periodOt, rates])

  useEffect(() => {
    if (!periodId) return
    onOvertimeChange?.(periodId, breakdown.overtimePay)
  }, [periodId, breakdown.overtimePay, onOvertimeChange])

  const scheduledTotal = summary?.totalWithoutOvertime ?? 0
  const totalWithOvertime = scheduledTotal + breakdown.overtimePay
  const extras = [...(periodOt.extras ?? [])].sort((a, b) => a.date.localeCompare(b.date))

  const handleRemove = async (extra: OvertimeExtra) => {
    if (!periodId) return
    const removed = removeOvertimeExtra(periodId, extra.id)
    if (removed?.createdShift && removed.shiftId && currentUser?.id) {
      try {
        await deleteShift(removed.shiftId, currentUser.id)
        await invalidateShifts.mutateAsync()
      } catch {
        /* extra is already unlinked from pay */
      }
    }
    reloadPeriod()
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <Card className="bg-white shadow-md border border-gray-200">
        <CardHeader className="pb-3">
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
              Select a pay period on the <span className="font-semibold">Premiums</span> tab first.
            </p>
          )}

          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
              <div>
                <p className="text-xs uppercase text-gray-500">Base salary</p>
                <p className="text-lg font-semibold">£{summary.baseSalary.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Rostered premiums + leave</p>
                <p className="text-lg font-semibold">
                  £{(summary.premiumAmount + summary.leavePremium).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Scheduled total</p>
                <p className="text-lg font-semibold text-emerald-700">
                  £{summary.totalWithoutOvertime.toFixed(2)}
                </p>
              </div>
            </div>
          )}

          <p className="text-sm text-slate-600">
            Enter your overtime rates. Each extra is paid on top of rostered salary. Weekday extras use
            the normal rate; Sundays and bank holidays use the Sunday rate automatically. Paid hours are
            the shift length minus the unpaid break: 30 minutes at 6 hours or under, 1 hour when longer.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                placeholder="e.g. 30.00"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">Overtime extras this period</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!periodId}
                onClick={() => setAddOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add overtime shift
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Add extras on days off, or on top of a rostered shift (doubles). Double-day extras are
              paid at overtime rates only — their shift premium is excluded.
            </p>

            {extras.length === 0 && (
              <p className="text-sm text-slate-500 rounded-lg border border-dashed border-slate-200 p-4">
                No overtime extras in this period yet. Add one here or from a calendar day.
              </p>
            )}

            {extras.map((extra) => {
              const sunday = resolvedRateKind(extra) === 'sundayBh'
              const hours = extraPaidHours(extra)
              const pay = extraOvertimePay(extra, rates)
              const range = extraTimeRange(extra)
              return (
                <div
                  key={extra.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 p-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-semibold text-slate-900">
                      {extra.date
                        ? format(new Date(`${extra.date}T00:00:00`), 'EEE d MMM yyyy')
                        : 'No date'}
                    </p>
                    <p className="text-sm text-slate-600">
                      {range} · {hours.toFixed(2)}h paid · {sunday ? 'Sunday / BH' : 'Normal'} rate
                    </p>
                    <p className="text-xs text-slate-500">
                      No shift premium on this extra
                      {sunday ? ' (Sunday rate applied automatically)' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-slate-900">£{pay.toFixed(2)}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-slate-500 hover:text-red-600"
                      onClick={() => handleRemove(extra)}
                      aria-label="Remove overtime extra"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-600 mb-3">Overtime breakdown</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-700">
                  Normal ({breakdown.normalHours.toFixed(2)}h paid × £{breakdown.normalRate.toFixed(2)})
                </span>
                <span className="font-semibold text-slate-900">
                  £{breakdown.normalOvertimePay.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-700">
                  Sunday / bank holiday ({breakdown.sundayBhHours.toFixed(2)}h paid × £
                  {breakdown.sundayBankHolidayRate.toFixed(2)})
                </span>
                <span className="font-semibold text-slate-900">
                  £{breakdown.sundayBankHolidayPay.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="py-4">
                <p className="text-xs uppercase text-blue-700 mb-1">Overtime pay (this period)</p>
                <p className="text-2xl font-bold text-blue-900">£{breakdown.overtimePay.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="py-4 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase text-emerald-700 mb-1">Scheduled + overtime</p>
                  <p className="text-2xl font-bold text-emerald-900">£{totalWithOvertime.toFixed(2)}</p>
                </div>
                <Badge className="bg-emerald-600 text-white shrink-0">Period total</Badge>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <AddOvertimeShiftDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        dateIso={summary ? new Date().toISOString().slice(0, 10) : ''}
        staffId={currentUser?.id}
        allowPickDate
        onSaved={async () => {
          reloadPeriod()
          await invalidateShifts.mutateAsync()
        }}
      />
    </div>
  )
}

export default OvertimeCalculator
