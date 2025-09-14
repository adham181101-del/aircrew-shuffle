import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const TestAuth = () => {
  const { user, loading, initialized } = useAuth()
  const [urlParams, setUrlParams] = useState<string>('')

  useEffect(() => {
    setUrlParams(window.location.search)
  }, [])

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Initialized:</strong> {initialized ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>User:</strong> {user ? `${user.email} (${user.id})` : 'Not logged in'}
          </div>
          <div>
            <strong>URL Parameters:</strong> {urlParams || 'None'}
          </div>
          <div>
            <strong>Current URL:</strong> {window.location.href}
          </div>
          <div>
            <strong>Session Storage:</strong> {JSON.stringify(sessionStorage)}
          </div>
          <div>
            <strong>Local Storage:</strong> {JSON.stringify(localStorage)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default TestAuth