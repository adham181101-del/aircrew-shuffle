import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  Lock, 
  FileText, 
  Clock, 
  CheckCircle,
  AlertCircle,
  User,
  Mail,
  Phone,
  Calendar
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useNavigate } from 'react-router-dom'

interface DataRequest {
  id: string
  type: string
  status: 'pending' | 'in-progress' | 'completed' | 'rejected'
  submittedAt: string
  description: string
  estimatedCompletion: string
}

const DataSubjectRights = () => {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [selectedRight, setSelectedRight] = useState('')
  const [requestForm, setRequestForm] = useState({
    email: '',
    fullName: '',
    staffNumber: '',
    requestType: '',
    description: '',
    urgency: 'normal'
  })
  
  const [submittedRequests, setSubmittedRequests] = useState<DataRequest[]>([
    {
      id: '1',
      type: 'Data Access Request',
      status: 'completed',
      submittedAt: '2024-01-15',
      description: 'Request for all personal data held',
      estimatedCompletion: '2024-01-22'
    },
    {
      id: '2',
      type: 'Data Rectification',
      status: 'in-progress',
      submittedAt: '2024-01-20',
      description: 'Update incorrect email address',
      estimatedCompletion: '2024-01-27'
    }
  ])

  const dataRights = [
    {
      id: 'access',
      title: 'Right of Access',
      description: 'Request a copy of all personal data we hold about you',
      icon: Eye,
      color: 'bg-blue-100 text-blue-800',
      estimatedTime: '30 days',
      requirements: ['Email verification', 'Identity confirmation']
    },
    {
      id: 'rectification',
      title: 'Right to Rectification',
      description: 'Correct inaccurate or incomplete personal data',
      icon: Edit,
      color: 'bg-green-100 text-green-800',
      estimatedTime: '7 days',
      requirements: ['Proof of correct information', 'Identity verification']
    },
    {
      id: 'erasure',
      title: 'Right to Erasure',
      description: 'Request deletion of your personal data (where applicable)',
      icon: Trash2,
      color: 'bg-red-100 text-red-800',
      estimatedTime: '30 days',
      requirements: ['Valid reason for deletion', 'Identity verification']
    },
    {
      id: 'portability',
      title: 'Right to Data Portability',
      description: 'Export your data in a machine-readable format',
      icon: Download,
      color: 'bg-purple-100 text-purple-800',
      estimatedTime: '30 days',
      requirements: ['Data format preference', 'Identity verification']
    },
    {
      id: 'restriction',
      title: 'Right to Restrict Processing',
      description: 'Limit how we process your personal data',
      icon: Lock,
      color: 'bg-orange-100 text-orange-800',
      estimatedTime: '7 days',
      requirements: ['Specific restriction request', 'Identity verification']
    },
    {
      id: 'objection',
      title: 'Right to Object',
      description: 'Object to certain types of data processing',
      icon: AlertCircle,
      color: 'bg-yellow-100 text-yellow-800',
      estimatedTime: '7 days',
      requirements: ['Specific objection reason', 'Identity verification']
    }
  ]

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!requestForm.email || !requestForm.fullName || !requestForm.requestType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    // In a real implementation, this would submit to a backend API
    const newRequest: DataRequest = {
      id: Date.now().toString(),
      type: requestForm.requestType,
      status: 'pending',
      submittedAt: new Date().toISOString().split('T')[0],
      description: requestForm.description,
      estimatedCompletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }

    setSubmittedRequests(prev => [newRequest, ...prev])
    
    toast({
      title: "Request Submitted",
      description: "Your data subject request has been submitted successfully. You will receive a confirmation email shortly.",
    })

    // Reset form
    setRequestForm({
      email: '',
      fullName: '',
      staffNumber: '',
      requestType: '',
      description: '',
      urgency: 'normal'
    })
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      'in-progress': { variant: 'default' as const, icon: Clock, color: 'text-blue-600' },
      completed: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      rejected: { variant: 'destructive' as const, icon: AlertCircle, color: 'text-red-600' }
    }
    
    const config = variants[status as keyof typeof variants] || variants.pending
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
            <User className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Data Subject Rights Portal</h1>
          <p className="text-lg text-gray-600">
            Exercise your rights under UK GDPR with {theme.displayName}
          </p>
          <div className="flex justify-center gap-2 mt-4">
            <Badge variant="outline" className="border-green-500 text-green-700">
              UK GDPR Compliant
            </Badge>
            <Badge variant="outline" className="border-blue-500 text-blue-700">
              Secure Processing
            </Badge>
          </div>
        </div>

        {/* Contact Information */}
        <Alert className="mb-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Data Protection Officer:</strong> dpo@{theme.displayName.toLowerCase().replace(/\s+/g, '')}.com | 
            <strong> Response Time:</strong> Within 72 hours | 
            <strong> Processing Time:</strong> Up to 30 days (1 month)
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Available Rights */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Data Subject Rights</h2>
            <div className="space-y-4">
              {dataRights.map((right) => {
                const Icon = right.icon
                return (
                  <Card key={right.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${right.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{right.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {right.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>Processing time: {right.estimatedTime}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Requirements:</p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {right.requirements.map((req, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                {req}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full mt-3"
                          onClick={() => setSelectedRight(right.id)}
                        >
                          Request {right.title}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Request Form */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit a Request</h2>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Data Subject Request Form
                </CardTitle>
                <CardDescription>
                  Fill out this form to exercise your data subject rights under UK GDPR
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitRequest} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={requestForm.fullName}
                        onChange={(e) => setRequestForm(prev => ({ ...prev, fullName: e.target.value }))}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={requestForm.email}
                        onChange={(e) => setRequestForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="your.email@company.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="staffNumber">Staff Number (Optional)</Label>
                    <Input
                      id="staffNumber"
                      value={requestForm.staffNumber}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, staffNumber: e.target.value }))}
                      placeholder="Your staff number"
                    />
                  </div>

                  <div>
                    <Label htmlFor="requestType">Request Type *</Label>
                    <Select 
                      value={requestForm.requestType} 
                      onValueChange={(value) => setRequestForm(prev => ({ ...prev, requestType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select the type of request" />
                      </SelectTrigger>
                      <SelectContent>
                        {dataRights.map((right) => (
                          <SelectItem key={right.id} value={right.title}>
                            {right.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="urgency">Urgency</Label>
                    <Select 
                      value={requestForm.urgency} 
                      onValueChange={(value) => setRequestForm(prev => ({ ...prev, urgency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low - Standard processing time</SelectItem>
                        <SelectItem value="normal">Normal - Standard processing time</SelectItem>
                        <SelectItem value="high">High - Expedited processing</SelectItem>
                        <SelectItem value="urgent">Urgent - Emergency processing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={requestForm.description}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Please describe your request in detail..."
                      rows={4}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Submit Request
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* My Requests */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  My Requests
                </CardTitle>
                <CardDescription>
                  Track the status of your submitted requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {submittedRequests.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No requests submitted yet</p>
                  ) : (
                    submittedRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{request.type}</h4>
                            {getStatusBadge(request.status)}
                          </div>
                          <p className="text-sm text-gray-600 mb-1">{request.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Submitted: {new Date(request.submittedAt).toLocaleDateString('en-GB')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Due: {new Date(request.estimatedCompletion).toLocaleDateString('en-GB')}
                            </span>
                          </div>
                        </div>
                        {request.status === 'completed' && (
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center mt-8">
          <Button 
            onClick={() => navigate(-1)}
            variant="outline"
          >
            Back
          </Button>
        </div>
      </div>
    </div>
  )
}

export default DataSubjectRights
