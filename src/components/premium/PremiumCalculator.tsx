import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getUserShifts, type Shift, getShiftTimeOfDay } from '@/lib/shifts'
import { getCurrentUser } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'
import { Calendar, DollarSign, TrendingUp, Clock } from 'lucide-react'

interface PayPeriod {
  month: string
  cutoffDate: string
  payDate: string
}

// BA Pay Calendar 2025 data from your image
const PAY_CALENDAR_2025: PayPeriod[] = [
  { month: 'Jan-25', cutoffDate: '2025-01-15', payDate: '2025-01-30' },
  { month: 'Feb-25', cutoffDate: '2025-02-12', payDate: '2025-02-27' },
  { month: 'Mar-25', cutoffDate: '2025-03-13', payDate: '2025-03-28' },
  { month: 'Apr-25', cutoffDate: '2025-04-10', payDate: '2025-04-29' },
  { month: 'May-25', cutoffDate: '2025-05-12', payDate: '2025-05-29' },
  { month: 'Jun-25', cutoffDate: '2025-06-12', payDate: '2025-06-27' },
  { month: 'Jul-25', cutoffDate: '2025-07-14', payDate: '2025-07-30' },
  { month: 'Aug-25', cutoffDate: '2025-08-11', payDate: '2025-08-28' },
  { month: 'Sep-25', cutoffDate: '2025-09-12', payDate: '2025-09-29' },
  { month: 'Oct-25', cutoffDate: '2025-10-15', payDate: '2025-10-30' },
  { month: 'Nov-25', cutoffDate: '2025-11-12', payDate: '2025-11-27' },
  { month: 'Dec-25', cutoffDate: '2025-12-08', payDate: '2025-12-24' }
]

// Aviation shift fixed allowances (£) based on provided table
const AVIATION_PREMIUMS = {
  shift_premium_1: { amount: 26.99, description: 'Shift Premium 1: start before 04:59 or end 00:00–02:59' },
  shift_premium_2: { amount: 15.43, description: 'Shift Premium 2: start 05:00–05:59 or end 22:30–23:59' },
  shift_premium_3: { amount: 7.70, description: 'Shift Premium 3: start 06:00–06:59 or end 21:00–22:29' },
  night_shift: { amount: 36.26, description: 'Night Shift: ≥3 continuous hours between 00:00–05:00' },
  saturday: { amount: 9.0, description: 'Saturday: any shift starting on Saturday' },
  sunday: { amount: 17.99, description: 'Sunday: any shift starting on Sunday' },
  day_shift: { amount: 0.0, description: 'Day Shift: start/end between 07:00–20:59' },
  average_shift_pay: { amount: 16.77, description: 'Average Shift Pay (annual leave/training anomaly)' }
}

interface PremiumShift {
  shift: Shift
  premiumLabels: string[]
  baseHours: number
  premiumAmount: number
  lineItems: Array<{ label: string; amount: number }>
}

export const PremiumCalculator = () => {
  const { toast } = useToast()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')
  const [premiumShifts, setPremiumShifts] = useState<PremiumShift[]>([])
  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState({
    totalShifts: 0,
    totalPremiumAmount: 0,
    totalHours: 0
  })

  useEffect(() => {
    loadShifts()
  }, [])

  useEffect(() => {
    if (selectedPeriod && shifts.length > 0) {
      calculatePremiums()
    }
  }, [selectedPeriod, shifts])

  const loadShifts = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) return

      const userShifts = await getUserShifts(user.id)
      setShifts(userShifts)
      
      // Auto-select current month if available
      const currentMonth = new Date().toISOString().slice(0, 7)
      const currentPeriod = PAY_CALENDAR_2025.find(p => 
        p.cutoffDate.startsWith(currentMonth)
      )
      if (currentPeriod) {
        setSelectedPeriod(currentPeriod.month)
      }
    } catch (error) {
      toast({
        title: "Error loading shifts",
        description: "Could not load shift data for premium calculation",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateShiftHours = (timeRange: string): number => {
    const [start, end] = timeRange.split('-')
    const startTime = new Date(`2000-01-01 ${start}:00`)
    const endTime = new Date(`2000-01-01 ${end}:00`)
    
    // Handle overnight shifts
    if (endTime < startTime) {
      endTime.setDate(endTime.getDate() + 1)
    }
    
    return (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
  }

  // Convert HH:MM to minutes since 00:00
  const toMinutes = (hhmm: string): number => {
    const [h, m] = hhmm.split(':').map(n => parseInt(n, 10))
    return h * 60 + m
  }

  // Calculate overlap in minutes between [aStart, aEnd) and [bStart, bEnd)
  const overlapMinutes = (aStart: number, aEnd: number, bStart: number, bEnd: number): number => {
    const start = Math.max(aStart, bStart)
    const end = Math.min(aEnd, bEnd)
    return Math.max(0, end - start)
  }

  const determineShiftAllowances = (
    shift: Shift,
    options?: { applyTimePremiums: boolean }
  ): { labels: string[]; amount: number; items: Array<{ label: string; amount: number }> } => {
    const [startStr, endStr] = shift.time.split('-')
    const start = toMinutes(startStr)
    let end = toMinutes(endStr)
    // handle overnight
    if (end <= start) end += 24 * 60

    const labels: string[] = []
    let amount = 0
    const items: Array<{ label: string; amount: number }> = []

    // Weekend allowances based on start day (0=Sun,6=Sat)
    const startDate = new Date(`${shift.date}T00:00:00`)
    const dayOfWeek = startDate.getDay()
    if (dayOfWeek === 6) { // Saturday
      labels.push('Saturday')
      amount += AVIATION_PREMIUMS.saturday.amount
      items.push({ label: 'Saturday Premium', amount: AVIATION_PREMIUMS.saturday.amount })
    } else if (dayOfWeek === 0) { // Sunday
      labels.push('Sunday')
      amount += AVIATION_PREMIUMS.sunday.amount
      items.push({ label: 'Sunday Premium', amount: AVIATION_PREMIUMS.sunday.amount })
    }

    // Apply time-based shift premiums (SP1–SP3) only if allowed
    if (options?.applyTimePremiums) {
      // Shift Premiums by start or end windows
      const startMin = start % (24 * 60)
      const endMin = end % (24 * 60)

      // helpers for window checks in same-day minutes
      const inRange = (val: number, a: number, b: number) => val >= a && val <= b

      // Check all premium conditions and apply ALL that match (for double shifts)
      let appliedPremiums = 0
      
      // SP1: start ≤ 04:59 or end in 00:00–02:59
      const sp1Start = startMin <= toMinutes('04:59')
      const sp1End = inRange(endMin, toMinutes('00:00'), toMinutes('02:59'))
      if (sp1Start || sp1End) {
        labels.push('Shift Premium 1')
        amount += AVIATION_PREMIUMS.shift_premium_1.amount
        items.push({ label: 'Shift premium 1', amount: AVIATION_PREMIUMS.shift_premium_1.amount })
        appliedPremiums++
      }
      
      // SP2: start 05:00–05:59 or end 22:30–23:59
      const sp2Start = inRange(startMin, toMinutes('05:00'), toMinutes('05:59'))
      const sp2End = inRange(endMin, toMinutes('22:30'), toMinutes('23:59'))
      if (sp2Start || sp2End) {
        labels.push('Shift Premium 2')
        amount += AVIATION_PREMIUMS.shift_premium_2.amount
        items.push({ label: 'Shift premium 2', amount: AVIATION_PREMIUMS.shift_premium_2.amount })
        appliedPremiums++
      }
      
      // SP3: start 06:00–06:59 or end 21:00–22:29
      const sp3Start = inRange(startMin, toMinutes('06:00'), toMinutes('06:59'))
      const sp3End = inRange(endMin, toMinutes('21:00'), toMinutes('22:29'))
      if (sp3Start || sp3End) {
        labels.push('Shift Premium 3')
        amount += AVIATION_PREMIUMS.shift_premium_3.amount
        items.push({ label: 'Shift premium 3', amount: AVIATION_PREMIUMS.shift_premium_3.amount })
        appliedPremiums++
      }
      
      // If no premiums applied, show day shift reference
      if (appliedPremiums === 0) {
        labels.push('Day Shift')
      }
    }

    // Night Shift: at least 3 continuous hours worked between 00:00–05:00
    // Compute overlap between shift and 00:00–05:00 for both day and, if overnight, next day window.
    const windowStart = 0
    const windowEnd = 5 * 60
    const shiftFirstDayOverlap = overlapMinutes(start % (24*60), Math.min(end, 24*60), windowStart, windowEnd)
    const shiftSecondDayOverlap = end > 24*60 ? overlapMinutes(0, end - 24*60, windowStart, windowEnd) : 0
    const maxContinuousNightOverlap = Math.max(shiftFirstDayOverlap, shiftSecondDayOverlap)
    if (maxContinuousNightOverlap >= 180) {
      labels.push('Night Shift')
      amount += AVIATION_PREMIUMS.night_shift.amount
      items.push({ label: 'Night Shift', amount: AVIATION_PREMIUMS.night_shift.amount })
    }

    return { labels, amount, items }
  }

  const calculatePremiums = () => {
    const period = PAY_CALENDAR_2025.find(p => p.month === selectedPeriod)
    if (!period) return

    const cutoffDate = new Date(period.cutoffDate)
    const previousPeriod = PAY_CALENDAR_2025[PAY_CALENDAR_2025.indexOf(period) - 1]
    const startDate = previousPeriod ? new Date(previousPeriod.cutoffDate) : new Date(cutoffDate.getFullYear(), cutoffDate.getMonth() - 1, cutoffDate.getDate())

    const periodShifts = shifts.filter(shift => {
      const shiftDate = new Date(`${shift.date}T00:00:00`)
      return shiftDate > startDate && shiftDate <= cutoffDate
    })

    // Determine which dates are double-shift days (2+ shifts on the same date)
    // Use ALL user shifts to avoid missing doubles at pay-period edges
    const dateCounts: Record<string, number> = {}
    for (const s of shifts) {
      dateCounts[s.date] = (dateCounts[s.date] || 0) + 1
    }
    const doubleDates = new Set<string>(
      Object.entries(dateCounts)
        .filter(([, count]) => count >= 2)
        .map(([date]) => date)
    )

    const premiumShiftsData: PremiumShift[] = []
    let totalPremiumAmount = 0
    let totalHours = 0

    // For British Airways, ALL shifts are premium shifts
    periodShifts.forEach(shift => {
      const baseHours = calculateShiftHours(shift.time)
      totalHours += baseHours
      
      const shiftDate = new Date(`${shift.date}T00:00:00`)
      const dayOfWeek = shiftDate.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const isDoubleDay = doubleDates.has(shift.date)
      // Apply time premiums to ALL shifts (not just weekends/doubles) as per aviation rules
      const allowances = determineShiftAllowances(shift, { applyTimePremiums: true })
      const premiumAmount = allowances.amount
      
      // All shifts are premium shifts for British Airways
      premiumShiftsData.push({
        shift,
        premiumLabels: allowances.labels,
        baseHours,
        premiumAmount,
        lineItems: allowances.items
      })
      totalPremiumAmount += premiumAmount
    })

    setPremiumShifts(premiumShiftsData)
    setTotals({
      totalShifts: periodShifts.length,
      totalPremiumAmount,
      totalHours
    })
  }

  const getPremiumLabelColor = (label: string) => {
    switch (label) {
      case 'Shift Premium 1': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'Shift Premium 2': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'Shift Premium 3': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'Night Shift': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
      case 'Saturday': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'Sunday': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  if (loading) {
    return (
      <Card className="bg-white shadow-lg border border-gray-100">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading premium calculations...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white shadow-xl border border-gray-100">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-green-50 border-b border-gray-100 rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl text-gray-900">Premium Pay Calculator</CardTitle>
              <p className="text-gray-600">Calculate your shift premiums and allowances - All British Airways shifts are premium shifts</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Pay Period</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="h-12 text-base border-2 border-gray-200 hover:border-green-300 focus:border-green-500 rounded-xl transition-all duration-300">
                  <SelectValue placeholder="Select a pay period" />
                </SelectTrigger>
                <SelectContent>
                  {PAY_CALENDAR_2025.map(period => (
                    <SelectItem key={period.month} value={period.month}>
                      {period.month} (Cutoff: {new Date(period.cutoffDate).toLocaleDateString('en-GB')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {selectedPeriod && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-orange-800">Total Hours</CardTitle>
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-900">{totals.totalHours.toFixed(1)}</div>
              <p className="text-xs text-orange-600 mt-1">Hours worked</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-green-800">Premium Pay</CardTitle>
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900">£{totals.totalPremiumAmount.toFixed(2)}</div>
              <p className="text-xs text-green-600 mt-1">Total premiums</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* All Shifts Breakdown */}
      {premiumShifts.length > 0 && (
        <Card className="bg-white shadow-xl border border-gray-100">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-green-50 border-b border-gray-100 rounded-t-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-xl text-gray-900">All Shifts Breakdown</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {premiumShifts.map((premiumShift, index) => (
                <div key={index} className="p-4 border-2 border-gray-100 rounded-xl hover:border-green-200 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">
                          {new Date(premiumShift.shift.date).toLocaleDateString('en-GB')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {premiumShift.shift.time}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {premiumShift.premiumLabels.map((label, i) => (
                          <Badge key={i} className={getPremiumLabelColor(label)}>
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">£{premiumShift.premiumAmount.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">One-time premium</p>
                    </div>
                  </div>
                  {premiumShift.lineItems.length > 0 && (
                    <div className="mt-2 pl-3">
                      <div className="text-xs text-muted-foreground mb-1">Payments</div>
                      <div className="space-y-1">
                        {premiumShift.lineItems.map((it, ii) => (
                          <div key={ii} className="flex items-center justify-between text-sm">
                            <span>{it.label}</span>
                            <span>Units 1.00 × Rate £{it.amount.toFixed(2)} = £{it.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Premium Rates Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Aviation Premium Allowances Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(AVIATION_PREMIUMS).map(([key, entry]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">{entry.description}</span>
                <Badge variant="secondary">£{entry.amount.toFixed(2)}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}