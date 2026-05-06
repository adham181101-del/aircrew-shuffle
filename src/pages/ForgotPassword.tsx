import { AuthLayout } from '@/components/auth/AuthLayout'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'
import { useTheme } from '@/contexts/ThemeContext'

const ForgotPassword = () => {
  const { theme } = useTheme()

  const getSubtitle = () => {
    if (theme.name === 'aviation') {
      return 'Request a secure password reset link for your aviation account'
    }
    return 'Request a secure password reset link for your account'
  }

  return (
    <AuthLayout title="Reset Your Password" subtitle={getSubtitle()}>
      <ForgotPasswordForm />
    </AuthLayout>
  )
}

export default ForgotPassword
