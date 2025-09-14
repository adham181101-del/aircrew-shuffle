import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/auth'
import { supabase } from '@/integrations/supabase/client'

export default function TestRedirect() {
  const [user, setUser] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [urlParams, setUrlParams] = useState<any>({})
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
    console.log(message)
  }

  useEffect(() => {
    // Check URL parameters
    const params = new URLSearchParams(window.location.search)
    const paramObj: any = {}
    for (const [key, value] of params.entries()) {
      paramObj[key] = value
    }
    setUrlParams(paramObj)
    
    if (paramObj.subscription === 'success') {
      addLog('✅ Detected subscription=success in URL')
    }
    
    loadAuthData()
  }, [])

  const loadAuthData = async () => {
    try {
      addLog('Loading auth data after redirect...')
      
      // Get current session
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        addLog(`❌ Session error: ${sessionError.message}`)
      } else {
        addLog(`Session: ${currentSession ? 'EXISTS' : 'NULL'}`)
        if (currentSession) {
          addLog(`Session user ID: ${currentSession.user?.id}`)
          addLog(`Session expires: ${new Date(currentSession.expires_at * 1000).toLocaleString()}`)
        }
      }
      setSession(currentSession)
      
      // Get current user
      const currentUser = await getCurrentUser()
      addLog(`User: ${currentUser ? 'EXISTS' : 'NULL'}`)
      if (currentUser) {
        addLog(`User ID: ${currentUser.id}`)
        addLog(`User email: ${currentUser.email}`)
      }
      setUser(currentUser)
      
    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const testSubscriptionStatus = async () => {
    if (!user) {
      addLog('❌ No user found - cannot check subscription')
      return
    }

    try {
      addLog('Checking subscription status...')
      
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
      
      if (error) {
        addLog(`❌ Subscription check error: ${error.message}`)
      } else {
        addLog(`Found ${subscriptions?.length || 0} subscriptions`)
        if (subscriptions && subscriptions.length > 0) {
          subscriptions.forEach((sub, index) => {
            addLog(`Subscription ${index + 1}: ${sub.status} - ${sub.plan_name}`)
          })
        }
      }
      
    } catch (error) {
      addLog(`❌ Subscription check error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const simulateStripeRedirect = () => {
    addLog('Simulating Stripe redirect...')
    window.location.href = '/dashboard?subscription=success'
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Redirect Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">URL Parameters:</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
              {JSON.stringify(urlParams, null, 2)}
            </pre>
          </div>
          
          <div>
            <h3 className="font-semibold">Session Info:</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
          
          <div>
            <h3 className="font-semibold">User Info:</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={loadAuthData}>
              Refresh Auth Data
            </Button>
            <Button onClick={testSubscriptionStatus} disabled={!user}>
              Check Subscription Status
            </Button>
            <Button onClick={simulateStripeRedirect}>
              Simulate Stripe Redirect
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Debug Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
