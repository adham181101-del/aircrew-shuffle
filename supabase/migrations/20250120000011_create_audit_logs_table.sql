-- Create audit_logs table for comprehensive logging
-- This table supports GDPR compliance and security monitoring

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
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON public.audit_logs(resource_type);

-- Enable Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for audit logs
CREATE POLICY "Users can view their own audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admin policy (restrict this to specific admin staff numbers)
CREATE POLICY "Admins can view all audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() 
    AND staff_number IN ('ADMIN001', 'ADMIN002', '254575') -- Add admin staff numbers here
  )
);

-- Only system can insert audit logs (this should be restricted to your application only)
CREATE POLICY "System can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.audit_logs IS 'Comprehensive audit logging for GDPR compliance and security monitoring';

-- Create a function to automatically clean up old audit logs (optional)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete audit logs older than 2 years (adjust as needed for your retention policy)
  DELETE FROM public.audit_logs 
  WHERE timestamp < NOW() - INTERVAL '2 years';
  
  -- Log the cleanup action
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    details,
    severity,
    category
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid, -- System user ID
    'audit_log_cleanup',
    'system',
    '{"deleted_count": (SELECT COUNT(*) FROM public.audit_logs WHERE timestamp < NOW() - INTERVAL ''2 years'')}',
    'low',
    'system'
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.cleanup_old_audit_logs TO authenticated;
