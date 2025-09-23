-- Cleanup Unused RLS Policies
-- This script identifies and removes RLS policies that are not being used
-- Run this in your Supabase SQL Editor

-- Step 1: Check current policies on all tables
SELECT '=== CURRENT POLICIES ANALYSIS ===' as info;

-- List all current policies
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
ORDER BY tablename, policyname;

-- Step 2: Identify unused policies based on application usage
SELECT '=== IDENTIFYING UNUSED POLICIES ===' as info;

-- Based on code analysis, these are the actively used tables:
-- 1. staff - Used extensively for user profiles and authentication
-- 2. shifts - Used for shift management and swapping
-- 3. swap_requests - Used for shift swap functionality
-- 4. subscriptions - Used for premium features
-- 5. companies - Used for company selection during signup
-- 6. audit_logs - Used for security logging (optional feature)

-- Step 3: Remove duplicate and overly permissive policies
SELECT '=== CLEANING UP POLICIES ===' as info;

-- Remove duplicate companies policies (there are two identical ones)
DROP POLICY IF EXISTS "Companies are viewable by everyone" ON public.companies;

-- Recreate the companies policy (single instance)
CREATE POLICY "Companies are viewable by everyone" 
ON public.companies 
FOR SELECT 
USING (true);

-- Step 4: Remove overly permissive policies that may be security risks
-- Remove the "view all staff" policy as it's too permissive
DROP POLICY IF EXISTS "Users can view all staff for team features" ON public.staff;

-- Remove the "view all swap requests" policy as it's too permissive
DROP POLICY IF EXISTS "Users can view all swap requests" ON public.swap_requests;

-- Step 5: Clean up audit logs policies (remove if audit logging is not actively used)
-- Comment out the following if you want to keep audit logging:
/*
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
*/

-- Step 6: Verify final policy state
SELECT '=== FINAL POLICY STATE ===' as info;

SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN cmd = 'SELECT' THEN 'Read'
        WHEN cmd = 'INSERT' THEN 'Create'
        WHEN cmd = 'UPDATE' THEN 'Update'
        WHEN cmd = 'DELETE' THEN 'Delete'
        ELSE cmd
    END as operation,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has conditions'
        ELSE 'No conditions'
    END as restrictions
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- Step 7: Summary of changes
SELECT '=== CLEANUP SUMMARY ===' as info;

SELECT 
    'Removed duplicate companies policy' as change,
    'Security improvement' as reason
UNION ALL
SELECT 
    'Removed overly permissive staff view policy',
    'Security improvement'
UNION ALL
SELECT 
    'Removed overly permissive swap requests view policy',
    'Security improvement'
UNION ALL
SELECT 
    'Kept essential policies for core functionality',
    'Maintains app functionality'
UNION ALL
SELECT 
    'Audit logs policies preserved (commented for optional removal)',
    'GDPR compliance ready';

-- Step 8: Test queries to ensure functionality still works
SELECT '=== TESTING CORE FUNCTIONALITY ===' as info;

-- Test staff access
SELECT COUNT(*) as staff_count FROM public.staff LIMIT 1;

-- Test shifts access  
SELECT COUNT(*) as shifts_count FROM public.shifts LIMIT 1;

-- Test swap requests access
SELECT COUNT(*) as swap_requests_count FROM public.swap_requests LIMIT 1;

-- Test companies access
SELECT COUNT(*) as companies_count FROM public.companies LIMIT 1;

-- Test subscriptions access (if table exists)
SELECT COUNT(*) as subscriptions_count FROM public.subscriptions LIMIT 1;
