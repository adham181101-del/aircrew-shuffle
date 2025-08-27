-- IMMEDIATE FIX: Add test staff and ensure swap requests work
-- Run this after the RLS fix

-- First, let's add test staff accounts
INSERT INTO public.staff (
  id,
  email,
  staff_number,
  base_location,
  can_work_doubles,
  company_id
) VALUES 
-- Test staff for Iberia CER
(gen_random_uuid(), 'john.doe@ba.com', '123001', 'Iberia CER', true, (SELECT id FROM public.companies WHERE email_domain = 'ba.com')),
(gen_random_uuid(), 'jane.smith@ba.com', '123002', 'Iberia CER', false, (SELECT id FROM public.companies WHERE email_domain = 'ba.com')),
(gen_random_uuid(), 'mike.jones@ba.com', '123003', 'Iberia CER', true, (SELECT id FROM public.companies WHERE email_domain = 'ba.com')),
(gen_random_uuid(), 'sarah.wilson@ba.com', '123004', 'Iberia CER', false, (SELECT id FROM public.companies WHERE email_domain = 'ba.com')),
(gen_random_uuid(), 'david.brown@ba.com', '123005', 'Iberia CER', true, (SELECT id FROM public.companies WHERE email_domain = 'ba.com'))

ON CONFLICT (email) DO NOTHING;

-- Now let's add test shifts with clear availability
DO $$
DECLARE
  john_id UUID;
  jane_id UUID;
  mike_id UUID;
  sarah_id UUID;
  david_id UUID;
BEGIN
  -- Get the staff IDs
  SELECT id INTO john_id FROM public.staff WHERE email = 'john.doe@ba.com';
  SELECT id INTO jane_id FROM public.staff WHERE email = 'jane.smith@ba.com';
  SELECT id INTO mike_id FROM public.staff WHERE email = 'mike.jones@ba.com';
  SELECT id INTO sarah_id FROM public.staff WHERE email = 'sarah.wilson@ba.com';
  SELECT id INTO david_id FROM public.staff WHERE email = 'david.brown@ba.com';
  
  -- Add test shifts with clear availability pattern
  -- 2025-01-20: John, Jane, Sarah, David working; Mike OFF (available for swaps)
  INSERT INTO public.shifts (date, time, staff_id) VALUES
  ('2025-01-20', '04:15-22:15', john_id),
  ('2025-01-20', '05:30-15:30', jane_id),
  ('2025-01-20', '12:30-22:30', sarah_id),
  ('2025-01-20', '13:15-23:15', david_id)
  ON CONFLICT DO NOTHING;
  
  -- 2025-01-21: John, Mike, David working; Jane, Sarah OFF (available for swaps)
  INSERT INTO public.shifts (date, time, staff_id) VALUES
  ('2025-01-21', '04:15-22:15', john_id),
  ('2025-01-21', '05:30-15:30', mike_id),
  ('2025-01-21', '12:30-22:30', david_id)
  ON CONFLICT DO NOTHING;
  
  -- 2025-01-22: John, Mike, David working; Jane, Sarah OFF (available for swaps)
  INSERT INTO public.shifts (date, time, staff_id) VALUES
  ('2025-01-22', '04:15-22:15', john_id),
  ('2025-01-22', '05:30-15:30', mike_id),
  ('2025-01-22', '12:30-22:30', david_id)
  ON CONFLICT DO NOTHING;
  
  -- 2025-01-23: Everyone working (no one available)
  INSERT INTO public.shifts (date, time, staff_id) VALUES
  ('2025-01-23', '04:15-22:15', john_id),
  ('2025-01-23', '05:30-15:30', jane_id),
  ('2025-01-23', '12:30-22:30', mike_id),
  ('2025-01-23', '13:15-23:15', sarah_id),
  ('2025-01-23', '04:15-22:15', david_id)
  ON CONFLICT DO NOTHING;
  
END $$;

-- Verify what we created
SELECT '=== TEST STAFF CREATED ===' as info;
SELECT 
  email,
  staff_number,
  base_location,
  can_work_doubles
FROM public.staff
WHERE email IN ('john.doe@ba.com', 'jane.smith@ba.com', 'mike.jones@ba.com', 'sarah.wilson@ba.com', 'david.brown@ba.com')
ORDER BY email;

-- Show who is OFF on 2025-01-20 (Mike should be off - AVAILABLE)
SELECT '=== STAFF OFF ON 2025-01-20 (AVAILABLE FOR SWAPS) ===' as info;
SELECT 
  st.email,
  st.staff_number,
  st.base_location,
  'AVAILABLE' as status
FROM public.staff st
WHERE st.base_location = 'Iberia CER'
AND NOT EXISTS (
  SELECT 1 FROM public.shifts s 
  WHERE s.staff_id = st.id 
  AND s.date = '2025-01-20'
)
ORDER BY st.email;

-- Show who is OFF on 2025-01-21 (Jane and Sarah should be off - AVAILABLE)
SELECT '=== STAFF OFF ON 2025-01-21 (AVAILABLE FOR SWAPS) ===' as info;
SELECT 
  st.email,
  st.staff_number,
  st.base_location,
  'AVAILABLE' as status
FROM public.staff st
WHERE st.base_location = 'Iberia CER'
AND NOT EXISTS (
  SELECT 1 FROM public.shifts s 
  WHERE s.staff_id = st.id 
  AND s.date = '2025-01-21'
)
ORDER BY st.email;

-- Show who is OFF on 2025-01-22 (Jane and Sarah should be off - AVAILABLE)
SELECT '=== STAFF OFF ON 2025-01-22 (AVAILABLE FOR SWAPS) ===' as info;
SELECT 
  st.email,
  st.staff_number,
  st.base_location,
  'AVAILABLE' as status
FROM public.staff st
WHERE st.base_location = 'Iberia CER'
AND NOT EXISTS (
  SELECT 1 FROM public.shifts s 
  WHERE s.staff_id = st.id 
  AND s.date = '2025-01-22'
)
ORDER BY st.email;

-- Show who is OFF on 2025-01-23 (No one should be off - NOT AVAILABLE)
SELECT '=== STAFF OFF ON 2025-01-23 (NOT AVAILABLE FOR SWAPS) ===' as info;
SELECT 
  st.email,
  st.staff_number,
  st.base_location,
  'NOT AVAILABLE' as status
FROM public.staff st
WHERE st.base_location = 'Iberia CER'
AND NOT EXISTS (
  SELECT 1 FROM public.shifts s 
  WHERE s.staff_id = st.id 
  AND s.date = '2025-01-23'
)
ORDER BY st.email;

-- Final test: Total counts
SELECT '=== FINAL COUNTS ===' as info;
SELECT 
  'Total staff at Iberia CER:' as info,
  COUNT(*) as count
FROM public.staff
WHERE base_location = 'Iberia CER';

SELECT 
  'Total shifts in database:' as info,
  COUNT(*) as count
FROM public.shifts;
