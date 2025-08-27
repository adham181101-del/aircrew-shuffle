-- Add sample shifts to staff members for testing swap requests
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

-- Add sample shifts for the next 30 days
-- This will create a pattern where some staff work on certain days and others are off

SELECT '=== ADDING SAMPLE SHIFTS ===' as info;

-- Function to add shifts for a staff member
CREATE OR REPLACE FUNCTION add_sample_shifts_for_staff(
  staff_email TEXT,
  start_date DATE,
  days_to_add INTEGER,
  work_pattern INTEGER[] -- Array of days to work (0-6, where 0=Sunday)
) RETURNS VOID AS $$
DECLARE
  staff_uuid UUID;
  current_date DATE;
  day_of_week INTEGER;
  shift_time TEXT;
BEGIN
  -- Get staff ID
  SELECT id INTO staff_uuid FROM public.staff WHERE email = staff_email;
  
  IF staff_uuid IS NULL THEN
    RAISE NOTICE 'Staff member % not found', staff_email;
    RETURN;
  END IF;
  
  current_date := start_date;
  
  FOR i IN 0..days_to_add-1 LOOP
    day_of_week := EXTRACT(DOW FROM current_date);
    
    -- Check if this staff should work on this day of week
    IF day_of_week = ANY(work_pattern) THEN
      -- Assign a random shift time
      CASE (i % 4)
        WHEN 0 THEN shift_time := '04:15-12:15';
        WHEN 1 THEN shift_time := '12:30-20:30';
        WHEN 2 THEN shift_time := '05:30-13:30';
        WHEN 3 THEN shift_time := '13:15-21:15';
      END CASE;
      
      -- Insert the shift
      INSERT INTO public.shifts (staff_id, date, time, created_at)
      VALUES (staff_uuid, current_date, shift_time, NOW());
      
      RAISE NOTICE 'Added shift for % on %: %', staff_email, current_date, shift_time;
    END IF;
    
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add shifts for each staff member with different patterns
-- Shaheen: Works Monday, Wednesday, Friday (1, 3, 5)
SELECT 'Adding shifts for Shaheen (Mon, Wed, Fri)...' as info;
SELECT add_sample_shifts_for_staff('shaheenamin09@ba.com', CURRENT_DATE, 30, ARRAY[1, 3, 5]);

-- John: Works Tuesday, Thursday, Saturday (2, 4, 6)
SELECT 'Adding shifts for John (Tue, Thu, Sat)...' as info;
SELECT add_sample_shifts_for_staff('john.doe@ba.com', CURRENT_DATE, 30, ARRAY[2, 4, 6]);

-- Jane: Works Monday, Tuesday, Friday (1, 2, 5)
SELECT 'Adding shifts for Jane (Mon, Tue, Fri)...' as info;
SELECT add_sample_shifts_for_staff('jane.smith@ba.com', CURRENT_DATE, 30, ARRAY[1, 2, 5]);

-- Mike: Works Wednesday, Thursday, Sunday (3, 4, 0)
SELECT 'Adding shifts for Mike (Wed, Thu, Sun)...' as info;
SELECT add_sample_shifts_for_staff('mike.jones@ba.com', CURRENT_DATE, 30, ARRAY[3, 4, 0]);

-- Sarah: Works Tuesday, Friday, Saturday (2, 5, 6)
SELECT 'Adding shifts for Sarah (Tue, Fri, Sat)...' as info;
SELECT add_sample_shifts_for_staff('sarah.wilson@ba.com', CURRENT_DATE, 30, ARRAY[2, 5, 6]);

-- David: Works Monday, Thursday, Sunday (1, 4, 0)
SELECT 'Adding shifts for David (Mon, Thu, Sun)...' as info;
SELECT add_sample_shifts_for_staff('david.brown@ba.com', CURRENT_DATE, 30, ARRAY[1, 4, 0]);

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
  AND s.date <= CURRENT_DATE + INTERVAL '7 days'
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

-- Clean up the function
DROP FUNCTION IF EXISTS add_sample_shifts_for_staff(TEXT, DATE, INTEGER, INTEGER[]);
