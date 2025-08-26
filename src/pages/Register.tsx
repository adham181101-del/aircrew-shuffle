import { AuthLayout } from '@/components/auth/AuthLayout'
import { SignUpForm } from '@/components/auth/SignUpForm'

const Register = () => {
  return (
    <AuthLayout 
      title="Join Your Team"
      subtitle="Create your account to manage shifts and swaps"
    >
      <SignUpForm />
    </AuthLayout>
  )
}

export default Register