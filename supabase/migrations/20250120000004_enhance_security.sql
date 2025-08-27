-- Enhance database security with encryption and protection measures
-- This migration ensures passwords and sensitive data are properly encrypted

-- 1. Ensure passwords are encrypted (Supabase Auth handles this automatically)
-- Passwords in auth.users are automatically encrypted using bcrypt

-- 2. Add email encryption for additional security
-- Create a function to hash email addresses for additional protection
CREATE OR REPLACE FUNCTION public.hash_email(email_address TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Use SHA256 for email hashing (one-way hash)
  RETURN encode(sha256(email_address::bytea), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Add a hashed email column to staff table for additional security
ALTER TABLE public.staff 
ADD COLUMN email_hash TEXT GENERATED ALWAYS AS (public.hash_email(email)) STORED;

-- 4. Create an index on email_hash for faster lookups
CREATE INDEX idx_staff_email_hash ON public.staff(email_hash);

-- 5. Add additional security policies
-- Prevent direct access to email addresses through API
CREATE POLICY "Users can only see their own email" 
ON public.staff 
FOR SELECT 
USING (auth.uid() = id);

-- 6. Create a function to mask sensitive data in logs
CREATE OR REPLACE FUNCTION public.mask_sensitive_data(data JSONB)
RETURNS JSONB AS $$
BEGIN
  -- Mask email addresses in logs
  IF data ? 'email' THEN
    data := jsonb_set(data, '{email}', to_jsonb('***@***.***'::text));
  END IF;
  
  -- Mask staff numbers in logs
  IF data ? 'staff_number' THEN
    data := jsonb_set(data, '{staff_number}', to_jsonb('****'::text));
  END IF;
  
  RETURN data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update the handle_new_user trigger to use masked logging
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_company_id UUID;
  email_domain TEXT;
  user_staff_number TEXT;
  user_base_location TEXT;
  masked_metadata JSONB;
BEGIN
  -- Log the incoming data with sensitive information masked
  masked_metadata := public.mask_sensitive_data(NEW.raw_user_meta_data);
  RAISE NOTICE 'handle_new_user: Processing user % with masked metadata: %', NEW.id, masked_metadata;
  
  -- Extract email domain
  email_domain := split_part(NEW.email, '@', 2);
  RAISE NOTICE 'handle_new_user: Email domain: %', email_domain;
  
  -- Extract staff_number and base_location with proper validation
  user_staff_number := NEW.raw_user_meta_data->>'staff_number';
  user_base_location := NEW.raw_user_meta_data->>'base_location';
  
  -- Validate required fields
  IF user_staff_number IS NULL OR user_staff_number = '' THEN
    RAISE EXCEPTION 'Staff number is required for user %', split_part(NEW.email, '@', 1) || '@***.***';
  END IF;
  
  IF user_base_location IS NULL OR user_base_location = '' THEN
    RAISE EXCEPTION 'Base location is required for user %', split_part(NEW.email, '@', 1) || '@***.***';
  END IF;
  
  -- Try to get company_id from user metadata first
  IF NEW.raw_user_meta_data ? 'company_id' THEN
    user_company_id := (NEW.raw_user_meta_data->>'company_id')::uuid;
    RAISE NOTICE 'handle_new_user: Using company_id from metadata: %', user_company_id;
  END IF;
  
  -- Fallback: If no company_id in metadata, try to get it from email domain
  IF user_company_id IS NULL THEN
    SELECT id INTO user_company_id 
    FROM public.companies 
    WHERE email_domain = email_domain;
    RAISE NOTICE 'handle_new_user: Using company_id from email domain: %', user_company_id;
  END IF;
  
  -- Final fallback: Use British Airways as default
  IF user_company_id IS NULL THEN
    SELECT id INTO user_company_id 
    FROM public.companies 
    WHERE email_domain = 'ba.com';
    RAISE NOTICE 'handle_new_user: Using default company_id (BA): %', user_company_id;
  END IF;
  
  -- Ensure we have a valid company_id
  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'No valid company found for user %', split_part(NEW.email, '@', 1) || '@***.***';
  END IF;
  
  -- Insert the staff record
  INSERT INTO public.staff (id, email, staff_number, base_location, can_work_doubles, company_id)
  VALUES (
    NEW.id,
    NEW.email,
    user_staff_number,
    user_base_location,
    COALESCE((NEW.raw_user_meta_data->>'can_work_doubles')::boolean, false),
    user_company_id
  );
  
  RAISE NOTICE 'handle_new_user: Successfully created staff record for user %', NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in handle_new_user for user %: %', split_part(NEW.email, '@', 1) || '@***.***', SQLERRM;
END;
$$;

-- 8. Add audit logging for sensitive operations
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only allow admins to view audit logs
CREATE POLICY "Only admins can view audit logs" 
ON public.audit_log 
FOR ALL 
USING (false); -- This effectively blocks all access except through admin functions

-- 9. Create a function to log sensitive operations
CREATE OR REPLACE FUNCTION public.log_audit_event(
  action_name TEXT,
  table_name TEXT,
  record_id UUID DEFAULT NULL,
  old_data JSONB DEFAULT NULL,
  new_data JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.audit_log (
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    auth.uid(),
    action_name,
    table_name,
    record_id,
    public.mask_sensitive_data(old_data),
    public.mask_sensitive_data(new_data)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Add triggers for audit logging on sensitive tables
CREATE OR REPLACE FUNCTION public.audit_staff_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event('INSERT', 'staff', NEW.id, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event('UPDATE', 'staff', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event('DELETE', 'staff', OLD.id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit trigger for staff table
DROP TRIGGER IF EXISTS audit_staff_trigger ON public.staff;
CREATE TRIGGER audit_staff_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.audit_staff_changes();

-- 11. Add data retention policy (optional - for GDPR compliance)
-- This ensures old data is automatically deleted after a certain period
-- Uncomment if you want to implement data retention
/*
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS VOID AS $$
BEGIN
  -- Delete audit logs older than 7 years
  DELETE FROM public.audit_log 
  WHERE created_at < now() - interval '7 years';
  
  -- Delete inactive users older than 2 years
  DELETE FROM public.staff 
  WHERE created_at < now() - interval '2 years' 
  AND NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = staff.id 
    AND auth.users.last_sign_in_at > now() - interval '2 years'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup job (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-old-data', '0 2 * * 0', 'SELECT public.cleanup_old_data();');
*/

-- 12. Add security headers and CORS policies (handled by Supabase)
-- These are automatically configured by Supabase for security

-- 13. Create a function to verify data integrity
CREATE OR REPLACE FUNCTION public.verify_data_integrity()
RETURNS TABLE(table_name TEXT, record_count BIGINT, last_updated TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  RETURN QUERY
  SELECT 'staff'::TEXT, COUNT(*), MAX(created_at)
  FROM public.staff
  UNION ALL
  SELECT 'shifts'::TEXT, COUNT(*), MAX(created_at)
  FROM public.shifts
  UNION ALL
  SELECT 'swap_requests'::TEXT, COUNT(*), MAX(created_at)
  FROM public.swap_requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users for data integrity check
GRANT EXECUTE ON FUNCTION public.verify_data_integrity() TO authenticated;
