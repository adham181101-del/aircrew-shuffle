import { AuthLayout } from '@/components/auth/AuthLayout'
import { SignInForm } from '@/components/auth/SignInForm'
import { useTheme } from '@/contexts/ThemeContext'

const Login = () => {
  const { theme } = useTheme()
  
  const getSubtitle = () => {
    if (theme.name === 'aviation') {
      return "Sign in to access your aviation shift management system"
    }
    return "Sign in to access your shift management system"
  }
  
  return (
    <AuthLayout 
      title="Welcome Back"
      subtitle={getSubtitle()}
    >
      <SignInForm />
    </AuthLayout>
  )
}

export default Login