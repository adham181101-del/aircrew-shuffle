-- Simple database connection test
-- This will help identify if the issue is with RLS or something else

SELECT '=== BASIC DATABASE TEST ===' as info;

-- Test 1: Can we access the staff table at all?
SELECT 'Test 1: Staff table access' as test;
SELECT COUNT(*) as staff_count FROM public.staff;

-- Test 2: Can we access the shifts table?
SELECT 'Test 2: Shifts table access' as test;
SELECT COUNT(*) as shifts_count FROM public.shifts;

-- Test 3: Can we access the swap_requests table?
SELECT 'Test 3: Swap requests table access' as test;
SELECT COUNT(*) as swap_requests_count FROM public.swap_requests;

-- Test 4: Can we join staff and shifts?
SELECT 'Test 4: Staff-Shifts join' as test;
SELECT 
  st.email,
  COUNT(s.id) as shift_count
FROM public.staff st
LEFT JOIN public.shifts s ON st.id = s.staff_id
GROUP BY st.email
ORDER BY st.email
LIMIT 5;

-- Test 5: Can we filter by base location?
SELECT 'Test 5: Filter by base location' as test;
SELECT 
  email,
  staff_number,
  base_location
FROM public.staff
WHERE base_location = 'Iberia CER'
ORDER BY email;

-- Test 6: Can we check for staff without shifts on a specific date?
SELECT 'Test 6: Staff OFF on 2025-01-20' as test;
SELECT 
  st.email,
  st.staff_number,
  st.base_location
FROM public.staff st
WHERE st.base_location = 'Iberia CER'
AND NOT EXISTS (
  SELECT 1 FROM public.shifts s 
  WHERE s.staff_id = st.id 
  AND s.date = '2025-01-20'
)
ORDER BY st.email;

-- Test 7: Check if RLS is enabled on tables
SELECT 'Test 7: RLS status' as test;
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('staff', 'shifts', 'swap_requests')
ORDER BY tablename;
