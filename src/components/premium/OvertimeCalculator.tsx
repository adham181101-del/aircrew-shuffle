import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { PremiumTotalsSummary } from './PremiumCalculator'

interface OvertimeCalculatorProps {
  summary: PremiumTotalsSummary | null
}

export const OvertimeCalculator = ({ summary }: OvertimeCalculatorProps) => {
  const [baseHourlyRate, setBaseHourlyRate] = useState<string>('')
  const [normalOvertimeHours, setNormalOvertimeHours] = useState<string>('')
  const [sundayBankHolidayHours, setSundayBankHolidayHours] = useState<string>('')
  const [bankHolidayOvertimeHours, setBankHolidayOvertimeHours] = useState<string>('')
  const [bankHolidayExtraPremiumPerHour, setBankHolidayExtraPremiumPerHour] = useState<string>('')

  const breakdown = useMemo(() => {
    const parsedRate = parseFloat(baseHourlyRate)
    const parsedNormalHours = parseFloat(normalOvertimeHours)
    const parsedSundayBhHours = parseFloat(sundayBankHolidayHours)
    const parsedBankHolidayHours = parseFloat(bankHolidayOvertimeHours)
    const parsedBankHolidayPremium = parseFloat(bankHolidayExtraPremiumPerHour)

    const rate = Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : 0
    const normalHours = Number.isFinite(parsedNormalHours) && parsedNormalHours > 0 ? parsedNormalHours : 0
    const sundayBhHours = Number.isFinite(parsedSundayBhHours) && parsedSundayBhHours > 0 ? parsedSundayBhHours : 0
    const bankHolidayHours = Number.isFinite(parsedBankHolidayHours) && parsedBankHolidayHours > 0 ? parsedBankHolidayHours : 0
    const bankHolidayPremiumPerHour =
      Number.isFinite(parsedBankHolidayPremium) && parsedBankHolidayPremium > 0 ? parsedBankHolidayPremium : 0

    const normalOvertimePay = normalHours * rate * 1.5
    const sundayBankHolidayPay = sundayBhHours * rate * (5 / 3)
    const bankHolidayPremiumPay = bankHolidayHours * bankHolidayPremiumPerHour
    const overtimePay = normalOvertimePay + sundayBankHolidayPay + bankHolidayPremiumPay

    return {
      rate,
      normalHours,
      sundayBhHours,
      bankHolidayHours,
      bankHolidayPremiumPerHour,
      normalOvertimePay,
      sundayBankHolidayPay,
      bankHolidayPremiumPay,
      overtimePay,
    }
  }, [
    baseHourlyRate,
    normalOvertimeHours,
    sundayBankHolidayHours,
    bankHolidayOvertimeHours,
    bankHolidayExtraPremiumPerHour,
  ])

  const totalWithOvertime = useMemo(() => {
    if (!summary) return breakdown.overtimePay
    return summary.totalWithoutOvertime + breakdown.overtimePay
  }, [summary, breakdown.overtimePay])

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-md border border-gray-200">
        <CardHeader>
          <CardTitle>Overtime Calculator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!summary && (
            <p className="text-sm text-gray-600">
              Select a pay period and enter your base salary on the <span className="font-semibold">Premiums</span> tab
              first. Your premiums and leave will appear here automatically.
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Base hourly rate (£/hour)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={baseHourlyRate}
                onChange={(e) => setBaseHourlyRate(e.target.value)}
                placeholder="e.g. 22.50"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Normal overtime hours (1.5x)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={normalOvertimeHours}
                onChange={(e) => setNormalOvertimeHours(e.target.value)}
                placeholder="e.g. 8"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Sunday + Bank Holiday hours (1⅔x)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={sundayBankHolidayHours}
                onChange={(e) => setSundayBankHolidayHours(e.target.value)}
                placeholder="e.g. 6"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Bank Holiday OT hours (extra premium)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={bankHolidayOvertimeHours}
                onChange={(e) => setBankHolidayOvertimeHours(e.target.value)}
                placeholder="e.g. 4"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Bank Holiday extra premium (£/hour)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={bankHolidayExtraPremiumPerHour}
                onChange={(e) => setBankHolidayExtraPremiumPerHour(e.target.value)}
                placeholder="e.g. 5.00"
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-600 mb-3">Overtime breakdown</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-700">Normal overtime ({breakdown.normalHours.toFixed(2)}h x £{breakdown.rate.toFixed(2)} x 1.5)</span>
                <span className="font-semibold text-slate-900">£{breakdown.normalOvertimePay.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-700">Sunday/Bank Holiday ({breakdown.sundayBhHours.toFixed(2)}h x £{breakdown.rate.toFixed(2)} x 1.667)</span>
                <span className="font-semibold text-slate-900">£{breakdown.sundayBankHolidayPay.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-700">Bank Holiday extra ({breakdown.bankHolidayHours.toFixed(2)}h x £{breakdown.bankHolidayPremiumPerHour.toFixed(2)})</span>
                <span className="font-semibold text-slate-900">£{breakdown.bankHolidayPremiumPay.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="py-4">
                <p className="text-xs uppercase text-blue-700 mb-1">Overtime pay</p>
                <p className="text-2xl font-bold text-blue-900">£{breakdown.overtimePay.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase text-emerald-700 mb-1">Total including overtime</p>
                  <p className="text-2xl font-bold text-emerald-900">£{totalWithOvertime.toFixed(2)}</p>
                </div>
                <Badge className="bg-emerald-600 text-white">Monthly total</Badge>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default OvertimeCalculator


