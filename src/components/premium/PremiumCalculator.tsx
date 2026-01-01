import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getUserShifts, type Shift } from '@/lib/shifts'
import { getCurrentUser } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'
import { Calendar, DollarSign, TrendingUp, Clock, ChevronRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { format } from 'date-fns'

interface PayPeriod {
  id: string
  label: string
  start: Date // Sunday start
  end: Date   // Saturday end (inclusive)
  weeks: 4 | 5 // Period length in weeks
}

// Fixed 2026 premium periods (Overtime work periods → Paid month)
const PREMIUM_PERIODS_2026: PayPeriod[] = [
  { id: '2026-01', label: '8 Dec 2025 - 11 Jan 2026', start: new Date('2025-12-08'), end: new Date('2026-01-11'), weeks: 5 },
  { id: '2026-02', label: '12 Jan - 8 Feb 2026', start: new Date('2026-01-12'), end: new Date('2026-02-08'), weeks: 4 },
  { id: '2026-03', label: '9 Feb - 8 Mar 2026', start: new Date('2026-02-09'), end: new Date('2026-03-08'), weeks: 4 },
  { id: '2026-04', label: '9 Mar - 5 Apr 2026', start: new Date('2026-03-09'), end: new Date('2026-04-05'), weeks: 4 },
  { id: '2026-05', label: '6 Apr - 10 May 2026', start: new Date('2026-04-06'), end: new Date('2026-05-10'), weeks: 5 },
  { id: '2026-06', label: '11 May - 7 Jun 2026', start: new Date('2026-05-11'), end: new Date('2026-06-07'), weeks: 4 },
  { id: '2026-07', label: '8 Jun - 12 Jul 2026', start: new Date('2026-06-08'), end: new Date('2026-07-12'), weeks: 5 },
  { id: '2026-08', label: '13 Jul - 9 Aug 2026', start: new Date('2026-07-13'), end: new Date('2026-08-09'), weeks: 4 },
  { id: '2026-09', label: '10 Aug - 13 Sep 2026', start: new Date('2026-08-10'), end: new Date('2026-09-13'), weeks: 5 },
  { id: '2026-10', label: '14 Sep - 11 Oct 2026', start: new Date('2026-09-14'), end: new Date('2026-10-11'), weeks: 4 },
  { id: '2026-11', label: '12 Oct - 8 Nov 2026', start: new Date('2026-10-12'), end: new Date('2026-11-08'), weeks: 4 },
  { id: '2026-12', label: '9 Nov - 6 Dec 2026', start: new Date('2026-11-09'), end: new Date('2026-12-06'), weeks: 4 },
]

// Helper function to find which period a shift date falls into
const findPeriodForDate = (date: Date): PayPeriod | null => {
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

interface PremiumTally {
  premiumType: string
  count: number
  totalAmount: number
  occurrences: Array<{
    date: string
    time: string
    amount: number
    shiftId: string
  }>
}

export const PremiumCalculator = () => {
  const { toast } = useToast()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')
  const [premiumShifts, setPremiumShifts] = useState<PremiumShift[]>([])
  const [premiumTally, setPremiumTally] = useState<PremiumTally[]>([])
  const [selectedPremium, setSelectedPremium] = useState<PremiumTally | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodDateRange, setPeriodDateRange] = useState<{ start: Date; end: Date } | null>(null)
  const [totals, setTotals] = useState({
    totalShifts: 0,
    totalPremiumAmount: 0,
    totalHours: 0
  })
  // New: base salary and leave days inputs (using string to allow empty values)
  const [baseSalary, setBaseSalary] = useState<string>('')
  const [leaveDays, setLeaveDays] = useState<string>('')

  const selectedPeriod = useMemo(
    () => PREMIUM_PERIODS_2026.find(period => period.id === selectedPeriodId) || null,
    [selectedPeriodId]
  )

  useEffect(() => {
    loadShifts()
  }, [])

  useEffect(() => {
    if (!selectedPeriodId) {
      const today = new Date()
      const current = findPeriodForDate(today) || PREMIUM_PERIODS_2026[PREMIUM_PERIODS_2026.length - 1]
      if (current) {
        setSelectedPeriodId(current.id)
      }
    }
  }, [selectedPeriodId])

  useEffect(() => {
    if (selectedPeriod && shifts.length > 0) {
      calculatePremiums(selectedPeriod)
    }
  }, [selectedPeriod, shifts])

  const loadShifts = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) return

      const userShifts = await getUserShifts(user.id)
      setShifts(userShifts)
      
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

  const calculatePremiums = (period: PayPeriod) => {
    const startDate = new Date(period.start)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(period.end)
    endDate.setHours(23, 59, 59, 999) // Include the entire Saturday

    // Store period date range for display
    setPeriodDateRange({ start: startDate, end: endDate })

    // Filter shifts: from startDate (inclusive Sunday) to endDate (inclusive Saturday)
    const periodShifts = shifts.filter(shift => {
      const shiftDate = new Date(`${shift.date}T00:00:00`)
      return shiftDate >= startDate && shiftDate <= endDate
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

    // Calculate premium tally
    const tallyMap: Record<string, PremiumTally> = {}
    
    // Helper to normalize premium type names for consistent matching
    const normalizePremiumType = (label: string): string => {
      // Map line item labels to display names
      const labelMap: Record<string, string> = {
        'Shift premium 1': 'Shift Premium 1',
        'Shift premium 2': 'Shift Premium 2',
        'Shift premium 3': 'Shift Premium 3',
        'Saturday Premium': 'Saturday',
        'Sunday Premium': 'Sunday',
        'Night Shift': 'Night Shift',
        'Day Shift': 'Day Shift'
      }
      return labelMap[label] || label
    }
    
    premiumShiftsData.forEach(premiumShift => {
      premiumShift.lineItems.forEach(item => {
        const premiumType = normalizePremiumType(item.label)
        if (!tallyMap[premiumType]) {
          tallyMap[premiumType] = {
            premiumType,
            count: 0,
            totalAmount: 0,
            occurrences: []
          }
        }
        tallyMap[premiumType].count++
        tallyMap[premiumType].totalAmount += item.amount
        tallyMap[premiumType].occurrences.push({
          date: premiumShift.shift.date,
          time: premiumShift.shift.time,
          amount: item.amount,
          shiftId: premiumShift.shift.id
        })
      })
    })

    // Sort by total amount (descending)
    const sortedTally = Object.values(tallyMap).sort((a, b) => b.totalAmount - a.totalAmount)
    setPremiumTally(sortedTally)

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex-1">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Pay Period</label>
              <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                <SelectTrigger className="h-12 text-base border-2 border-gray-200 hover:border-green-300 focus:border-green-500 rounded-xl transition-all duration-300">
                  <SelectValue placeholder="Select a pay period" />
                </SelectTrigger>
                <SelectContent>
                  {PREMIUM_PERIODS_2026.map(period => (
                    <SelectItem key={period.id} value={period.id}>
                      {period.label} ({period.weeks} weeks)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Base Salary (Monthly)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                className="h-12 w-full rounded-xl border-2 border-gray-200 px-4 text-base hover:border-green-300 focus:border-green-500 focus:outline-none transition-all duration-300"
                placeholder="£ e.g. 2200.00"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Leave Days in Period</label>
              <input
                type="number"
                min="0"
                step="1"
                value={leaveDays}
                onChange={(e) => setLeaveDays(e.target.value)}
                className="h-12 w-full rounded-xl border-2 border-gray-200 px-4 text-base hover:border-green-300 focus:border-green-500 focus:outline-none transition-all duration-300"
                placeholder="e.g. 2"
              />
              <p className="text-xs text-gray-500 mt-1">Adds £17.24 per leave day</p>
            </div>
          </div>
          {periodDateRange && selectedPeriod && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-900">
                <Calendar className="h-4 w-4" />
                <span className="font-semibold">Pay Period Range:</span>
                <span>
                  {format(periodDateRange.start, 'd MMM yyyy')} - {format(periodDateRange.end, 'd MMM yyyy')}
                </span>
                <span className="text-blue-600">
                  ({selectedPeriod.weeks} weeks)
                </span>
              </div>
            </div>
          )}
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

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-emerald-800">Expected Salary</CardTitle>
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const baseSalaryNum = parseFloat(baseSalary) || 0;
                const leaveDaysNum = parseInt(leaveDays, 10) || 0;
                const leavePremium = leaveDaysNum * 17.24;
                const expected = Math.max(0, baseSalaryNum) + totals.totalPremiumAmount + leavePremium;
                return (
                  <>
                    <div className="text-3xl font-bold text-emerald-900">£{expected.toFixed(2)}</div>
                    <p className="text-xs text-emerald-700 mt-1">
                      Base £{baseSalaryNum.toFixed(2)} + Premiums £{totals.totalPremiumAmount.toFixed(2)} + Leave £{leavePremium.toFixed(2)}
                    </p>
                  </>
                )
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Premium Tally */}
      {selectedPeriod && premiumTally.length > 0 && (
        <Card className="bg-white shadow-xl border border-gray-100">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-100 rounded-t-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-xl text-gray-900">Premium Tally</CardTitle>
              <p className="text-sm text-gray-600">Click on any premium to see detailed breakdown</p>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {premiumTally.map((tally, index) => (
                <Card
                  key={index}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-300"
                  onClick={() => setSelectedPremium(tally)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{tally.premiumType}</h3>
                        <Badge className={getPremiumLabelColor(tally.premiumType)}>
                          {tally.count} {tally.count === 1 ? 'time' : 'times'}
                        </Badge>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Total Amount</span>
                        <span className="text-lg font-bold text-green-600">£{tally.totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm text-gray-600">Avg per occurrence</span>
                        <span className="text-sm text-gray-700">£{(tally.totalAmount / tally.count).toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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

      {/* Premium Detail Dialog */}
      <Dialog open={!!selectedPremium} onOpenChange={() => setSelectedPremium(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedPremium?.premiumType} - Detailed Breakdown
            </DialogTitle>
            <DialogDescription>
              Showing all {selectedPremium?.count} occurrences of {selectedPremium?.premiumType}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPremium && (
            <div className="space-y-4 mt-4">
              {/* Summary */}
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Count</p>
                      <p className="text-2xl font-bold text-gray-900">{selectedPremium.count}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="text-2xl font-bold text-green-600">£{selectedPremium.totalAmount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Average per Shift</p>
                      <p className="text-2xl font-bold text-blue-600">£{(selectedPremium.totalAmount / selectedPremium.count).toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed List */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg mb-3">Dates & Shifts</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedPremium.occurrences
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((occurrence, index) => (
                      <Card key={index} className="border border-gray-200 hover:border-blue-300 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Calendar className="h-6 w-6 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {format(new Date(occurrence.date), 'EEEE, d MMMM yyyy')}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Shift Time: {occurrence.time}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">£{occurrence.amount.toFixed(2)}</p>
                              <Badge className={getPremiumLabelColor(selectedPremium.premiumType)}>
                                {selectedPremium.premiumType}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}