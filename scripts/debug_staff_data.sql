-- Debug script to check staff data and availability
-- Run this in Supabase SQL Editor to see what's happening

-- First, let's see all staff in the database
SELECT 'All staff in database:' as info;
SELECT 
  id,
  email,
  staff_number,
  base_location,
  can_work_doubles,
  created_at
FROM public.staff
ORDER BY base_location, email;

-- Check how many staff are at each base location
SELECT 'Staff count by base location:' as info;
SELECT 
  base_location,
  COUNT(*) as staff_count
FROM public.staff
GROUP BY base_location
ORDER BY staff_count DESC;

-- Check if there are any staff at Iberia CER specifically
SELECT 'Staff at Iberia CER:' as info;
SELECT 
  id,
  email,
  staff_number,
  base_location,
  can_work_doubles
FROM public.staff
WHERE base_location = 'Iberia CER'
ORDER BY email;

-- Check shifts for a specific date (replace with your date)
SELECT 'Shifts on 2025-01-20 (example date):' as info;
SELECT 
  s.date,
  s.time,
  st.email,
  st.staff_number,
  st.base_location
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE s.date = '2025-01-20'
ORDER BY st.base_location, s.time;

-- Check who is OFF on a specific date
SELECT 'Staff who are OFF on 2025-01-20:' as info;
SELECT 
  st.email,
  st.staff_number,
  st.base_location,
  st.can_work_doubles
FROM public.staff st
WHERE st.base_location = 'Iberia CER'
AND NOT EXISTS (
  SELECT 1 FROM public.shifts s 
  WHERE s.staff_id = st.id 
  AND s.date = '2025-01-20'
)
ORDER BY st.email;

-- Check who is WORKING on a specific date
SELECT 'Staff who are WORKING on 2025-01-20:' as info;
SELECT 
  st.email,
  st.staff_number,
  st.base_location,
  s.time as shift_time
FROM public.staff st
JOIN public.shifts s ON s.staff_id = st.id
WHERE st.base_location = 'Iberia CER'
AND s.date = '2025-01-20'
ORDER BY s.time;

-- Test the RLS policies
SELECT 'Testing RLS access:' as info;
SELECT 
  'Can view all staff:' as test,
  COUNT(*) as count
FROM public.staff;

-- Check if there are any staff at all
SELECT 'Total staff count:' as info;
SELECT COUNT(*) as total_staff FROM public.staff;
