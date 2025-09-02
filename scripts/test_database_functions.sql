-- Test script to verify database functions and RLS policies
-- Run this after applying the fix_staff_rls_for_swaps.sql script

-- 1. Check if the functions exist
SELECT '=== CHECKING FUNCTIONS ===' as info;

SELECT 
  routine_name, 
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name IN ('get_all_staff_for_team', 'get_eligible_staff_for_swap')
ORDER BY routine_name;

-- 2. Check RLS policies
SELECT '=== CHECKING RLS POLICIES ===' as info;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('staff', 'swap_requests')
ORDER BY tablename, policyname;

-- 3. Test staff access (should work for authenticated users)
SELECT '=== TESTING STAFF ACCESS ===' as info;

-- Check total staff count
SELECT 
  COUNT(*) as total_staff,
  COUNT(CASE WHEN base_location = 'Iberia CER' THEN 1 END) as iberia_cer_staff,
  COUNT(CASE WHEN base_location = 'BA CER' THEN 1 END) as ba_cer_staff
FROM public.staff;

-- Check staff at specific locations
SELECT 
  base_location,
  COUNT(*) as staff_count
FROM public.staff
GROUP BY base_location
ORDER BY base_location;

-- 4. Test the get_all_staff_for_team function
SELECT '=== TESTING get_all_staff_for_team FUNCTION ===' as info;

-- This will only work if you're authenticated as a staff member
-- The function should return staff from the same company
SELECT 
  'Function exists and accessible' as status,
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name = 'get_all_staff_for_team';

-- 5. Test the get_eligible_staff_for_swap function
SELECT '=== TESTING get_eligible_staff_for_swap FUNCTION ===' as info;

SELECT 
  'Function exists and accessible' as status,
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name = 'get_eligible_staff_for_swap';

-- 6. Check shifts data
SELECT '=== CHECKING SHIFTS DATA ===' as info;

SELECT 
  COUNT(*) as total_shifts,
  COUNT(CASE WHEN date::date >= CURRENT_DATE THEN 1 END) as future_shifts,
  COUNT(CASE WHEN date::date = CURRENT_DATE THEN 1 END) as today_shifts
FROM public.shifts;

-- 7. Check swap requests
SELECT '=== CHECKING SWAP REQUESTS ===' as info;

SELECT 
  COUNT(*) as total_requests,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
  COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_requests,
  COUNT(CASE WHEN status = 'declined' THEN 1 END) as declined_requests
FROM public.swap_requests;

-- 8. Test specific queries that were failing
SELECT '=== TESTING SPECIFIC FAILING QUERIES ===' as info;

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
SELECT 'Test 3: Fetch shifts for today' as test_name;
SELECT 
  s.id,
  s.date,
  s.time,
  st.email,
  st.staff_number
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE s.date::date = CURRENT_DATE
ORDER BY s.time;

-- 9. Summary
SELECT '=== SUMMARY ===' as info;
SELECT 
  'Database functions and RLS policies should now be working' as status,
  'Staff should be visible and grouped by base location' as team_view,
  'Swap requests should find eligible staff' as swap_functionality;
