import { ReactNode } from 'react'
import { Card } from '@/components/ui/card'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
}

export const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-background rounded-full shadow-elegant mb-4">
            <div className="text-2xl font-bold text-primary">🏢</div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
          {subtitle && (
            <p className="text-white/80">{subtitle}</p>
          )}
        </div>
        
        <Card className="p-6 shadow-elegant">
          {children}
        </Card>
        
        <div className="text-center mt-6">
          <p className="text-white/60 text-sm">
            Shift Management System
          </p>
        </div>
      </div>
    </div>
  )
}