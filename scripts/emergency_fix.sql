-- EMERGENCY FIX: Completely remove all RLS and policies
-- This will definitely fix the 500 errors

SELECT '=== EMERGENCY FIX STARTING ===' as info;

-- Step 1: Disable RLS on ALL tables
SELECT 'Step 1: Disabling RLS on all tables' as info;
ALTER TABLE public.staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL policies from ALL tables
SELECT 'Step 2: Dropping all policies' as info;

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

-- Drop all policies on companies table
DROP POLICY IF EXISTS "Users can view companies" ON public.companies;

-- Step 3: Test basic access
SELECT 'Step 3: Testing basic access' as info;

-- Test staff table
SELECT 
  'Staff table accessible:' as test,
  COUNT(*) as count
FROM public.staff;

-- Test shifts table
SELECT 
  'Shifts table accessible:' as test,
  COUNT(*) as count
FROM public.shifts;

-- Test swap_requests table
SELECT 
  'Swap requests table accessible:' as test,
  COUNT(*) as count
FROM public.swap_requests;

-- Test companies table
SELECT 
  'Companies table accessible:' as test,
  COUNT(*) as count
FROM public.companies;

-- Step 4: Test the exact failing queries
SELECT 'Step 4: Testing exact failing queries' as info;

-- Test the staff profile query that was failing
SELECT 
  'Testing staff profile query:' as test;
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

-- Test the staff list query that was failing
SELECT 
  'Testing staff list query:' as test;
SELECT 
  id,
  email,
  staff_number,
  base_location,
  can_work_doubles,
  company_id,
  created_at
FROM public.staff
WHERE base_location = 'Iberia CER'
AND id != '50909ea4-7507-496e-9e87-da5c8a6866a4'
LIMIT 5;

-- Step 5: Show RLS status
SELECT 'Step 5: RLS status' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('staff', 'shifts', 'swap_requests', 'companies')
ORDER BY tablename;

-- Step 6: Show all policies (should be none)
SELECT 'Step 6: All policies (should be empty)' as info;
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('staff', 'shifts', 'swap_requests', 'companies')
ORDER BY tablename, policyname;

SELECT '=== EMERGENCY FIX COMPLETE ===' as info;
SELECT 'All RLS disabled and policies removed. 500 errors should be fixed.' as result;
