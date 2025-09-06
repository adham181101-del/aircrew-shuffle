import { AuthLayout } from '@/components/auth/AuthLayout'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { useTheme } from '@/contexts/ThemeContext'

const Register = () => {
  const { theme } = useTheme()
  
  const getSubtitle = () => {
    if (theme.name === 'aviation') {
      return "Create your account to manage aviation shifts and swaps"
    }
    return "Create your account to manage shifts and swaps"
  }
  
  return (
    <AuthLayout 
      title="Join Your Team"
      subtitle={getSubtitle()}
    >
      <SignUpForm />
    </AuthLayout>
  )
}

export default Register