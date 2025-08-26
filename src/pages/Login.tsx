import { AuthLayout } from '@/components/auth/AuthLayout'
import { SignInForm } from '@/components/auth/SignInForm'

const Login = () => {
  return (
    <AuthLayout 
      title="Welcome Back"
      subtitle="Sign in to access your shift management system"
    >
      <SignInForm />
    </AuthLayout>
  )
}

export default Login