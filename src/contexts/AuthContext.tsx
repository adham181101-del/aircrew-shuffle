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

  const refreshUser = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error('Error refreshing user:', error)
      setUser(null)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      setUser(null)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  useEffect(() => {
    refreshUser().finally(() => {
      setLoading(false)
    })
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
