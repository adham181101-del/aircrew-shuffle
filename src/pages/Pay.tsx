import { useState, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PremiumCalculator, type PremiumTotalsSummary } from '@/components/premium/PremiumCalculator'
import { OvertimeCalculator } from '@/components/premium/OvertimeCalculator'
import { DollarSign, Clock } from 'lucide-react'

export default function Pay() {
  const [premiumSummary, setPremiumSummary] = useState<PremiumTotalsSummary | null>(null)
  const [overtimeRefresh, setOvertimeRefresh] = useState(0)

  const handleOvertimeChange = useCallback((_periodId: string, _overtimePay: number) => {
    setOvertimeRefresh((n) => n + 1)
  }, [])

  return (
    <div className="max-w-3xl mx-auto lg:max-w-5xl xl:max-w-6xl w-full space-y-4">
      <div className="text-center md:text-left">
        <h2 className="text-xl font-bold text-slate-900">Pay</h2>
        <p className="text-sm text-slate-500">Premiums &amp; overtime in one place</p>
      </div>

      <Tabs defaultValue="premiums" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-11 bg-white border border-slate-200 shadow-sm">
          <TabsTrigger value="premiums" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <DollarSign className="h-4 w-4" />
            Premiums
          </TabsTrigger>
          <TabsTrigger value="overtime" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Clock className="h-4 w-4" />
            Overtime
          </TabsTrigger>
        </TabsList>
        <TabsContent value="premiums" className="mt-4 focus-visible:outline-none">
          <PremiumCalculator onTotalsChange={setPremiumSummary} overtimeRefresh={overtimeRefresh} />
        </TabsContent>
        <TabsContent value="overtime" className="mt-4 focus-visible:outline-none">
          <OvertimeCalculator summary={premiumSummary} onOvertimeChange={handleOvertimeChange} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
