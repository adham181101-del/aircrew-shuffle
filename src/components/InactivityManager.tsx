import { useInactivityLogout } from '@/hooks/useInactivityLogout'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

interface InactivityManagerProps {
  children: React.ReactNode
}

export const InactivityManager = ({ children }: InactivityManagerProps) => {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Only apply inactivity logout for authenticated users
  useInactivityLogout({
    timeout: 30 * 60 * 1000, // 30 minutes
    warningTime: 5 * 60 * 1000, // 5 minutes warning
    onWarning: () => {
      console.log('User will be logged out due to inactivity in 5 minutes')
    },
    onLogout: () => {
      console.log('User automatically logged out due to inactivity')
      // Navigate to login page
      navigate('/login', { replace: true })
    }
  })

  // Only render children if user is authenticated
  if (!user) {
    return null
  }

  return <>{children}</>
}
