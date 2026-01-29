// Audit logging system for GDPR compliance and security monitoring
import { supabase } from '@/integrations/supabase/client'

export interface AuditLog {
  id?: string
  user_id: string
  action: string
  resource_type: string
  resource_id?: string
  details: Record<string, any>
  ip_address?: string
  user_agent?: string
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'authentication' | 'data_access' | 'data_modification' | 'system' | 'security' | 'gdpr'
}

// Audit log categories for different types of events
export const AUDIT_CATEGORIES = {
  AUTHENTICATION: 'authentication',
  DATA_ACCESS: 'data_access',
  DATA_MODIFICATION: 'data_modification',
  SYSTEM: 'system',
  SECURITY: 'security',
  GDPR: 'gdpr'
} as const

// Audit log severities
export const AUDIT_SEVERITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const

// Common audit actions
export const AUDIT_ACTIONS = {
  // Authentication
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOGIN_FAILED: 'login_failed',
  PASSWORD_CHANGE: 'password_change',
  TWO_FACTOR_ENABLED: 'two_factor_enabled',
  TWO_FACTOR_DISABLED: 'two_factor_disabled',
  
  // Data Access
  VIEW_SHIFTS: 'view_shifts',
  VIEW_PROFILE: 'view_profile',
  VIEW_TEAM_DATA: 'view_team_data',
  EXPORT_DATA: 'export_data',
  
  // Data Modification
  CREATE_SHIFT: 'create_shift',
  UPDATE_SHIFT: 'update_shift',
  DELETE_SHIFT: 'delete_shift',
  CREATE_SWAP_REQUEST: 'create_swap_request',
  ACCEPT_SWAP: 'accept_swap',
  REJECT_SWAP: 'reject_swap',
  UPDATE_PROFILE: 'update_profile',
  
  // GDPR
  DATA_ACCESS_REQUEST: 'data_access_request',
  DATA_RECTIFICATION_REQUEST: 'data_rectification_request',
  DATA_ERASURE_REQUEST: 'data_erasure_request',
  DATA_PORTABILITY_REQUEST: 'data_portability_request',
  CONSENT_WITHDRAWN: 'consent_withdrawn',
  
  // Security
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  DATA_BREACH_DETECTED: 'data_breach_detected',
  SECURITY_POLICY_VIOLATION: 'security_policy_violation'
} as const

/**
 * Log an audit event
 */
export const logAuditEvent = async (auditData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> => {
  try {
    const auditLog: Omit<AuditLog, 'id'> = {
      ...auditData,
      timestamp: new Date().toISOString(),
      ip_address: await getClientIP(),
      user_agent: navigator.userAgent
    }

    const { error } = await supabase
      .from('audit_logs')
      .insert([auditLog])

    if (error) {
      console.error('Failed to log audit event:', error)
      // In production, you might want to send this to an external logging service
      // as a fallback when the database logging fails
    }
  } catch (error) {
    console.error('Error in audit logging:', error)
  }
}

/**
 * Get client IP address (simplified version)
 * In production, you'd get this from your server-side code
 */
const getClientIP = async (): Promise<string> => {
  try {
    // This is a simplified approach - in production you'd get the real IP
    // from your server or use a service like ipify
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    return data.ip || 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Log authentication events
 */
export const logAuthEvent = async (
  userId: string,
  action: string,
  details: Record<string, any> = {},
  severity: AuditLog['severity'] = 'medium'
): Promise<void> => {
  await logAuditEvent({
    user_id: userId,
    action,
    resource_type: 'authentication',
    details,
    severity,
    category: AUDIT_CATEGORIES.AUTHENTICATION
  })
}

/**
 * Log data access events
 */
export const logDataAccess = async (
  userId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  details: Record<string, any> = {},
  severity: AuditLog['severity'] = 'low'
): Promise<void> => {
  await logAuditEvent({
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details,
    severity,
    category: AUDIT_CATEGORIES.DATA_ACCESS
  })
}

/**
 * Log data modification events
 */
export const logDataModification = async (
  userId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  details: Record<string, any> = {},
  severity: AuditLog['severity'] = 'medium'
): Promise<void> => {
  await logAuditEvent({
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details,
    severity,
    category: AUDIT_CATEGORIES.DATA_MODIFICATION
  })
}

/**
 * Log GDPR-related events
 */
export const logGDPREvent = async (
  userId: string,
  action: string,
  details: Record<string, any> = {},
  severity: AuditLog['severity'] = 'high'
): Promise<void> => {
  await logAuditEvent({
    user_id: userId,
    action,
    resource_type: 'gdpr_request',
    details,
    severity,
    category: AUDIT_CATEGORIES.GDPR
  })
}

/**
 * Log security events
 */
export const logSecurityEvent = async (
  userId: string,
  action: string,
  details: Record<string, any> = {},
  severity: AuditLog['severity'] = 'high'
): Promise<void> => {
  await logAuditEvent({
    user_id: userId,
    action,
    resource_type: 'security',
    details,
    severity,
    category: AUDIT_CATEGORIES.SECURITY
  })
}

/**
 * Get audit logs for a user (admin function)
 */
export const getAuditLogs = async (
  userId?: string,
  category?: string,
  severity?: string,
  limit: number = 100
): Promise<AuditLog[]> => {
  try {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (severity) {
      query = query.eq('severity', severity)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch audit logs:', error)
      return []
    }

    return (data || []) as AuditLog[]
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return []
  }
}

/**
 * Create audit logs table (migration function)
 */
export const createAuditLogsTable = `
-- Create audit_logs table for comprehensive logging
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB NOT NULL DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  category TEXT NOT NULL CHECK (category IN ('authentication', 'data_access', 'data_modification', 'system', 'security', 'gdpr')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON public.audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- Enable Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for audit logs
CREATE POLICY "Users can view their own audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admin policy (you might want to restrict this further)
CREATE POLICY "Admins can view all audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() 
    AND staff_number IN ('ADMIN001', 'ADMIN002') -- Define admin staff numbers
  )
);

-- Only system can insert audit logs
CREATE POLICY "System can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (true); -- This should be restricted to your application only

-- Add comment
COMMENT ON TABLE public.audit_logs IS 'Comprehensive audit logging for GDPR compliance and security monitoring';
`
