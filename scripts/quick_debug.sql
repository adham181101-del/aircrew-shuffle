-- Quick debug script to check current database state
-- Run this in Supabase SQL Editor

-- Check if test staff exist
SELECT '=== TEST STAFF CHECK ===' as info;
SELECT 
  email,
  staff_number,
  base_location,
  can_work_doubles
FROM public.staff
WHERE email IN ('john.doe@ba.com', 'jane.smith@ba.com', 'mike.jones@ba.com', 'sarah.wilson@ba.com', 'david.brown@ba.com')
ORDER BY email;

-- Check all staff at Iberia CER
SELECT '=== ALL STAFF AT IBERIA CER ===' as info;
SELECT 
  email,
  staff_number,
  base_location,
  can_work_doubles
FROM public.staff
WHERE base_location = 'Iberia CER'
ORDER BY email;

-- Check shifts for 2025-01-20 (when Mike should be off)
SELECT '=== SHIFTS ON 2025-01-20 ===' as info;
SELECT 
  st.email,
  st.staff_number,
  s.time as shift_time
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE s.date = '2025-01-20'
ORDER BY st.email;

-- Check who is OFF on 2025-01-20
SELECT '=== STAFF OFF ON 2025-01-20 ===' as info;
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

-- Check total staff count
SELECT '=== TOTAL STAFF COUNT ===' as info;
SELECT COUNT(*) as total_staff FROM public.staff;

-- Check total shifts count
SELECT '=== TOTAL SHIFTS COUNT ===' as info;
SELECT COUNT(*) as total_shifts FROM public.shifts;
