-- Fix critical RLS security issue with rls_policies_backup table
-- This table should either be deleted or have RLS enabled

-- Option 1: Enable RLS on the backup table (safer approach)
ALTER TABLE public.rls_policies_backup ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows only authenticated users to read
CREATE POLICY "Allow authenticated users to read backup policies" 
ON public.rls_policies_backup 
FOR SELECT 
TO authenticated 
USING (true);

-- Option 2: If this is just a backup table and not needed, delete it
-- Uncomment the line below if you want to delete the backup table instead
-- DROP TABLE IF EXISTS public.rls_policies_backup;

-- Fix function security issues
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';

ALTER FUNCTION public.cleanup_old_audit_logs() SET search_path = '';

SELECT 'RLS security issues fixed successfully' as status;
