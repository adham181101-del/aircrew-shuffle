import { useState, useEffect } from 'react'
import { getCurrentUser, type Staff, type Company } from '@/lib/auth'

export const useAuthState = () => {
  const [user, setUser] = useState<(Staff & { company: Company }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  const refreshUser = async () => {
    try {
      console.log('useAuthState: refreshUser called')
      setLoading(true)
      
      const currentUser = await getCurrentUser()
      console.log('useAuthState: refreshUser result:', currentUser)
      
      setUser(currentUser)
      setInitialized(true)
    } catch (error) {
      console.error('useAuthState: refreshUser error:', error)
      setUser(null)
      setInitialized(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        console.log('useAuthState: Starting initialization...')
        
        // Check if we're in Safari
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
        console.log('useAuthState: Safari detected:', isSafari)
        
        // Add longer delay for Safari
        if (isSafari) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        
        if (!mounted) return
        
        const currentUser = await getCurrentUser()
        console.log('useAuthState: getCurrentUser result:', currentUser)
        
        if (mounted) {
          setUser(currentUser)
          setInitialized(true)
        }
      } catch (error) {
        console.error('useAuthState: Error during initialization:', error)
        if (mounted) {
          setUser(null)
          setInitialized(true)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    return () => {
      mounted = false
    }
  }, [])

  return { user, loading, initialized, refreshUser }
}
