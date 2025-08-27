-- Find compatible shifts for swapping between Adham and Shaheen
-- This shows shifts where one person is working and the other is off

SELECT '=== COMPATIBLE SHIFTS FOR SWAP BETWEEN ADHAM AND SHAHEEN ===' as info;

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

-- Get all shifts for both staff members
SELECT '=== ALL SHIFTS FOR BOTH STAFF ===' as info;
SELECT 
  s.id as shift_id,
  s.date,
  s.time,
  st.email,
  st.staff_number,
  CASE 
    WHEN st.email = 'adham.fati.el.hamzaouy@ba.com' THEN 'Adham'
    WHEN st.email = 'shaheenamin09@ba.com' THEN 'Shaheen'
  END as staff_name
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE st.email IN ('adham.fati.el.hamzaouy@ba.com', 'shaheenamin09@ba.com')
ORDER BY s.date, s.time;

-- Find dates where only Adham is working (Shaheen is off)
SELECT '=== DATES WHERE ONLY ADHAM IS WORKING (SHAHEEN CAN COVER) ===' as info;
SELECT 
  adham_shifts.date,
  adham_shifts.time as adham_shift_time,
  'Adham working, Shaheen OFF' as situation,
  'Shaheen can cover Adhams shift' as swap_opportunity,
  'Adham can request swap for this shift' as action
FROM (
  SELECT DISTINCT s.date, s.time
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
ORDER BY adham_shifts.date, adham_shifts.time;

-- Find dates where only Shaheen is working (Adham is off)
SELECT '=== DATES WHERE ONLY SHAHEEN IS WORKING (ADHAM CAN COVER) ===' as info;
SELECT 
  shaheen_shifts.date,
  shaheen_shifts.time as shaheen_shift_time,
  'Shaheen working, Adham OFF' as situation,
  'Adham can cover Shaheens shift' as swap_opportunity,
  'Shaheen can request swap for this shift' as action
FROM (
  SELECT DISTINCT s.date, s.time
  FROM public.shifts s
  JOIN public.staff st ON s.staff_id = st.id
  WHERE st.email = 'shaheenamin09@ba.com'
) shaheen_shifts
WHERE NOT EXISTS (
  SELECT 1 FROM public.shifts s2
  JOIN public.staff st2 ON s2.staff_id = st2.id
  WHERE st2.email = 'adham.fati.el.hamzaouy@ba.com'
  AND s2.date = shaheen_shifts.date
)
ORDER BY shaheen_shifts.date, shaheen_shifts.time;

-- Find dates where both are working (no swap possible)
SELECT '=== DATES WHERE BOTH ARE WORKING (NO SWAP POSSIBLE) ===' as info;
SELECT 
  both_shifts.date,
  'Both Adham and Shaheen working' as situation,
  'No swap possible on this date' as swap_opportunity,
  'SKIP THESE DATES' as action
FROM (
  SELECT DISTINCT s.date
  FROM public.shifts s
  JOIN public.staff st ON s.staff_id = st.id
  WHERE st.email = 'adham.fati.el.hamzaouy@ba.com'
) adham_dates
JOIN (
  SELECT DISTINCT s.date
  FROM public.shifts s
  JOIN public.staff st ON s.staff_id = st.id
  WHERE st.email = 'shaheenamin09@ba.com'
) shaheen_dates ON adham_dates.date = shaheen_dates.date
ORDER BY both_shifts.date;

-- Summary of swap opportunities
SELECT '=== SWAP OPPORTUNITIES SUMMARY ===' as info;
SELECT 
  'Adham shifts that Shaheen can cover:' as type,
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
) adham_only_dates

UNION ALL

SELECT 
  'Shaheen shifts that Adham can cover:' as type,
  COUNT(*) as count
FROM (
  SELECT DISTINCT s.date
  FROM public.shifts s
  JOIN public.staff st ON s.staff_id = st.id
  WHERE st.email = 'shaheenamin09@ba.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.shifts s2
    JOIN public.staff st2 ON s2.staff_id = st2.id
    WHERE st2.email = 'adham.fati.el.hamzaouy@ba.com'
    AND s2.date = s.date
  )
) shaheen_only_dates

UNION ALL

SELECT 
  'Dates where both are working (no swap):' as type,
  COUNT(*) as count
FROM (
  SELECT DISTINCT s.date
  FROM public.shifts s
  JOIN public.staff st ON s.staff_id = st.id
  WHERE st.email = 'adham.fati.el.hamzaouy@ba.com'
) adham_dates
JOIN (
  SELECT DISTINCT s.date
  FROM public.shifts s
  JOIN public.staff st ON s.staff_id = st.id
  WHERE st.email = 'shaheenamin09@ba.com'
) shaheen_dates ON adham_dates.date = shaheen_dates.date;

-- Specific shift IDs for testing swap requests
SELECT '=== SPECIFIC SHIFT IDs FOR TESTING ===' as info;

-- Adham's shifts that Shaheen can cover
SELECT '=== ADHAMS SHIFTS - SHAHEEN CAN COVER ===' as info;
SELECT 
  s.id as shift_id,
  s.date,
  s.time,
  'Adham shift - Shaheen available to cover' as description,
  'Use this shift ID for Adham to request swap' as action
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE st.email = 'adham.fati.el.hamzaouy@ba.com'
AND NOT EXISTS (
  SELECT 1 FROM public.shifts s2
  JOIN public.staff st2 ON s2.staff_id = st2.id
  WHERE st2.email = 'shaheenamin09@ba.com'
  AND s2.date = s.date
)
ORDER BY s.date, s.time
LIMIT 10;

-- Shaheen's shifts that Adham can cover
SELECT '=== SHAHEENS SHIFTS - ADHAM CAN COVER ===' as info;
SELECT 
  s.id as shift_id,
  s.date,
  s.time,
  'Shaheen shift - Adham available to cover' as description,
  'Use this shift ID for Shaheen to request swap' as action
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE st.email = 'shaheenamin09@ba.com'
AND NOT EXISTS (
  SELECT 1 FROM public.shifts s2
  JOIN public.staff st2 ON s2.staff_id = st2.id
  WHERE st2.email = 'adham.fati.el.hamzaouy@ba.com'
  AND s2.date = s.date
)
ORDER BY s.date, s.time
LIMIT 10;

-- Perfect swap pairs (same date, different people)
SELECT '=== PERFECT SWAP PAIRS ===' as info;
SELECT 
  'These dates have perfect swap opportunities:' as description;
SELECT 
  adham_only.date as adham_working_date,
  'Adham working, Shaheen OFF' as adham_situation,
  shaheen_only.date as shaheen_working_date,
  'Shaheen working, Adham OFF' as shaheen_situation,
  'Perfect swap opportunity' as opportunity
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
) adham_only
FULL OUTER JOIN (
  SELECT DISTINCT s.date
  FROM public.shifts s
  JOIN public.staff st ON s.staff_id = st.id
  WHERE st.email = 'shaheenamin09@ba.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.shifts s2
    JOIN public.staff st2 ON s2.staff_id = st2.id
    WHERE st2.email = 'adham.fati.el.hamzaouy@ba.com'
    AND s2.date = s.date
  )
) shaheen_only ON adham_only.date = shaheen_only.date
WHERE adham_only.date IS NOT NULL OR shaheen_only.date IS NOT NULL
ORDER BY COALESCE(adham_only.date, shaheen_only.date);
