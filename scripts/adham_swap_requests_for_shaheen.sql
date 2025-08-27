-- Find which of Adham's shifts will show Shaheen as available for swap requests
-- This is for testing the swap request functionality

SELECT '=== ADHAM SWAP REQUESTS - SHAHEEN AVAILABILITY ===' as info;

-- First, let's find Adham and Shaheen's user IDs
SELECT '=== USER IDs ===' as info;
SELECT 
  id,
  email,
  staff_number,
  base_location
FROM public.staff
WHERE email IN ('adham.fati.el.hamzaouy@ba.com', 'shaheenamin09@ba.com')
ORDER BY email;

-- Check what data exists in the shifts table
SELECT '=== ALL SHIFTS IN DATABASE (FIRST 20) ===' as info;
SELECT 
  s.id as shift_id,
  s.date,
  s.time,
  st.email,
  st.staff_number
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
ORDER BY s.date DESC, s.time
LIMIT 20;

-- Get all of Adham's shifts (ALL MONTHS)
SELECT '=== ADHAMS SHIFTS (ALL MONTHS) ===' as info;
SELECT 
  s.id as shift_id,
  s.date,
  s.time,
  st.email,
  st.staff_number
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE st.email = 'adham.fati.el.hamzaouy@ba.com'
ORDER BY s.date DESC, s.time;

-- Get all of Shaheen's shifts (ALL MONTHS)
SELECT '=== SHAHEENS SHIFTS (ALL MONTHS) ===' as info;
SELECT 
  s.id as shift_id,
  s.date,
  s.time,
  st.email,
  st.staff_number
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE st.email = 'shaheenamin09@ba.com'
ORDER BY s.date DESC, s.time;

-- Find Adham's shifts where Shaheen is OFF (Shaheen will be available for swap) - ALL MONTHS
SELECT '=== ADHAMS SHIFTS WHERE SHAHEEN IS AVAILABLE (ALL MONTHS) ===' as info;
SELECT 
  adham_shifts.shift_id,
  adham_shifts.date,
  adham_shifts.time as adham_shift_time,
  'Adham working, Shaheen OFF' as situation,
  'Shaheen will appear as available for this swap request' as result,
  'TEST THIS SHIFT FOR SWAP REQUEST' as action
FROM (
  SELECT s.id as shift_id, s.date, s.time
  FROM public.shifts s
  JOIN public.staff st ON s.staff_id = st.id
  WHERE st.email = 'adham.fati.el.hamzaouy@ba.com'
) adham_shifts
WHERE NOT EXISTS (
  SELECT 1 FROM public.shifts s2
  JOIN public.staff st2 ON s2.staff_id = st2.id
  WHERE st2.email = 'shaheenamin09@ba.com'
  AND s2.date = adham_shifts.date
)
ORDER BY adham_shifts.date DESC, adham_shifts.time;

-- Find Adham's shifts where Shaheen is also working (Shaheen will NOT be available) - ALL MONTHS
SELECT '=== ADHAMS SHIFTS WHERE SHAHEEN IS NOT AVAILABLE (ALL MONTHS) ===' as info;
SELECT 
  adham_shifts.shift_id,
  adham_shifts.date,
  adham_shifts.time as adham_shift_time,
  'Both Adham and Shaheen working' as situation,
  'Shaheen will NOT appear as available for this swap request' as result,
  'SKIP THIS SHIFT FOR TESTING' as action
FROM (
  SELECT s.id as shift_id, s.date, s.time
  FROM public.shifts s
  JOIN public.staff st ON s.staff_id = st.id
  WHERE st.email = 'adham.fati.el.hamzaouy@ba.com'
) adham_shifts
WHERE EXISTS (
  SELECT 1 FROM public.shifts s2
  JOIN public.staff st2 ON s2.staff_id = st2.id
  WHERE st2.email = 'shaheenamin09@ba.com'
  AND s2.date = adham_shifts.date
)
ORDER BY adham_shifts.date DESC, adham_shifts.time;

-- Summary for testing - ALL MONTHS
SELECT '=== TESTING SUMMARY (ALL MONTHS) ===' as info;
SELECT 
  'Adham shifts where Shaheen is available (TEST THESE):' as type,
  COUNT(*) as count
FROM (
  SELECT DISTINCT s.date
  FROM public.shifts s
  JOIN public.staff st ON s.staff_id = st.id
  WHERE st.email = 'adham.fati.el.hamzaouy@ba.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.shifts s2
    JOIN public.staff st2 ON s2.staff_id = st2.id
    WHERE st2.email = 'shaheenamin09@ba.com'
    AND s2.date = s.date
  )
) adham_only_shifts

UNION ALL

SELECT 
  'Adham shifts where Shaheen is NOT available (SKIP THESE):' as type,
  COUNT(*) as count
FROM (
  SELECT DISTINCT s.date
  FROM public.shifts s
  JOIN public.staff st ON s.staff_id = st.id
  WHERE st.email = 'adham.fati.el.hamzaouy@ba.com'
  AND EXISTS (
    SELECT 1 FROM public.shifts s2
    JOIN public.staff st2 ON s2.staff_id = st2.id
    WHERE st2.email = 'shaheenamin09@ba.com'
    AND s2.date = s.date
  )
) both_working_shifts;

-- Specific test cases with shift IDs - ALL MONTHS
SELECT '=== SPECIFIC TEST CASES (ALL MONTHS) ===' as info;
SELECT 
  'Use these shift IDs for testing swap requests:' as instruction;
SELECT 
  s.id as shift_id,
  s.date,
  s.time,
  'Adham shift - Shaheen available' as description
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE st.email = 'adham.fati.el.hamzaouy@ba.com'
AND NOT EXISTS (
  SELECT 1 FROM public.shifts s2
  JOIN public.staff st2 ON s2.staff_id = st2.id
  WHERE st2.email = 'shaheenamin09@ba.com'
  AND s2.date = s.date
)
ORDER BY s.date DESC, s.time
LIMIT 10;

-- Check if we have any data at all
SELECT '=== DATA VERIFICATION ===' as info;
SELECT 
  'Total shifts in database:' as info,
  COUNT(*) as count
FROM public.shifts

UNION ALL

SELECT 
  'Total staff in database:' as info,
  COUNT(*) as count
FROM public.staff

UNION ALL

SELECT 
  'Adham shifts count:' as info,
  COUNT(*) as count
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE st.email = 'adham.fati.el.hamzaouy@ba.com'

UNION ALL

SELECT 
  'Shaheen shifts count:' as info,
  COUNT(*) as count
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE st.email = 'shaheenamin09@ba.com';
