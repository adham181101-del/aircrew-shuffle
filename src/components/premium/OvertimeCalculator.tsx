import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { PremiumTotalsSummary } from './PremiumCalculator'

interface OvertimeCalculatorProps {
  summary: PremiumTotalsSummary | null
}

export const OvertimeCalculator = ({ summary }: OvertimeCalculatorProps) => {
  const [overtimeHours, setOvertimeHours] = useState<string>('')
  const [overtimeRate, setOvertimeRate] = useState<string>('')

  const overtimePay = useMemo(() => {
    const hours = parseFloat(overtimeHours)
    const rate = parseFloat(overtimeRate)
    if (!Number.isFinite(hours) || hours <= 0 || !Number.isFinite(rate) || rate <= 0) return 0
    return hours * rate
  }, [overtimeHours, overtimeRate])

  const totalWithOvertime = useMemo(() => {
    if (!summary) return overtimePay
    return summary.totalWithoutOvertime + overtimePay
  }, [summary, overtimePay])

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
              <label className="text-sm font-medium text-gray-700 mb-1 block">Overtime hours</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={overtimeHours}
                onChange={(e) => setOvertimeHours(e.target.value)}
                placeholder="e.g. 12.5"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Overtime rate (£/hour)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={overtimeRate}
                onChange={(e) => setOvertimeRate(e.target.value)}
                placeholder="e.g. 22.50"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="py-4">
                <p className="text-xs uppercase text-blue-700 mb-1">Overtime pay</p>
                <p className="text-2xl font-bold text-blue-900">£{overtimePay.toFixed(2)}</p>
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


