-- Add sample shifts to staff members for testing swap requests (SIMPLE VERSION)
-- This ensures some staff are working on certain dates and others are off

SELECT '=== ADDING SAMPLE SHIFTS FOR SWAP REQUEST TESTING ===' as info;

-- First, let's see what staff we have
SELECT '=== CURRENT STAFF ===' as info;
SELECT 
  id,
  email,
  staff_number,
  base_location
FROM public.staff
WHERE base_location = 'Iberia CER'
ORDER BY email;

-- Get staff IDs for reference
SELECT '=== STAFF IDs FOR REFERENCE ===' as info;
SELECT 
  id as staff_id,
  email,
  staff_number
FROM public.staff
WHERE base_location = 'Iberia CER'
ORDER BY email;

-- Add sample shifts for the next 7 days (simpler approach)
SELECT '=== ADDING SAMPLE SHIFTS FOR NEXT 7 DAYS ===' as info;

-- Get today's date and staff IDs
DO $$
DECLARE
  shaheen_id UUID;
  john_id UUID;
  jane_id UUID;
  mike_id UUID;
  sarah_id UUID;
  david_id UUID;
  current_date DATE := CURRENT_DATE;
BEGIN
  -- Get staff IDs
  SELECT id INTO shaheen_id FROM public.staff WHERE email = 'shaheenamin09@ba.com';
  SELECT id INTO john_id FROM public.staff WHERE email = 'john.doe@ba.com';
  SELECT id INTO jane_id FROM public.staff WHERE email = 'jane.smith@ba.com';
  SELECT id INTO mike_id FROM public.staff WHERE email = 'mike.jones@ba.com';
  SELECT id INTO sarah_id FROM public.staff WHERE email = 'sarah.wilson@ba.com';
  SELECT id INTO david_id FROM public.staff WHERE email = 'david.brown@ba.com';
  
  -- Add shifts for the next 7 days with different patterns
  
  -- Day 1 (Today) - Shaheen and Jane working
  IF shaheen_id IS NOT NULL THEN
    INSERT INTO public.shifts (staff_id, date, time, created_at) VALUES (shaheen_id, current_date, '04:15-12:15', NOW());
    RAISE NOTICE 'Added shift for Shaheen on %: 04:15-12:15', current_date;
  END IF;
  IF jane_id IS NOT NULL THEN
    INSERT INTO public.shifts (staff_id, date, time, created_at) VALUES (jane_id, current_date, '12:30-20:30', NOW());
    RAISE NOTICE 'Added shift for Jane on %: 12:30-20:30', current_date;
  END IF;
  
  -- Day 2 - John and Sarah working
  IF john_id IS NOT NULL THEN
    INSERT INTO public.shifts (staff_id, date, time, created_at) VALUES (john_id, current_date + 1, '05:30-13:30', NOW());
    RAISE NOTICE 'Added shift for John on %: 05:30-13:30', current_date + 1;
  END IF;
  IF sarah_id IS NOT NULL THEN
    INSERT INTO public.shifts (staff_id, date, time, created_at) VALUES (sarah_id, current_date + 1, '13:15-21:15', NOW());
    RAISE NOTICE 'Added shift for Sarah on %: 13:15-21:15', current_date + 1;
  END IF;
  
  -- Day 3 - Shaheen and Mike working
  IF shaheen_id IS NOT NULL THEN
    INSERT INTO public.shifts (staff_id, date, time, created_at) VALUES (shaheen_id, current_date + 2, '04:15-12:15', NOW());
    RAISE NOTICE 'Added shift for Shaheen on %: 04:15-12:15', current_date + 2;
  END IF;
  IF mike_id IS NOT NULL THEN
    INSERT INTO public.shifts (staff_id, date, time, created_at) VALUES (mike_id, current_date + 2, '12:30-20:30', NOW());
    RAISE NOTICE 'Added shift for Mike on %: 12:30-20:30', current_date + 2;
  END IF;
  
  -- Day 4 - John and David working
  IF john_id IS NOT NULL THEN
    INSERT INTO public.shifts (staff_id, date, time, created_at) VALUES (john_id, current_date + 3, '05:30-13:30', NOW());
    RAISE NOTICE 'Added shift for John on %: 05:30-13:30', current_date + 3;
  END IF;
  IF david_id IS NOT NULL THEN
    INSERT INTO public.shifts (staff_id, date, time, created_at) VALUES (david_id, current_date + 3, '13:15-21:15', NOW());
    RAISE NOTICE 'Added shift for David on %: 13:15-21:15', current_date + 3;
  END IF;
  
  -- Day 5 - Shaheen and Sarah working
  IF shaheen_id IS NOT NULL THEN
    INSERT INTO public.shifts (staff_id, date, time, created_at) VALUES (shaheen_id, current_date + 4, '04:15-12:15', NOW());
    RAISE NOTICE 'Added shift for Shaheen on %: 04:15-12:15', current_date + 4;
  END IF;
  IF sarah_id IS NOT NULL THEN
    INSERT INTO public.shifts (staff_id, date, time, created_at) VALUES (sarah_id, current_date + 4, '12:30-20:30', NOW());
    RAISE NOTICE 'Added shift for Sarah on %: 12:30-20:30', current_date + 4;
  END IF;
  
  -- Day 6 - John and Mike working
  IF john_id IS NOT NULL THEN
    INSERT INTO public.shifts (staff_id, date, time, created_at) VALUES (john_id, current_date + 5, '05:30-13:30', NOW());
    RAISE NOTICE 'Added shift for John on %: 05:30-13:30', current_date + 5;
  END IF;
  IF mike_id IS NOT NULL THEN
    INSERT INTO public.shifts (staff_id, date, time, created_at) VALUES (mike_id, current_date + 5, '13:15-21:15', NOW());
    RAISE NOTICE 'Added shift for Mike on %: 13:15-21:15', current_date + 5;
  END IF;
  
  -- Day 7 - David and Jane working
  IF david_id IS NOT NULL THEN
    INSERT INTO public.shifts (staff_id, date, time, created_at) VALUES (david_id, current_date + 6, '04:15-12:15', NOW());
    RAISE NOTICE 'Added shift for David on %: 04:15-12:15', current_date + 6;
  END IF;
  IF jane_id IS NOT NULL THEN
    INSERT INTO public.shifts (staff_id, date, time, created_at) VALUES (jane_id, current_date + 6, '12:30-20:30', NOW());
    RAISE NOTICE 'Added shift for Jane on %: 12:30-20:30', current_date + 6;
  END IF;
  
END $$;

-- Show the shifts we just added
SELECT '=== SAMPLE SHIFTS ADDED ===' as info;
SELECT 
  s.date,
  s.time,
  st.email,
  st.staff_number,
  CASE EXTRACT(DOW FROM s.date)
    WHEN 0 THEN 'Sunday'
    WHEN 1 THEN 'Monday'
    WHEN 2 THEN 'Tuesday'
    WHEN 3 THEN 'Wednesday'
    WHEN 4 THEN 'Thursday'
    WHEN 5 THEN 'Friday'
    WHEN 6 THEN 'Saturday'
  END as day_of_week
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE st.base_location = 'Iberia CER'
  AND s.date >= CURRENT_DATE
  AND s.date <= CURRENT_DATE + INTERVAL '6 days'
ORDER BY s.date, s.time;

-- Show availability for the next 7 days
SELECT '=== STAFF AVAILABILITY NEXT 7 DAYS ===' as info;
WITH dates AS (
  SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', '1 day'::interval)::date as date
),
staff_dates AS (
  SELECT 
    st.id,
    st.email,
    st.staff_number,
    d.date,
    CASE 
      WHEN s.id IS NOT NULL THEN 'WORKING'
      ELSE 'OFF'
    END as status
  FROM public.staff st
  CROSS JOIN dates d
  LEFT JOIN public.shifts s ON s.staff_id = st.id AND s.date = d.date
  WHERE st.base_location = 'Iberia CER'
)
SELECT 
  date,
  email,
  staff_number,
  status
FROM staff_dates
ORDER BY date, email;

-- Show swap opportunities for today
SELECT '=== SWAP OPPORTUNITIES FOR TODAY ===' as info;
WITH today_shifts AS (
  SELECT staff_id FROM public.shifts WHERE date = CURRENT_DATE
),
today_staff AS (
  SELECT 
    st.id,
    st.email,
    st.staff_number,
    CASE 
      WHEN ts.staff_id IS NOT NULL THEN 'WORKING'
      ELSE 'OFF'
    END as status
  FROM public.staff st
  LEFT JOIN today_shifts ts ON ts.staff_id = st.id
  WHERE st.base_location = 'Iberia CER'
)
SELECT 
  email,
  staff_number,
  status,
  CASE 
    WHEN status = 'OFF' THEN 'Can cover shifts'
    ELSE 'Cannot cover shifts'
  END as swap_eligibility
FROM today_staff
ORDER BY status DESC, email;
