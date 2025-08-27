-- Fix RLS policies to resolve 42P17 error
-- This version is more conservative and should work

-- First, let's check what columns actually exist
SELECT '=== CHECKING TABLE SCHEMAS ===' as info;

-- Check staff table columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'staff' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check swap_requests table columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'swap_requests' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Now let's drop all existing policies and recreate them safely
SELECT '=== DROPPING EXISTING POLICIES ===' as info;

-- Drop all existing policies on staff table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.staff;
DROP POLICY IF EXISTS "Users can view staff at same base location" ON public.staff;
DROP POLICY IF EXISTS "Users can view all staff for team features" ON public.staff;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.staff;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.staff;

-- Drop all existing policies on swap_requests table
DROP POLICY IF EXISTS "Users can view requests they created or that involve them" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can view swap requests at same base" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can view all swap requests" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can create swap requests" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can update swap requests they created" ON public.swap_requests;

-- Now create simple, working policies
SELECT '=== CREATING NEW POLICIES ===' as info;

-- Simple policy: Allow all SELECT operations on staff table
CREATE POLICY "Allow all staff reads" 
ON public.staff 
FOR SELECT 
USING (true);

-- Simple policy: Allow users to update their own profile
CREATE POLICY "Users can update own profile" 
ON public.staff 
FOR UPDATE 
USING (auth.uid() = id);

-- Simple policy: Allow users to insert their own profile
CREATE POLICY "Users can insert own profile" 
ON public.staff 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Simple policy: Allow all SELECT operations on swap_requests table
CREATE POLICY "Allow all swap request reads" 
ON public.swap_requests 
FOR SELECT 
USING (true);

-- Simple policy: Allow users to create swap requests
CREATE POLICY "Users can create swap requests" 
ON public.swap_requests 
FOR INSERT 
WITH CHECK (auth.uid() = requester_id);

-- Simple policy: Allow users to update swap requests they created
CREATE POLICY "Users can update own swap requests" 
ON public.swap_requests 
FOR UPDATE 
USING (auth.uid() = requester_id OR auth.uid() = accepter_id);

-- Test the policies
SELECT '=== TESTING POLICIES ===' as info;

-- Test staff access
SELECT 
  'Staff table accessible:' as test,
  COUNT(*) as count
FROM public.staff;

-- Test swap_requests access
SELECT 
  'Swap requests table accessible:' as test,
  COUNT(*) as count
FROM public.swap_requests;

-- Show current policies
SELECT '=== CURRENT POLICIES ===' as info;
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
AND tablename IN ('staff', 'swap_requests')
ORDER BY tablename, policyname;
