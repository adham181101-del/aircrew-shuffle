import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/auth'
import { supabase } from '@/integrations/supabase/client'

export default function TestAuth() {
  const [user, setUser] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
    console.log(message)
  }

  useEffect(() => {
    loadAuthData()
  }, [])

  const loadAuthData = async () => {
    try {
      setLoading(true)
      setError(null)
      addLog('Loading auth data...')
      
      // Get current session
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        addLog(`Session error: ${sessionError.message}`)
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
      addLog(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const testSubscriptionFlow = async () => {
    if (!user) {
      addLog('No user found - cannot test subscription flow')
      return
    }

    try {
      addLog('Testing subscription flow...')
      
      const response = await fetch('/api/test-subscription-flow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email
        })
      })
      
      const data = await response.json()
      addLog(`Test response: ${response.status} - ${JSON.stringify(data)}`)
      
    } catch (error) {
      addLog(`Test error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const simulateRedirect = () => {
    addLog('Simulating redirect to dashboard...')
    window.location.href = '/dashboard?subscription=success'
  }

  const clearLogs = () => {
    setLogs([])
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Auth Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-4 bg-red-100 border border-red-300 rounded text-red-700">
              Error: {error}
            </div>
          )}
          
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
            <Button onClick={testSubscriptionFlow} disabled={!user}>
              Test Subscription Flow
            </Button>
            <Button onClick={simulateRedirect}>
              Simulate Redirect
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Debug Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-600">Real-time logs</span>
            <Button size="sm" onClick={clearLogs}>
              Clear Logs
            </Button>
          </div>
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
