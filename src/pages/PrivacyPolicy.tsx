import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, Lock, Eye, Download, Mail, Phone, MapPin, Calendar } from "lucide-react"
import { useTheme } from "@/contexts/ThemeContext"
import { useNavigate } from "react-router-dom"

const PrivacyPolicy = () => {
  const { theme } = useTheme()
  const navigate = useNavigate()

  const handleDataRequest = (type: string) => {
    // In a real implementation, this would open a form or redirect to a data request portal
    console.log(`Data subject request: ${type}`)
    // For now, we'll show an alert
    alert(`To exercise your ${type} rights, please contact our Data Protection Officer at dpo@${theme.displayName.toLowerCase().replace(/\s+/g, '')}.com`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-lg text-gray-600">
            UK GDPR Compliant Data Protection Policy for {theme.displayName}
          </p>
          <div className="flex justify-center gap-2 mt-4">
            <Badge variant="outline" className="border-green-500 text-green-700">
              UK GDPR Compliant
            </Badge>
            <Badge variant="outline" className="border-blue-500 text-blue-700">
              ISO 27001 Ready
            </Badge>
            <Badge variant="outline" className="border-purple-500 text-purple-700">
              Aviation Security
            </Badge>
          </div>
        </div>

        {/* Last Updated */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>Last updated: {new Date().toLocaleDateString('en-GB')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Data Controller Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Data Controller Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900">Company Details</h4>
              <p className="text-gray-600">
                {theme.displayName} is the data controller for the personal data we process.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-gray-900">Data Protection Officer</h4>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>dpo@{theme.displayName.toLowerCase().replace(/\s+/g, '')}.com</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                  <Phone className="h-4 w-4" />
                  <span>+44 20 7946 0958</span>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Supervisory Authority</h4>
                <p className="text-sm text-gray-600">
                  Information Commissioner's Office (ICO)<br />
                  Wycliffe House, Water Lane<br />
                  Wilmslow, Cheshire SK9 5AF
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Subject Rights */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Your Data Subject Rights (UK GDPR)
            </CardTitle>
            <CardDescription>
              Under UK GDPR, you have the following rights regarding your personal data:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-semibold text-sm">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Right of Access</h4>
                    <p className="text-sm text-gray-600 mb-2">Request a copy of your personal data</p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDataRequest('access')}
                    >
                      Request Data
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 font-semibold text-sm">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Right to Rectification</h4>
                    <p className="text-sm text-gray-600 mb-2">Correct inaccurate personal data</p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDataRequest('rectification')}
                    >
                      Correct Data
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-red-600 font-semibold text-sm">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Right to Erasure</h4>
                    <p className="text-sm text-gray-600 mb-2">Request deletion of your data</p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDataRequest('erasure')}
                    >
                      Delete Data
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-semibold text-sm">4</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Right to Portability</h4>
                    <p className="text-sm text-gray-600 mb-2">Export your data in a portable format</p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDataRequest('portability')}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Export Data
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-600 font-semibold text-sm">5</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Right to Restrict Processing</h4>
                    <p className="text-sm text-gray-600 mb-2">Limit how we use your data</p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDataRequest('restriction')}
                    >
                      Restrict Processing
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-600 font-semibold text-sm">6</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Right to Object</h4>
                    <p className="text-sm text-gray-600 mb-2">Object to certain processing activities</p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDataRequest('objection')}
                    >
                      Object to Processing
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-teal-600 font-semibold text-sm">7</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Rights Related to Automated Decision Making</h4>
                    <p className="text-sm text-gray-600 mb-2">Request human review of automated decisions</p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDataRequest('automated decisions')}
                    >
                      Request Review
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-pink-600 font-semibold text-sm">8</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Right to Withdraw Consent</h4>
                    <p className="text-sm text-gray-600 mb-2">Withdraw consent at any time</p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleDataRequest('withdraw consent')}
                    >
                      Withdraw Consent
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Processing Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              How We Process Your Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Personal Data We Collect</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Name, email address, and staff number</li>
                <li>Shift schedules and work patterns</li>
                <li>Base location and work preferences</li>
                <li>Communication records (swap requests, messages)</li>
                <li>System usage logs and security events</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Lawful Basis for Processing</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h5 className="font-semibold text-blue-900">Contract Performance</h5>
                  <p className="text-sm text-blue-700">Processing necessary for employment contract</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h5 className="font-semibold text-green-900">Legitimate Interest</h5>
                  <p className="text-sm text-green-700">Efficient shift management and operations</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h5 className="font-semibold text-purple-900">Consent</h5>
                  <p className="text-sm text-purple-700">Optional features and communications</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <h5 className="font-semibold text-orange-900">Legal Obligation</h5>
                  <p className="text-sm text-orange-700">Compliance with aviation regulations</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Data Retention</h4>
              <div className="space-y-2 text-gray-600">
                <p><strong>Active employment data:</strong> Retained for duration of employment + 7 years</p>
                <p><strong>Shift records:</strong> Retained for 3 years for operational purposes</p>
                <p><strong>Audit logs:</strong> Retained for 2 years for security monitoring</p>
                <p><strong>Marketing data:</strong> Retained until consent is withdrawn</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Measures */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Measures & Aviation Standards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Technical Safeguards</h4>
                <ul className="space-y-2 text-gray-600">
                  <li>• End-to-end encryption (AES-256)</li>
                  <li>• Multi-factor authentication (2FA)</li>
                  <li>• Role-based access controls</li>
                  <li>• Regular security audits</li>
                  <li>• Intrusion detection systems</li>
                  <li>• Secure data backup procedures</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Aviation Security Compliance</h4>
                <ul className="space-y-2 text-gray-600">
                  <li>• IATA security standards</li>
                  <li>• CAA regulatory compliance</li>
                  <li>• ISO 27001 certification</li>
                  <li>• Staff security clearance verification</li>
                  <li>• Location-based access restrictions</li>
                  <li>• Incident response procedures</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Contact Us</CardTitle>
            <CardDescription>
              For any privacy-related questions or concerns, please contact our Data Protection Officer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Data Protection Officer</h4>
                <div className="space-y-1 text-gray-600">
                  <p>Email: dpo@{theme.displayName.toLowerCase().replace(/\s+/g, '')}.com</p>
                  <p>Phone: +44 20 7946 0958</p>
                  <p>Response time: Within 72 hours</p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Complaints</h4>
                <div className="space-y-1 text-gray-600">
                  <p>You have the right to lodge a complaint with the ICO if you believe we have not handled your data properly.</p>
                  <p>ICO Website: ico.org.uk</p>
                  <p>ICO Helpline: 0303 123 1113</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="text-center">
          <Button 
            onClick={() => navigate(-1)}
            variant="outline"
            className="mr-4"
          >
            Back
          </Button>
          <Button 
            onClick={() => window.print()}
            variant="default"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy
