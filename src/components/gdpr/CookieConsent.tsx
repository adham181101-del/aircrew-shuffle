import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Cookie, Settings, Shield, BarChart3, Target, Eye } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface CookiePreferences {
  necessary: boolean
  analytics: boolean
  marketing: boolean
  preferences: boolean
}

const CookieConsent = () => {
  const { theme } = useTheme()
  const [showBanner, setShowBanner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always true, cannot be disabled
    analytics: false,
    marketing: false,
    preferences: false
  })

  useEffect(() => {
    // Check if user has already made a choice
    const savedPreferences = localStorage.getItem('cookie-preferences')
    if (savedPreferences) {
      setPreferences(JSON.parse(savedPreferences))
    } else {
      // Show banner if no preferences saved
      setShowBanner(true)
    }
  }, [])

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true
    }
    setPreferences(allAccepted)
    localStorage.setItem('cookie-preferences', JSON.stringify(allAccepted))
    setShowBanner(false)
    initializeCookies(allAccepted)
  }

  const handleRejectAll = () => {
    const onlyNecessary = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false
    }
    setPreferences(onlyNecessary)
    localStorage.setItem('cookie-preferences', JSON.stringify(onlyNecessary))
    setShowBanner(false)
    initializeCookies(onlyNecessary)
  }

  const handleSavePreferences = () => {
    localStorage.setItem('cookie-preferences', JSON.stringify(preferences))
    setShowBanner(false)
    setShowSettings(false)
    initializeCookies(preferences)
  }

  const initializeCookies = (prefs: CookiePreferences) => {
    // Initialize analytics cookies if accepted
    if (prefs.analytics) {
      // Initialize Google Analytics or other analytics tools
      console.log('Analytics cookies initialized')
    }

    // Initialize marketing cookies if accepted
    if (prefs.marketing) {
      // Initialize marketing tracking
      console.log('Marketing cookies initialized')
    }

    // Initialize preference cookies if accepted
    if (prefs.preferences) {
      // Save user preferences
      console.log('Preference cookies initialized')
    }
  }

  const cookieCategories = [
    {
      id: 'necessary',
      name: 'Necessary Cookies',
      description: 'Essential for the website to function properly. Cannot be disabled.',
      icon: Shield,
      color: 'bg-green-100 text-green-800',
      required: true
    },
    {
      id: 'analytics',
      name: 'Analytics Cookies',
      description: 'Help us understand how visitors interact with our website by collecting anonymous information.',
      icon: BarChart3,
      color: 'bg-blue-100 text-blue-800',
      required: false
    },
    {
      id: 'marketing',
      name: 'Marketing Cookies',
      description: 'Used to track visitors across websites to display relevant and engaging advertisements.',
      icon: Target,
      color: 'bg-purple-100 text-purple-800',
      required: false
    },
    {
      id: 'preferences',
      name: 'Preference Cookies',
      description: 'Remember your choices and preferences to provide a personalized experience.',
      icon: Eye,
      color: 'bg-orange-100 text-orange-800',
      required: false
    }
  ]

  if (!showBanner) return null

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Cookie className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                We use cookies to enhance your experience
              </h3>
              <p className="text-gray-600 mb-4">
                {theme.displayName} uses cookies to provide essential functionality, analyze site usage, 
                and personalize your experience. By continuing to use our site, you consent to our use of cookies 
                in accordance with our <a href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</a>.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleAcceptAll} size="sm">
                  Accept All Cookies
                </Button>
                <Button onClick={handleRejectAll} variant="outline" size="sm">
                  Reject All
                </Button>
                <Dialog open={showSettings} onOpenChange={setShowSettings}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Cookie Settings
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Cookie className="h-5 w-5" />
                        Cookie Preferences
                      </DialogTitle>
                      <DialogDescription>
                        Manage your cookie preferences. You can enable or disable different types of cookies below.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                      {cookieCategories.map((category) => {
                        const Icon = category.icon
                        return (
                          <Card key={category.id}>
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${category.color}`}>
                                    <Icon className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg">{category.name}</CardTitle>
                                    <Badge variant="outline" className={category.color}>
                                      {category.required ? 'Required' : 'Optional'}
                                    </Badge>
                                  </div>
                                </div>
                                <Switch
                                  checked={preferences[category.id as keyof CookiePreferences]}
                                  onCheckedChange={(checked) => {
                                    if (!category.required) {
                                      setPreferences(prev => ({
                                        ...prev,
                                        [category.id]: checked
                                      }))
                                    }
                                  }}
                                  disabled={category.required}
                                />
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-gray-600">{category.description}</p>
                              {category.id === 'necessary' && (
                                <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-700">
                                  <strong>Examples:</strong> Authentication, security, basic functionality
                                </div>
                              )}
                              {category.id === 'analytics' && (
                                <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
                                  <strong>Examples:</strong> Google Analytics, page views, user behavior
                                </div>
                              )}
                              {category.id === 'marketing' && (
                                <div className="mt-2 p-2 bg-purple-50 rounded text-sm text-purple-700">
                                  <strong>Examples:</strong> Ad targeting, social media pixels, remarketing
                                </div>
                              )}
                              {category.id === 'preferences' && (
                                <div className="mt-2 p-2 bg-orange-50 rounded text-sm text-orange-700">
                                  <strong>Examples:</strong> Language settings, theme preferences, location
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button variant="outline" onClick={() => setShowSettings(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSavePreferences}>
                        Save Preferences
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default CookieConsent
