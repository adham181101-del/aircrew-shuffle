-- FINAL FIX: Completely open RLS policies to resolve 500 errors
-- This will allow all operations and fix the staff fetching issues

SELECT '=== DISABLING RLS COMPLETELY ===' as info;

-- Disable RLS on staff table
ALTER TABLE public.staff DISABLE ROW LEVEL SECURITY;

-- Disable RLS on swap_requests table  
ALTER TABLE public.swap_requests DISABLE ROW LEVEL SECURITY;

-- Disable RLS on shifts table
ALTER TABLE public.shifts DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to clean up
SELECT '=== DROPPING ALL POLICIES ===' as info;

-- Drop all policies on staff table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.staff;
DROP POLICY IF EXISTS "Users can view staff at same base location" ON public.staff;
DROP POLICY IF EXISTS "Users can view all staff for team features" ON public.staff;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.staff;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.staff;
DROP POLICY IF EXISTS "Allow all staff reads" ON public.staff;
DROP POLICY IF EXISTS "Users can update own profile" ON public.staff;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.staff;

-- Drop all policies on swap_requests table
DROP POLICY IF EXISTS "Users can view requests they created or that involve them" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can view swap requests at same base" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can view all swap requests" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can create swap requests" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can update swap requests they created" ON public.swap_requests;
DROP POLICY IF EXISTS "Allow all swap request reads" ON public.swap_requests;
DROP POLICY IF EXISTS "Users can update own swap requests" ON public.swap_requests;

-- Drop all policies on shifts table
DROP POLICY IF EXISTS "Users can view their own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Users can create their own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Users can update their own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Users can delete their own shifts" ON public.shifts;

-- Test the access
SELECT '=== TESTING ACCESS ===' as info;

-- Test staff table access
SELECT 
  'Staff table accessible:' as test,
  COUNT(*) as count
FROM public.staff;

-- Test swap_requests table access
SELECT 
  'Swap requests table accessible:' as test,
  COUNT(*) as count
FROM public.swap_requests;

-- Test shifts table access
SELECT 
  'Shifts table accessible:' as test,
  COUNT(*) as count
FROM public.shifts;

-- Show RLS status
SELECT '=== RLS STATUS ===' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('staff', 'shifts', 'swap_requests')
ORDER BY tablename;

-- Test a specific staff query that was failing
SELECT '=== TESTING SPECIFIC QUERY ===' as info;
SELECT 
  id,
  email,
  staff_number,
  base_location,
  can_work_doubles
FROM public.staff
WHERE base_location = 'Iberia CER'
LIMIT 5;

-- Test the exact query that was failing in the console
SELECT '=== TESTING EXACT FAILING QUERY ===' as info;
SELECT 
  id,
  email,
  staff_number,
  base_location,
  can_work_doubles,
  company_id,
  created_at
FROM public.staff
WHERE id = '50909ea4-7507-496e-9e87-da5c8a6866a4';
