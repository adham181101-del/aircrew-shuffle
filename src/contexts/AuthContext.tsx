import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getCurrentUser, signOut, type Staff, type Company } from '@/lib/auth'

interface AuthContextType {
  user: (Staff & { company: Company }) | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<(Staff & { company: Company }) | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Fallback to prevent infinite loading
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      console.log('AuthContext: Fallback timer - forcing loading to false')
      setLoading(false)
    }, 15000) // 15 seconds fallback
    
    return () => clearTimeout(fallbackTimer)
  }, [])

  const refreshUser = async () => {
    try {
      console.log('AuthContext: Starting refreshUser...')
      const currentUser = await getCurrentUser()
      console.log('AuthContext: getCurrentUser result:', currentUser)
      setUser(currentUser)
      console.log('AuthContext: User state updated')
    } catch (error) {
      console.error('AuthContext: Error refreshing user:', error)
      setUser(null)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      setUser(null)
      // The ProtectedRoute will handle the redirect automatically
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth initialization timeout')), 10000)
        )
        
        const refreshPromise = refreshUser()
        await Promise.race([refreshPromise, timeoutPromise])
      } catch (error) {
        console.error('AuthContext: Initialization error:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    
    initializeAuth()
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signOut: handleSignOut,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  )
}
