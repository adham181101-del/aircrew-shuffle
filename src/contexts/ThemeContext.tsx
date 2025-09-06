import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'

export interface ThemeConfig {
  name: string
  displayName: string
  logo: ReactNode
  heroTitle: string
  heroSubtitle: string
  heroDescription: string
  primaryColor: string
  secondaryColor: string
  features: {
    title: string
    description: string
    features: Array<{
      title: string
      description: string
      icon: ReactNode
    }>
  }
  stats: Array<{
    value: string
    label: string
  }>
  industries: Array<{
    name: string
    icon: string
    color: string
  }>
  cta: {
    title: string
    description: string
  }
  footer: {
    description: string
  }
}

interface ThemeContextType {
  theme: ThemeConfig
  isAviationTheme: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// Import icons
import { 
  Plane, 
  Calendar, 
  ArrowRightLeft, 
  Shield, 
  Clock,
  Building2,
  Users,
  Briefcase,
  Stethoscope,
  Truck,
  Factory,
  ShoppingBag,
  Hotel,
  Zap,
  CheckCircle,
  TrendingUp,
  Globe,
  Star,
  Heart,
  Utensils,
  Car,
  GraduationCap,
  Wrench
} from 'lucide-react'

// Theme configurations
const themes: Record<string, ThemeConfig> = {
  aviation: {
    name: 'aviation',
    displayName: 'AirCrew Shuffle',
    logo: <Plane className="h-6 w-6 text-white" />,
    heroTitle: 'AirCrew Shuffle',
    heroSubtitle: 'Aviation Shift Management',
    heroDescription: 'Revolutionize your shift management with AI-powered scheduling, seamless swaps, and real-time team coordination across the aviation industry.',
    primaryColor: 'from-blue-600 to-purple-600',
    secondaryColor: 'from-blue-500 to-blue-600',
    features: {
      title: 'Built for Modern Aviation',
      description: 'Designed specifically for aviation professionals who need reliable, secure, and intuitive shift management.',
      features: [
        {
          title: 'Smart Roster Management',
          description: 'AI-powered schedule parsing automatically extracts shifts from any format. Beautiful calendar interface with drag-and-drop functionality.',
          icon: <Calendar className="h-8 w-8 text-white" />
        },
        {
          title: 'Intelligent Shift Swaps',
          description: 'Smart eligibility checking ensures only compatible team members see your requests. Real-time notifications and approval workflows.',
          icon: <ArrowRightLeft className="h-8 w-8 text-white" />
        },
        {
          title: 'Enterprise Security',
          description: 'Built with SOC 2 compliance in mind. Company email verification and location-restricted access ensure data safety.',
          icon: <Shield className="h-8 w-8 text-white" />
        }
      ]
    },
    stats: [
      { value: '50+', label: 'Airlines Worldwide' },
      { value: '10K+', label: 'Active Crew Members' },
      { value: '99.9%', label: 'Uptime Reliability' },
      { value: '24/7', label: 'Global Support' }
    ],
    industries: [
      { name: 'Aviation', icon: '✈️', color: 'from-blue-500 to-blue-600' },
      { name: 'Logistics', icon: '🚚', color: 'from-green-500 to-green-600' },
      { name: 'Healthcare', icon: '🏥', color: 'from-red-500 to-red-600' },
      { name: 'Manufacturing', icon: '🏭', color: 'from-orange-500 to-orange-600' },
      { name: 'Retail', icon: '🛍️', color: 'from-purple-500 to-purple-600' },
      { name: 'Hospitality', icon: '🏨', color: 'from-pink-500 to-pink-600' }
    ],
    cta: {
      title: 'Ready to Transform Your Shift Management?',
      description: 'Join thousands of aviation professionals who trust AirCrew Shuffle for their daily operations.'
    },
    footer: {
      description: 'Revolutionizing shift management for aviation professionals worldwide.'
    }
  },
  generic: {
    name: 'generic',
    displayName: 'ShiftFlex',
    logo: <Clock className="h-6 w-6 text-white" />,
    heroTitle: 'ShiftFlex',
    heroSubtitle: 'Smart Shift Management',
    heroDescription: 'Streamline your workforce scheduling with AI-powered shift management, seamless swaps, and real-time team coordination for any industry.',
    primaryColor: 'from-emerald-600 to-teal-600',
    secondaryColor: 'from-emerald-500 to-emerald-600',
    features: {
      title: 'Built for Modern Workforce',
      description: 'Designed for any industry that relies on shift-based work - from healthcare to hospitality, retail to manufacturing.',
      features: [
        {
          title: 'Smart Schedule Management',
          description: 'AI-powered schedule parsing automatically extracts shifts from any format. Beautiful calendar interface with drag-and-drop functionality.',
          icon: <Calendar className="h-8 w-8 text-white" />
        },
        {
          title: 'Intelligent Shift Swaps',
          description: 'Smart eligibility checking ensures only compatible team members see your requests. Real-time notifications and approval workflows.',
          icon: <ArrowRightLeft className="h-8 w-8 text-white" />
        },
        {
          title: 'Enterprise Security',
          description: 'Built with enterprise-grade security. Company email verification and location-restricted access ensure data safety.',
          icon: <Shield className="h-8 w-8 text-white" />
        }
      ]
    },
    stats: [
      { value: '100+', label: 'Companies Worldwide' },
      { value: '25K+', label: 'Active Employees' },
      { value: '99.9%', label: 'Uptime Reliability' },
      { value: '24/7', label: 'Global Support' }
    ],
    industries: [
      { name: 'Healthcare', icon: '🏥', color: 'from-red-500 to-red-600' },
      { name: 'Hospitality', icon: '🏨', color: 'from-pink-500 to-pink-600' },
      { name: 'Retail', icon: '🛍️', color: 'from-purple-500 to-purple-600' },
      { name: 'Manufacturing', icon: '🏭', color: 'from-orange-500 to-orange-600' },
      { name: 'Logistics', icon: '🚚', color: 'from-green-500 to-green-600' },
      { name: 'Food Service', icon: '🍽️', color: 'from-yellow-500 to-yellow-600' },
      { name: 'Security', icon: '🛡️', color: 'from-gray-500 to-gray-600' },
      { name: 'Transportation', icon: '🚌', color: 'from-blue-500 to-blue-600' },
      { name: 'Education', icon: '🎓', color: 'from-indigo-500 to-indigo-600' },
      { name: 'Maintenance', icon: '🔧', color: 'from-slate-500 to-slate-600' }
    ],
    cta: {
      title: 'Ready to Transform Your Workforce Scheduling?',
      description: 'Join thousands of companies who trust ShiftFlex for their shift management needs.'
    },
    footer: {
      description: 'Revolutionizing shift management for businesses worldwide.'
    }
  }
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeConfig>(themes.generic)
  const { user } = useAuth()

  useEffect(() => {
    if (user?.email) {
      // Check if user email is from aviation domain (ba.com, etc.)
      const isAviationDomain = user.email.toLowerCase().endsWith('ba.com') || 
                              user.email.toLowerCase().includes('aviation') ||
                              user.email.toLowerCase().includes('airline')
      
      if (isAviationDomain) {
        setTheme(themes.aviation)
      } else {
        setTheme(themes.generic)
      }
    } else {
      // Default to generic theme when not logged in
      setTheme(themes.generic)
    }
  }, [user])

  const isAviationTheme = theme.name === 'aviation'

  return (
    <ThemeContext.Provider value={{ theme, isAviationTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
