-- Check which shifts Adham has that Shaheen can cover
-- This will analyze their schedules and find swap opportunities

SELECT '=== ADHAM AND SHAHEEN SHIFT ANALYSIS ===' as info;

-- First, let's find Adham and Shaheen's user IDs
SELECT '=== FINDING USER IDs ===' as info;
SELECT 
  id,
  email,
  staff_number,
  base_location
FROM public.staff
WHERE email IN ('adham.fati.el.hamzaouy@ba.com', 'shaheen.amin@ba.com')
ORDER BY email;

-- Now let's get all of Adham's shifts
SELECT '=== ADHAMS SHIFTS ===' as info;
SELECT 
  s.date,
  s.time,
  st.email,
  st.staff_number,
  st.base_location
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE st.email = 'adham.fati.el.hamzaouy@ba.com'
ORDER BY s.date, s.time;

-- Get all of Shaheen's shifts
SELECT '=== SHAHEENS SHIFTS ===' as info;
SELECT 
  s.date,
  s.time,
  st.email,
  st.staff_number,
  st.base_location
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE st.email = 'shaheen.amin@ba.com'
ORDER BY s.date, s.time;

-- CORRECTED: Find dates where Adham is OFF but Shaheen is working (Adham can cover Shaheen's shifts)
SELECT '=== ADHAM CAN COVER SHAHEENS SHIFTS ===' as info;
SELECT 
  shaheen_shifts.date,
  shaheen_shifts.time as shaheen_shift_time,
  'Shaheen working, Adham OFF' as situation,
  'Adham can cover this shift' as action
FROM (
  SELECT DISTINCT s.date, s.time
  FROM public.shifts s
  JOIN public.staff st ON s.staff_id = st.id
  WHERE st.email = 'shaheen.amin@ba.com'
) shaheen_shifts
WHERE NOT EXISTS (
  SELECT 1 FROM public.shifts s2
  JOIN public.staff st2 ON s2.staff_id = st2.id
  WHERE st2.email = 'adham.fati.el.hamzaouy@ba.com'
  AND s2.date = shaheen_shifts.date
)
ORDER BY shaheen_shifts.date, shaheen_shifts.time;

-- CORRECTED: Find dates where Shaheen is OFF but Adham is working (Shaheen can cover Adham's shifts)
SELECT '=== SHAHEEN CAN COVER ADHAMS SHIFTS ===' as info;
SELECT 
  adham_shifts.date,
  adham_shifts.time as adham_shift_time,
  'Adham working, Shaheen OFF' as situation,
  'Shaheen can cover this shift' as action
FROM (
  SELECT DISTINCT s.date, s.time
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

-- Summary of swap opportunities (CORRECTED)
SELECT '=== SUMMARY ===' as info;
SELECT 
  'Shaheen shifts that Adham can cover (Adham OFF, Shaheen working):' as type,
  COUNT(*) as count
FROM (
  SELECT DISTINCT s.date
  FROM public.shifts s
  JOIN public.staff st ON s.staff_id = st.id
  WHERE st.email = 'shaheen.amin@ba.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.shifts s2
    JOIN public.staff st2 ON s2.staff_id = st2.id
    WHERE st2.email = 'adham.fati.el.hamzaouy@ba.com'
    AND s2.date = s.date
  )
) shaheen_only_shifts

UNION ALL

SELECT 
  'Adham shifts that Shaheen can cover (Shaheen OFF, Adham working):' as type,
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
) adham_only_shifts;
