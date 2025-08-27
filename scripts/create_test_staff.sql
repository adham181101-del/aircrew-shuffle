-- Create test staff accounts for swap requests
-- This will add some staff who are off on different days

-- First, let's add some test staff accounts
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

-- Now let's add some shifts for these staff (some working, some off on different days)
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
  
  -- Add shifts for John (working most days)
  INSERT INTO public.shifts (date, time, staff_id) VALUES
  ('2025-01-20', '04:15-22:15', john_id),
  ('2025-01-21', '05:30-15:30', john_id),
  ('2025-01-22', '12:30-22:30', john_id),
  ('2025-01-23', '13:15-23:15', john_id),
  ('2025-01-24', '04:15-22:15', john_id),
  ('2025-01-25', '05:30-15:30', john_id),
  ('2025-01-26', '12:30-22:30', john_id),
  ('2025-01-27', '13:15-23:15', john_id),
  ('2025-01-28', '04:15-22:15', john_id),
  ('2025-01-29', '05:30-15:30', john_id),
  ('2025-01-30', '12:30-22:30', john_id),
  ('2025-01-31', '04:15-22:15', john_id),
  ('2025-02-01', '13:15-23:15', john_id),
  ('2025-02-02', '05:30-15:30', john_id),
  ('2025-02-03', '12:30-22:30', john_id),
  ('2025-02-04', '04:15-22:15', john_id),
  ('2025-02-05', '13:15-23:15', john_id),
  ('2025-02-06', '05:30-15:30', john_id),
  ('2025-02-07', '12:30-22:30', john_id),
  ('2025-02-08', '04:15-22:15', john_id),
  ('2025-02-09', '13:15-23:15', john_id),
  ('2025-02-10', '05:30-15:30', john_id),
  ('2025-02-11', '12:30-22:30', john_id),
  ('2025-02-12', '04:15-22:15', john_id),
  ('2025-02-13', '13:15-23:15', john_id),
  ('2025-02-14', '05:30-15:30', john_id),
  ('2025-02-15', '12:30-22:30', john_id),
  ('2025-02-16', '04:15-22:15', john_id)
  ON CONFLICT DO NOTHING;
  
  -- Add shifts for Jane (off on some days)
  INSERT INTO public.shifts (date, time, staff_id) VALUES
  ('2025-01-20', '05:30-15:30', jane_id), -- Working
  ('2025-01-21', '12:30-22:30', jane_id), -- Working
  -- 2025-01-22: OFF
  ('2025-01-23', '04:15-22:15', jane_id), -- Working
  ('2025-01-24', '05:30-15:30', jane_id), -- Working
  -- 2025-01-25: OFF
  ('2025-01-26', '13:15-23:15', jane_id), -- Working
  ('2025-01-27', '04:15-22:15', jane_id), -- Working
  -- 2025-01-28: OFF
  ('2025-01-29', '12:30-22:30', jane_id), -- Working
  ('2025-01-30', '05:30-15:30', jane_id), -- Working
  -- 2025-01-31: OFF
  ('2025-02-01', '04:15-22:15', jane_id), -- Working
  ('2025-02-02', '12:30-22:30', jane_id), -- Working
  -- 2025-02-03: OFF
  ('2025-02-04', '05:30-15:30', jane_id), -- Working
  ('2025-02-05', '13:15-23:15', jane_id), -- Working
  -- 2025-02-06: OFF
  ('2025-02-07', '04:15-22:15', jane_id), -- Working
  ('2025-02-08', '12:30-22:30', jane_id), -- Working
  -- 2025-02-09: OFF
  ('2025-02-10', '05:30-15:30', jane_id), -- Working
  ('2025-02-11', '13:15-23:15', jane_id), -- Working
  -- 2025-02-12: OFF
  ('2025-02-13', '04:15-22:15', jane_id), -- Working
  ('2025-02-14', '12:30-22:30', jane_id), -- Working
  -- 2025-02-15: OFF
  ('2025-02-16', '05:30-15:30', jane_id) -- Working
  ON CONFLICT DO NOTHING;
  
  -- Add shifts for Mike (off on different days)
  INSERT INTO public.shifts (date, time, staff_id) VALUES
  -- 2025-01-20: OFF
  ('2025-01-21', '04:15-22:15', mike_id), -- Working
  ('2025-01-22', '05:30-15:30', mike_id), -- Working
  ('2025-01-23', '12:30-22:30', mike_id), -- Working
  -- 2025-01-24: OFF
  ('2025-01-25', '13:15-23:15', mike_id), -- Working
  ('2025-01-26', '04:15-22:15', mike_id), -- Working
  ('2025-01-27', '05:30-15:30', mike_id), -- Working
  -- 2025-01-28: OFF
  ('2025-01-29', '12:30-22:30', mike_id), -- Working
  ('2025-01-30', '04:15-22:15', mike_id), -- Working
  ('2025-01-31', '05:30-15:30', mike_id), -- Working
  -- 2025-02-01: OFF
  ('2025-02-02', '13:15-23:15', mike_id), -- Working
  ('2025-02-03', '04:15-22:15', mike_id), -- Working
  ('2025-02-04', '05:30-15:30', mike_id), -- Working
  -- 2025-02-05: OFF
  ('2025-02-06', '12:30-22:30', mike_id), -- Working
  ('2025-02-07', '04:15-22:15', mike_id), -- Working
  ('2025-02-08', '05:30-15:30', mike_id), -- Working
  -- 2025-02-09: OFF
  ('2025-02-10', '12:30-22:30', mike_id), -- Working
  ('2025-02-11', '04:15-22:15', mike_id), -- Working
  ('2025-02-12', '05:30-15:30', mike_id), -- Working
  -- 2025-02-13: OFF
  ('2025-02-14', '13:15-23:15', mike_id), -- Working
  ('2025-02-15', '04:15-22:15', mike_id), -- Working
  ('2025-02-16', '05:30-15:30', mike_id) -- Working
  ON CONFLICT DO NOTHING;
  
  -- Add shifts for Sarah (off on some days)
  INSERT INTO public.shifts (date, time, staff_id) VALUES
  ('2025-01-20', '12:30-22:30', sarah_id), -- Working
  -- 2025-01-21: OFF
  ('2025-01-22', '04:15-22:15', sarah_id), -- Working
  ('2025-01-23', '05:30-15:30', sarah_id), -- Working
  ('2025-01-24', '12:30-22:30', sarah_id), -- Working
  -- 2025-01-25: OFF
  ('2025-01-26', '04:15-22:15', sarah_id), -- Working
  ('2025-01-27', '05:30-15:30', sarah_id), -- Working
  ('2025-01-28', '12:30-22:30', sarah_id), -- Working
  -- 2025-01-29: OFF
  ('2025-01-30', '04:15-22:15', sarah_id), -- Working
  ('2025-01-31', '05:30-15:30', sarah_id), -- Working
  ('2025-02-01', '12:30-22:30', sarah_id), -- Working
  -- 2025-02-02: OFF
  ('2025-02-03', '04:15-22:15', sarah_id), -- Working
  ('2025-02-04', '05:30-15:30', sarah_id), -- Working
  ('2025-02-05', '12:30-22:30', sarah_id), -- Working
  -- 2025-02-06: OFF
  ('2025-02-07', '04:15-22:15', sarah_id), -- Working
  ('2025-02-08', '05:30-15:30', sarah_id), -- Working
  ('2025-02-09', '12:30-22:30', sarah_id), -- Working
  -- 2025-02-10: OFF
  ('2025-02-11', '04:15-22:15', sarah_id), -- Working
  ('2025-02-12', '05:30-15:30', sarah_id), -- Working
  ('2025-02-13', '12:30-22:30', sarah_id), -- Working
  -- 2025-02-14: OFF
  ('2025-02-15', '04:15-22:15', sarah_id), -- Working
  ('2025-02-16', '05:30-15:30', sarah_id) -- Working
  ON CONFLICT DO NOTHING;
  
  -- Add shifts for David (off on some days)
  INSERT INTO public.shifts (date, time, staff_id) VALUES
  ('2025-01-20', '13:15-23:15', david_id), -- Working
  ('2025-01-21', '04:15-22:15', david_id), -- Working
  ('2025-01-22', '05:30-15:30', david_id), -- Working
  ('2025-01-23', '12:30-22:30', david_id), -- Working
  -- 2025-01-24: OFF
  ('2025-01-25', '04:15-22:15', david_id), -- Working
  ('2025-01-26', '05:30-15:30', david_id), -- Working
  ('2025-01-27', '12:30-22:30', david_id), -- Working
  ('2025-01-28', '04:15-22:15', david_id), -- Working
  -- 2025-01-29: OFF
  ('2025-01-30', '05:30-15:30', david_id), -- Working
  ('2025-01-31', '12:30-22:30', david_id), -- Working
  ('2025-02-01', '04:15-22:15', david_id), -- Working
  ('2025-02-02', '05:30-15:30', david_id), -- Working
  -- 2025-02-03: OFF
  ('2025-02-04', '12:30-22:30', david_id), -- Working
  ('2025-02-05', '04:15-22:15', david_id), -- Working
  ('2025-02-06', '05:30-15:30', david_id), -- Working
  ('2025-02-07', '12:30-22:30', david_id), -- Working
  -- 2025-02-08: OFF
  ('2025-02-09', '04:15-22:15', david_id), -- Working
  ('2025-02-10', '05:30-15:30', david_id), -- Working
  ('2025-02-11', '12:30-22:30', david_id), -- Working
  ('2025-02-12', '04:15-22:15', david_id), -- Working
  -- 2025-02-13: OFF
  ('2025-02-14', '05:30-15:30', david_id), -- Working
  ('2025-02-15', '12:30-22:30', david_id), -- Working
  ('2025-02-16', '04:15-22:15', david_id) -- Working
  ON CONFLICT DO NOTHING;
  
END $$;

-- Verify the test staff were created
SELECT 'Test staff created:' as info;
SELECT 
  email,
  staff_number,
  base_location,
  can_work_doubles
FROM public.staff
WHERE email IN ('john.doe@ba.com', 'jane.smith@ba.com', 'mike.jones@ba.com', 'sarah.wilson@ba.com', 'david.brown@ba.com')
ORDER BY email;

-- Show who is OFF on 2025-01-22 (example date)
SELECT 'Staff OFF on 2025-01-22:' as info;
SELECT 
  st.email,
  st.staff_number,
  st.base_location
FROM public.staff st
WHERE st.base_location = 'Iberia CER'
AND NOT EXISTS (
  SELECT 1 FROM public.shifts s 
  WHERE s.staff_id = st.id 
  AND s.date = '2025-01-22'
)
ORDER BY st.email;
