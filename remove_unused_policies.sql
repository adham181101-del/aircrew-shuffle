-- Remove Unused RLS Policies
-- This script removes specific policies that are not needed or are security risks
-- Run this in your Supabase SQL Editor

SELECT '=== REMOVING UNUSED RLS POLICIES ===' as info;

-- 1. Remove duplicate companies policies
-- There are two identical "Companies are viewable by everyone" policies
DROP POLICY IF EXISTS "Companies are viewable by everyone" ON public.companies;

-- Recreate a single, clean companies policy
CREATE POLICY "Companies are viewable by everyone" 
ON public.companies 
FOR SELECT 
USING (true);

-- 2. Remove overly permissive staff policies that are security risks
DROP POLICY IF EXISTS "Users can view all staff for team features" ON public.staff;

-- 3. Remove overly permissive swap_requests policies that are security risks  
DROP POLICY IF EXISTS "Users can view all swap requests" ON public.swap_requests;

-- 4. Remove unused audit logs policies (if audit logging is not actively used)
-- Uncomment these lines if you don't need audit logging functionality:
/*
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
*/

-- 5. Remove any old policies that may have been replaced by newer ones
-- The following policies were replaced by more specific ones in later migrations:
DROP POLICY IF EXISTS "Users can view their own profile" ON public.staff;
DROP POLICY IF EXISTS "Users can view requests they created or that involve them" ON public.swap_requests;

SELECT '=== VERIFICATION: CURRENT POLICIES ===' as info;

-- Show remaining policies
SELECT 
    tablename,
    policyname,
    cmd as operation,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has conditions'
        ELSE 'No conditions'
    END as restrictions
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

SELECT '=== CLEANUP COMPLETE ===' as info;
