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

// Premium rates (these would typically come from HR/company data)
const PREMIUM_RATES = {
  early_morning: { rate: 1.25, description: 'Early Morning (04:15-05:30)' },
  afternoon: { rate: 1.15, description: 'Afternoon (12:30-13:15)' },
  evening: { rate: 1.30, description: 'Evening (13:15+)' },
  weekend: { rate: 1.50, description: 'Weekend' },
  holiday: { rate: 2.00, description: 'Holiday' }
}

interface PremiumShift {
  shift: Shift
  premiumType: string
  premiumRate: number
  baseHours: number
  premiumAmount: number
}

export const PremiumCalculator = () => {
  const { toast } = useToast()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')
  const [premiumShifts, setPremiumShifts] = useState<PremiumShift[]>([])
  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState({
    totalShifts: 0,
    totalPremiumShifts: 0,
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

  const determineShiftPremium = (shift: Shift): { type: string; rate: number } | null => {
    const timeOfDay = getShiftTimeOfDay(shift.time)
    const shiftDate = new Date(shift.date)
    const dayOfWeek = shiftDate.getDay()
    
    // Weekend premium (Saturday = 6, Sunday = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return { type: 'weekend', rate: PREMIUM_RATES.weekend.rate }
    }
    
    // Time-based premiums
    switch (timeOfDay) {
      case 'morning':
        if (shift.time.startsWith('04:15') || shift.time.startsWith('05:30')) {
          return { type: 'early_morning', rate: PREMIUM_RATES.early_morning.rate }
        }
        break
      case 'afternoon':
        if (shift.time.startsWith('12:30')) {
          return { type: 'afternoon', rate: PREMIUM_RATES.afternoon.rate }
        }
        break
      case 'evening':
        if (shift.time.startsWith('13:15')) {
          return { type: 'evening', rate: PREMIUM_RATES.evening.rate }
        }
        break
    }
    
    return null
  }

  const calculatePremiums = () => {
    const period = PAY_CALENDAR_2025.find(p => p.month === selectedPeriod)
    if (!period) return

    const cutoffDate = new Date(period.cutoffDate)
    const previousPeriod = PAY_CALENDAR_2025[PAY_CALENDAR_2025.indexOf(period) - 1]
    const startDate = previousPeriod ? new Date(previousPeriod.cutoffDate) : new Date(cutoffDate.getFullYear(), cutoffDate.getMonth() - 1, cutoffDate.getDate())

    const periodShifts = shifts.filter(shift => {
      const shiftDate = new Date(shift.date)
      return shiftDate > startDate && shiftDate <= cutoffDate
    })

    const premiumShiftsData: PremiumShift[] = []
    let totalPremiumAmount = 0
    let totalHours = 0

    periodShifts.forEach(shift => {
      const baseHours = calculateShiftHours(shift.time)
      totalHours += baseHours
      
      const premium = determineShiftPremium(shift)
      if (premium) {
        const premiumAmount = baseHours * (premium.rate - 1) * 25 // Assuming £25/hour base rate
        
        premiumShiftsData.push({
          shift,
          premiumType: premium.type,
          premiumRate: premium.rate,
          baseHours,
          premiumAmount
        })
        
        totalPremiumAmount += premiumAmount
      }
    })

    setPremiumShifts(premiumShiftsData)
    setTotals({
      totalShifts: periodShifts.length,
      totalPremiumShifts: premiumShiftsData.length,
      totalPremiumAmount,
      totalHours
    })
  }

  const getPremiumTypeColor = (type: string) => {
    switch (type) {
      case 'early_morning': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'afternoon': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'evening': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'weekend': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'holiday': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2">Loading premium calculations...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Premium Pay Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Pay Period</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a pay period" />
                </SelectTrigger>
                <SelectContent>
                  {PAY_CALENDAR_2025.map(period => (
                    <SelectItem key={period.month} value={period.month}>
                      {period.month} (Cutoff: {new Date(period.cutoffDate).toLocaleDateString()})
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.totalShifts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Premium Shifts</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.totalPremiumShifts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.totalHours.toFixed(1)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Premium Pay</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">£{totals.totalPremiumAmount.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Premium Shifts Breakdown */}
      {premiumShifts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Premium Shifts Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {premiumShifts.map((premiumShift, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">
                        {new Date(premiumShift.shift.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {premiumShift.shift.time}
                      </p>
                    </div>
                    <Badge className={getPremiumTypeColor(premiumShift.premiumType)}>
                      {PREMIUM_RATES[premiumShift.premiumType as keyof typeof PREMIUM_RATES]?.description || premiumShift.premiumType}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">£{premiumShift.premiumAmount.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      {premiumShift.baseHours}h × {((premiumShift.premiumRate - 1) * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Premium Rates Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Premium Rates Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(PREMIUM_RATES).map(([key, rate]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">{rate.description}</span>
                <Badge variant="secondary">+{((rate.rate - 1) * 100).toFixed(0)}%</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}