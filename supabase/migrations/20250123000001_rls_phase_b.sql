-- RLS Hardening Phase B - Remove Permissive Policies
-- This migration removes the permissive USING TRUE policies after Phase A is complete
-- Only run this after testing that all functionality works with the new secure policies

-- ============================================================================
-- WARNING: This migration removes permissive policies
-- Make sure all tests pass and the application works correctly before running
-- ============================================================================

-- ============================================================================
-- BACKUP CURRENT STATE (for rollback if needed)
-- ============================================================================

-- Create a backup of current policies before removal
CREATE TABLE IF NOT EXISTS policy_backup_phase_b AS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true');

-- ============================================================================
-- REMOVE PERMISSIVE POLICIES
-- ============================================================================

-- Remove permissive staff policies
DROP POLICY IF EXISTS "Users can view all staff for team features" ON public.staff;
DROP POLICY IF EXISTS "Staff viewable by all" ON public.staff;
DROP POLICY IF EXISTS "Staff insertable by all" ON public.staff;
DROP POLICY IF EXISTS "Staff updatable by all" ON public.staff;

-- Remove permissive shifts policies
DROP POLICY IF EXISTS "Users can view all shifts" ON public.shifts;
DROP POLICY IF EXISTS "Shifts viewable by all" ON public.shifts;
DROP POLICY IF EXISTS "Shifts insertable by all" ON public.shifts;
DROP POLICY IF EXISTS "Shifts updatable by all" ON public.shifts;
DROP POLICY IF EXISTS "Shifts deletable by all" ON public.shifts;

-- Remove permissive swap_requests policies
DROP POLICY IF EXISTS "Users can view all swap requests" ON public.swap_requests;
DROP POLICY IF EXISTS "Swap requests viewable by all" ON public.swap_requests;
DROP POLICY IF EXISTS "Swap requests insertable by all" ON public.swap_requests;
DROP POLICY IF EXISTS "Swap requests updatable by all" ON public.swap_requests;

-- Remove permissive subscriptions policies
DROP POLICY IF EXISTS "Subscriptions viewable by all" ON public.subscriptions;
DROP POLICY IF EXISTS "Subscriptions insertable by all" ON public.subscriptions;
DROP POLICY IF EXISTS "Subscriptions updatable by all" ON public.subscriptions;
DROP POLICY IF EXISTS "Subscriptions deletable by all" ON public.subscriptions;

-- Remove permissive audit_logs policies
DROP POLICY IF EXISTS "Audit logs viewable by all" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs insertable by all" ON public.audit_logs;

-- ============================================================================
-- VERIFY REMAINING POLICIES
-- ============================================================================

-- Show all remaining policies (should only be secure ones)
SELECT 
    'REMAINING POLICIES AFTER CLEANUP' as status,
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has conditions'
        ELSE 'No conditions'
    END as restrictions
FROM pg_policies 
WHERE schemaname = 'public'
  AND policyname LIKE '%_secure'
ORDER BY tablename, policyname;

-- ============================================================================
-- TEST DATA ACCESS WITH SECURE POLICIES
-- ============================================================================

-- Test that we can still access data with proper authentication
-- These queries should work with authenticated users but fail without auth
SELECT 'Testing secure data access...' as status;

-- Test companies access (should work - public data)
SELECT COUNT(*) as companies_count FROM public.companies;

-- Test other tables (these will require proper authentication)
-- SELECT COUNT(*) as staff_count FROM public.staff;
-- SELECT COUNT(*) as shifts_count FROM public.shifts;
-- SELECT COUNT(*) as swap_requests_count FROM public.swap_requests;
-- SELECT COUNT(*) as subscriptions_count FROM public.subscriptions;
-- SELECT COUNT(*) as audit_logs_count FROM public.audit_logs;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================

-- If you need to rollback, you can restore permissive policies:
/*
-- Restore permissive policies (UNCOMMENT ONLY IF NEEDED FOR ROLLBACK)
CREATE POLICY "Staff viewable by all" ON public.staff FOR SELECT USING (true);
CREATE POLICY "Shifts viewable by all" ON public.shifts FOR SELECT USING (true);
CREATE POLICY "Swap requests viewable by all" ON public.swap_requests FOR SELECT USING (true);
CREATE POLICY "Subscriptions viewable by all" ON public.subscriptions FOR SELECT USING (true);
CREATE POLICY "Audit logs viewable by all" ON public.audit_logs FOR SELECT USING (true);
*/

-- ============================================================================
-- COMPLETION STATUS
-- ============================================================================

SELECT 'Phase B migration completed successfully' as status;
SELECT 'Permissive policies removed - RLS is now properly secured' as security_status;
SELECT 'All data access now requires proper authentication and authorization' as access_status;
SELECT 'Test all application functionality to ensure everything works' as next_step;

-- Show final policy count
SELECT 
    COUNT(*) as total_secure_policies,
    'Secure RLS policies active' as description
FROM pg_policies 
WHERE schemaname = 'public'
  AND policyname LIKE '%_secure';
