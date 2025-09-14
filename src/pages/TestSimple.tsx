import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestSimple() {
  const [result, setResult] = useState<string>('')

  const testWebhook = async () => {
    try {
      setResult('Testing webhook...')
      const response = await fetch('/api/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'webhook' })
      })
      
      const data = await response.text()
      setResult(`Webhook Response: ${response.status} - ${data}`)
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const testCheckout = async () => {
    try {
      setResult('Testing checkout session creation...')
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planKey: 'pro',
          userId: 'test-user-id',
          userEmail: 'test@example.com',
          trialPeriodDays: 30
        })
      })
      
      const data = await response.json()
      setResult(`Checkout Response: ${response.status} - ${JSON.stringify(data)}`)
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Simple API Tests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={testWebhook}>
              Test Webhook
            </Button>
            <Button onClick={testCheckout}>
              Test Checkout
            </Button>
          </div>
          
          {result && (
            <div className="p-4 bg-gray-100 rounded">
              <pre className="text-sm">{result}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
