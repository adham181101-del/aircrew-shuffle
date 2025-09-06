import { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plane, Shield, Clock, ArrowLeft } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useNavigate } from 'react-router-dom'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
}

export const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  const { theme } = useTheme()
  const navigate = useNavigate()
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.02%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-full blur-3xl"></div>
      
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 md:top-8 md:left-8 md:right-8 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
              {theme.logo}
            </div>
            <span className="text-lg md:text-2xl font-bold text-white">{theme.displayName}</span>
          </div>
          
          {/* Back to Home Button */}
          <Button
            onClick={() => {
              console.log('Back to home button clicked')
              try {
                navigate('/')
              } catch (error) {
                console.error('Navigation error:', error)
                // Fallback to window.location if navigate fails
                window.location.href = '/'
              }
            }}
            variant="outline"
            size="sm"
            className="text-white hover:text-white bg-white/5 hover:bg-white/15 border-white/30 hover:border-white/50 backdrop-blur-sm transition-all duration-300 cursor-pointer z-50 relative shadow-lg"
          >
            <ArrowLeft className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-20 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl shadow-2xl mb-6 border border-white/20">
              {theme.logo}
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">{title}</h1>
            {subtitle && (
              <p className="text-white/80 text-lg leading-relaxed">{subtitle}</p>
            )}
          </div>
          
          {/* Auth Card */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 shadow-2xl p-8">
            {children}
          </Card>
          
          {/* Footer */}
          <div className="text-center mt-8">
            <div className="flex items-center justify-center space-x-6 text-white/60 text-sm">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-green-400" />
                <span>Enterprise Security</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-400" />
                <span>24/7 Support</span>
              </div>
            </div>
            <p className="text-white/40 text-xs mt-4">
              © 2024 {theme.displayName}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}