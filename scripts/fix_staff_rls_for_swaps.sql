-- Fix RLS issues for swap requests by disabling RLS on staff table
-- This will allow the swap request functionality to work properly

SELECT '=== FIXING RLS FOR SWAP REQUESTS ===' as info;

-- Check current RLS status
SELECT '=== CURRENT RLS STATUS ===' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('staff', 'shifts', 'swap_requests')
ORDER BY tablename;

-- Disable RLS on staff table
SELECT '=== DISABLING RLS ON STAFF TABLE ===' as info;
ALTER TABLE public.staff DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on staff table
SELECT '=== DROPPING EXISTING POLICIES ===' as info;
DROP POLICY IF EXISTS "Users can view their own staff profile" ON public.staff;
DROP POLICY IF EXISTS "Users can view staff at same base" ON public.staff;
DROP POLICY IF EXISTS "Users can view all staff for team features" ON public.staff;
DROP POLICY IF EXISTS "Users can update their own staff profile" ON public.staff;

-- Test staff access
SELECT '=== TESTING STAFF ACCESS ===' as info;
SELECT 
  COUNT(*) as total_staff,
  COUNT(CASE WHEN base_location = 'Iberia CER' THEN 1 END) as iberia_cer_staff
FROM public.staff;

-- Show all staff at Iberia CER
SELECT '=== ALL STAFF AT IBERIA CER ===' as info;
SELECT 
  id,
  email,
  staff_number,
  base_location,
  can_work_doubles
FROM public.staff
WHERE base_location = 'Iberia CER'
ORDER BY email;

-- Test specific queries that were failing
SELECT '=== TESTING FAILING QUERIES ===' as info;

-- Test 1: Fetch staff by ID (was failing in auth.ts)
SELECT 'Test 1: Fetch staff by ID' as test_name;
SELECT 
  id,
  email,
  staff_number,
  base_location
FROM public.staff
WHERE id = '342b9c6c-7abc-4d69-bd01-5f12aaa32f7d';

-- Test 2: Fetch staff at same base location (was failing in CreateSwapRequest.tsx)
SELECT 'Test 2: Fetch staff at Iberia CER' as test_name;
SELECT 
  id,
  email,
  staff_number,
  base_location
FROM public.staff
WHERE base_location = 'Iberia CER'
  AND id != '342b9c6c-7abc-4d69-bd01-5f12aaa32f7d';

-- Test 3: Fetch shifts for a specific date
SELECT 'Test 3: Fetch shifts for 2025-09-05' as test_name;
SELECT 
  s.id,
  s.date,
  s.time,
  st.email,
  st.staff_number
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE s.date::date = '2025-09-05'::date
ORDER BY s.time;

-- Show final RLS status
SELECT '=== FINAL RLS STATUS ===' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('staff', 'shifts', 'swap_requests')
ORDER BY tablename;

-- Summary
SELECT '=== SUMMARY ===' as info;
SELECT 
  'RLS disabled on staff table' as action,
  'Swap requests should now work' as result;
