-- Test the exact swap request logic
-- This simulates what the frontend is doing

-- First, let's see what staff we have
SELECT '=== ALL STAFF ===' as info;
SELECT 
  id,
  email,
  staff_number,
  base_location,
  can_work_doubles
FROM public.staff
ORDER BY base_location, email;

-- Let's see what shifts exist
SELECT '=== ALL SHIFTS ===' as info;
SELECT 
  s.id,
  s.date,
  s.time,
  st.email,
  st.staff_number,
  st.base_location
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
ORDER BY s.date, s.time;

-- Test the exact logic for a specific date (replace with your date)
-- Let's test for 2025-01-22 (when Jane and Mike should be off)
SET @test_date = '2025-01-22';
SET @test_base = 'Iberia CER';

SELECT '=== TESTING SWAP LOGIC ===' as info;
SELECT CONCAT('Testing date: ', @test_date) as info;
SELECT CONCAT('Testing base: ', @test_base) as info;

-- Step 1: Find all staff at the same base (excluding yourself)
SELECT '=== STEP 1: Staff at same base ===' as info;
SELECT 
  id,
  email,
  staff_number,
  base_location,
  can_work_doubles
FROM public.staff
WHERE base_location = @test_base
AND id != 'your-user-id-here' -- Replace with actual user ID
ORDER BY email;

-- Step 2: Check who has shifts on the test date
SELECT '=== STEP 2: Who is working on test date ===' as info;
SELECT 
  st.email,
  st.staff_number,
  st.base_location,
  s.time as shift_time,
  'WORKING' as status
FROM public.staff st
JOIN public.shifts s ON s.staff_id = st.id
WHERE st.base_location = @test_base
AND s.date = @test_date
ORDER BY st.email;

-- Step 3: Check who is OFF on the test date
SELECT '=== STEP 3: Who is OFF on test date ===' as info;
SELECT 
  st.email,
  st.staff_number,
  st.base_location,
  'OFF' as status
FROM public.staff st
WHERE st.base_location = @test_base
AND NOT EXISTS (
  SELECT 1 FROM public.shifts s 
  WHERE s.staff_id = st.id 
  AND s.date = @test_date
)
ORDER BY st.email;

-- Step 4: Final eligible list (OFF staff)
SELECT '=== STEP 4: ELIGIBLE STAFF FOR SWAP ===' as info;
SELECT 
  st.email,
  st.staff_number,
  st.base_location,
  st.can_work_doubles,
  'ELIGIBLE' as status
FROM public.staff st
WHERE st.base_location = @test_base
AND NOT EXISTS (
  SELECT 1 FROM public.shifts s 
  WHERE s.staff_id = st.id 
  AND s.date = @test_date
)
ORDER BY st.email;

-- Let's also test a few more dates to see the pattern
SELECT '=== TESTING MULTIPLE DATES ===' as info;

-- Test 2025-01-20 (Mike should be off)
SELECT '2025-01-20 - Staff OFF:' as info;
SELECT 
  st.email,
  st.staff_number
FROM public.staff st
WHERE st.base_location = 'Iberia CER'
AND NOT EXISTS (
  SELECT 1 FROM public.shifts s 
  WHERE s.staff_id = st.id 
  AND s.date = '2025-01-20'
)
ORDER BY st.email;

-- Test 2025-01-21 (Sarah should be off)
SELECT '2025-01-21 - Staff OFF:' as info;
SELECT 
  st.email,
  st.staff_number
FROM public.staff st
WHERE st.base_location = 'Iberia CER'
AND NOT EXISTS (
  SELECT 1 FROM public.shifts s 
  WHERE s.staff_id = st.id 
  AND s.date = '2025-01-21'
)
ORDER BY st.email;

-- Test 2025-01-22 (Jane and Mike should be off)
SELECT '2025-01-22 - Staff OFF:' as info;
SELECT 
  st.email,
  st.staff_number
FROM public.staff st
WHERE st.base_location = 'Iberia CER'
AND NOT EXISTS (
  SELECT 1 FROM public.shifts s 
  WHERE s.staff_id = st.id 
  AND s.date = '2025-01-22'
)
ORDER BY st.email;

-- Test 2025-01-23 (Everyone should be working)
SELECT '2025-01-23 - Staff OFF:' as info;
SELECT 
  st.email,
  st.staff_number
FROM public.staff st
WHERE st.base_location = 'Iberia CER'
AND NOT EXISTS (
  SELECT 1 FROM public.shifts s 
  WHERE s.staff_id = st.id 
  AND s.date = '2025-01-23'
)
ORDER BY st.email;
