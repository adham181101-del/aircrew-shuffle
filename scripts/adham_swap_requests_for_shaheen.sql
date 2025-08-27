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
WHERE email IN ('adham.fati.el.hamzaouy@ba.com', 'shaheen.amin@ba.com')
ORDER BY email;

-- Get all of Adham's shifts
SELECT '=== ADHAMS SHIFTS ===' as info;
SELECT 
  s.id as shift_id,
  s.date,
  s.time,
  st.email,
  st.staff_number
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE st.email = 'adham.fati.el.hamzaouy@ba.com'
ORDER BY s.date, s.time;

-- Get all of Shaheen's shifts
SELECT '=== SHAHEENS SHIFTS ===' as info;
SELECT 
  s.id as shift_id,
  s.date,
  s.time,
  st.email,
  st.staff_number
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE st.email = 'shaheen.amin@ba.com'
ORDER BY s.date, s.time;

-- Find Adham's shifts where Shaheen is OFF (Shaheen will be available for swap)
SELECT '=== ADHAMS SHIFTS WHERE SHAHEEN IS AVAILABLE ===' as info;
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
  WHERE st2.email = 'shaheen.amin@ba.com'
  AND s2.date = adham_shifts.date
)
ORDER BY adham_shifts.date, adham_shifts.time;

-- Find Adham's shifts where Shaheen is also working (Shaheen will NOT be available)
SELECT '=== ADHAMS SHIFTS WHERE SHAHEEN IS NOT AVAILABLE ===' as info;
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
  WHERE st2.email = 'shaheen.amin@ba.com'
  AND s2.date = adham_shifts.date
)
ORDER BY adham_shifts.date, adham_shifts.time;

-- Summary for testing
SELECT '=== TESTING SUMMARY ===' as info;
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
    WHERE st2.email = 'shaheen.amin@ba.com'
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
    WHERE st2.email = 'shaheen.amin@ba.com'
    AND s2.date = s.date
  )
) both_working_shifts;

-- Specific test cases with shift IDs
SELECT '=== SPECIFIC TEST CASES ===' as info;
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
  WHERE st2.email = 'shaheen.amin@ba.com'
  AND s2.date = s.date
)
ORDER BY s.date, s.time
LIMIT 5;
