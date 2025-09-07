import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  Lock, 
  Eye, 
  Download,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  UserCheck,
  UserX,
  Database,
  FileText
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { getAuditLogs, type AuditLog, AUDIT_CATEGORIES, AUDIT_SEVERITIES } from '@/lib/audit'

const SecurityDashboard = () => {
  const { theme } = useTheme()
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedSeverity, setSelectedSeverity] = useState('all')
  const [timeRange, setTimeRange] = useState('24h')

  useEffect(() => {
    loadAuditLogs()
  }, [selectedCategory, selectedSeverity, timeRange])

  const loadAuditLogs = async () => {
    setLoading(true)
    try {
      const logs = await getAuditLogs(undefined, selectedCategory === 'all' ? undefined : selectedCategory, selectedSeverity === 'all' ? undefined : selectedSeverity)
      setAuditLogs(logs)
    } catch (error) {
      console.error('Failed to load audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate security metrics
  const securityMetrics = {
    totalEvents: auditLogs.length,
    criticalEvents: auditLogs.filter(log => log.severity === 'critical').length,
    highSeverityEvents: auditLogs.filter(log => log.severity === 'high').length,
    failedLogins: auditLogs.filter(log => log.action === 'login_failed').length,
    dataAccessEvents: auditLogs.filter(log => log.category === 'data_access').length,
    gdprRequests: auditLogs.filter(log => log.category === 'gdpr').length,
    uniqueUsers: new Set(auditLogs.map(log => log.user_id)).size
  }

  const getSeverityBadge = (severity: string) => {
    const variants = {
      low: { variant: 'secondary' as const, color: 'text-gray-600' },
      medium: { variant: 'default' as const, color: 'text-blue-600' },
      high: { variant: 'destructive' as const, color: 'text-orange-600' },
      critical: { variant: 'destructive' as const, color: 'text-red-600' }
    }
    
    const config = variants[severity as keyof typeof variants] || variants.low
    
    return (
      <Badge variant={config.variant} className={config.color}>
        {severity.toUpperCase()}
      </Badge>
    )
  }

  const getCategoryIcon = (category: string) => {
    const icons = {
      authentication: UserCheck,
      data_access: Eye,
      data_modification: Database,
      system: Activity,
      security: Shield,
      gdpr: FileText
    }
    
    const Icon = icons[category as keyof typeof icons] || Activity
    return <Icon className="h-4 w-4" />
  }

  const recentCriticalEvents = auditLogs
    .filter(log => log.severity === 'critical' || log.severity === 'high')
    .slice(0, 5)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Security Dashboard</h1>
          <p className="text-lg text-gray-600">
            Real-time security monitoring and audit trail for {theme.displayName}
          </p>
          <div className="flex justify-center gap-2 mt-4">
            <Badge variant="outline" className="border-red-500 text-red-700">
              Security Monitoring
            </Badge>
            <Badge variant="outline" className="border-blue-500 text-blue-700">
              GDPR Compliance
            </Badge>
            <Badge variant="outline" className="border-green-500 text-green-700">
              ISO 27001
            </Badge>
          </div>
        </div>

        {/* Security Alerts */}
        {securityMetrics.criticalEvents > 0 && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Security Alert:</strong> {securityMetrics.criticalEvents} critical security event(s) detected. 
              Immediate attention required.
            </AlertDescription>
          </Alert>
        )}

        {/* Security Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{securityMetrics.totalEvents}</div>
              <p className="text-xs text-muted-foreground">
                Last 24 hours
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{securityMetrics.criticalEvents}</div>
              <p className="text-xs text-muted-foreground">
                Requires immediate action
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
              <UserX className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{securityMetrics.failedLogins}</div>
              <p className="text-xs text-muted-foreground">
                Potential security threats
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{securityMetrics.uniqueUsers}</div>
              <p className="text-xs text-muted-foreground">
                Unique users in period
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Security Event Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="authentication">Authentication</SelectItem>
                    <SelectItem value="data_access">Data Access</SelectItem>
                    <SelectItem value="data_modification">Data Modification</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="gdpr">GDPR</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Severity</label>
                <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Time Range</label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">Last Hour</SelectItem>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button onClick={loadAuditLogs} variant="outline">
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="events" className="space-y-6">
          <TabsList>
            <TabsTrigger value="events">Security Events</TabsTrigger>
            <TabsTrigger value="critical">Critical Alerts</TabsTrigger>
            <TabsTrigger value="gdpr">GDPR Compliance</TabsTrigger>
            <TabsTrigger value="reports">Security Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Security Events ({auditLogs.length})
                </CardTitle>
                <CardDescription>
                  Real-time audit trail of all security-related events
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading security events...</p>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-600">No security events found for the selected filters</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(log.category)}
                            <span className="font-medium">{log.action}</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {log.resource_type}
                            {log.resource_id && ` (${log.resource_id})`}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(log.timestamp).toLocaleString('en-GB')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getSeverityBadge(log.severity)}
                          <Badge variant="outline">
                            {log.category}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="critical" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Critical Security Alerts
                </CardTitle>
                <CardDescription>
                  High-priority security events requiring immediate attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentCriticalEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-600">No critical security events detected</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentCriticalEvents.map((log) => (
                      <Alert key={log.id} className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription>
                          <div className="flex items-center justify-between">
                            <div>
                              <strong className="text-red-800">{log.action}</strong>
                              <p className="text-red-700 text-sm mt-1">
                                {log.resource_type} - {new Date(log.timestamp).toLocaleString('en-GB')}
                              </p>
                              {log.details && Object.keys(log.details).length > 0 && (
                                <p className="text-red-600 text-xs mt-1">
                                  Details: {JSON.stringify(log.details)}
                                </p>
                              )}
                            </div>
                            <Button size="sm" variant="destructive">
                              Investigate
                            </Button>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gdpr" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    GDPR Requests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{securityMetrics.gdprRequests}</div>
                  <p className="text-sm text-gray-600">Data subject requests in period</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Data Access Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{securityMetrics.dataAccessEvents}</div>
                  <p className="text-sm text-gray-600">Personal data access events</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>GDPR Compliance Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Data Subject Rights Portal</span>
                    </div>
                    <Badge variant="default" className="bg-green-600">Active</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Audit Logging</span>
                    </div>
                    <Badge variant="default" className="bg-green-600">Active</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Data Retention Policies</span>
                    </div>
                    <Badge variant="default" className="bg-green-600">Active</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Privacy Policy</span>
                    </div>
                    <Badge variant="default" className="bg-green-600">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Security Reports
                </CardTitle>
                <CardDescription>
                  Generate and download security compliance reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                    <FileText className="h-6 w-6 mb-2" />
                    <span>GDPR Compliance Report</span>
                  </Button>
                  
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                    <Shield className="h-6 w-6 mb-2" />
                    <span>Security Audit Report</span>
                  </Button>
                  
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                    <Activity className="h-6 w-6 mb-2" />
                    <span>Activity Log Report</span>
                  </Button>
                  
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                    <Users className="h-6 w-6 mb-2" />
                    <span>User Access Report</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default SecurityDashboard
