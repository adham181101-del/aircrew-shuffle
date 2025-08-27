-- Test script to verify the emergency fix worked
-- Run this after the emergency fix

SELECT '=== TESTING AFTER EMERGENCY FIX ===' as info;

-- Test 1: Basic table access
SELECT 'Test 1: Basic table access' as test;
SELECT 
  'Staff count:' as table_name,
  COUNT(*) as count
FROM public.staff
UNION ALL
SELECT 
  'Shifts count:' as table_name,
  COUNT(*) as count
FROM public.shifts
UNION ALL
SELECT 
  'Swap requests count:' as table_name,
  COUNT(*) as count
FROM public.swap_requests;

-- Test 2: Test the exact queries that were failing
SELECT 'Test 2: Testing exact failing queries' as test;

-- Test staff profile query
SELECT 
  'Staff profile query result:' as test;
SELECT 
  id,
  email,
  staff_number,
  base_location
FROM public.staff
WHERE id = '50909ea4-7507-496e-9e87-da5c8a6866a4';

-- Test staff list query
SELECT 
  'Staff list query result:' as test;
SELECT 
  id,
  email,
  staff_number,
  base_location
FROM public.staff
WHERE base_location = 'Iberia CER'
AND id != '50909ea4-7507-496e-9e87-da5c8a6866a4'
LIMIT 3;

-- Test 3: Check if test staff exist
SELECT 'Test 3: Check test staff' as test;
SELECT 
  email,
  staff_number,
  base_location,
  can_work_doubles
FROM public.staff
WHERE email IN ('john.doe@ba.com', 'jane.smith@ba.com', 'mike.jones@ba.com', 'sarah.wilson@ba.com', 'david.brown@ba.com')
ORDER BY email;

-- Test 4: Check availability for swap requests
SELECT 'Test 4: Check availability for swaps' as test;

-- Check who is OFF on 2025-01-20
SELECT 
  'Staff OFF on 2025-01-20:' as date_info;
SELECT 
  st.email,
  st.staff_number,
  'AVAILABLE' as status
FROM public.staff st
WHERE st.base_location = 'Iberia CER'
AND NOT EXISTS (
  SELECT 1 FROM public.shifts s 
  WHERE s.staff_id = st.id 
  AND s.date = '2025-01-20'
)
ORDER BY st.email;

-- Check who is OFF on 2025-01-21
SELECT 
  'Staff OFF on 2025-01-21:' as date_info;
SELECT 
  st.email,
  st.staff_number,
  'AVAILABLE' as status
FROM public.staff st
WHERE st.base_location = 'Iberia CER'
AND NOT EXISTS (
  SELECT 1 FROM public.shifts s 
  WHERE s.staff_id = st.id 
  AND s.date = '2025-01-21'
)
ORDER BY st.email;

-- Test 5: Final verification
SELECT 'Test 5: Final verification' as test;
SELECT 
  'If you see this, the emergency fix worked!' as result,
  'No more 500 errors should occur.' as status,
  'Try creating a swap request now.' as next_step;
