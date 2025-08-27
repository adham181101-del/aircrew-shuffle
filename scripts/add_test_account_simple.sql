-- Simple test account creation (bypass auth.users)
-- Run this script in Supabase SQL Editor

-- Create staff profile directly
INSERT INTO public.staff (
  id,
  email,
  staff_number,
  base_location,
  can_work_doubles,
  company_id
) VALUES (
  gen_random_uuid(),
  'shaheeen.amin@ba.com',
  '254576',
  'Iberia CER',
  true,
  (SELECT id FROM public.companies WHERE email_domain = 'ba.com')
) ON CONFLICT (email) DO NOTHING;

-- Get the staff ID for shifts
DO $$
DECLARE
  staff_uuid UUID;
BEGIN
  SELECT id INTO staff_uuid FROM public.staff WHERE email = 'shaheeen.amin@ba.com';
  
  -- Add sample shifts for the next few weeks
  INSERT INTO public.shifts (date, time, staff_id) VALUES
  -- Week 1
  ('2025-01-20', '04:15-22:15', staff_uuid),
  ('2025-01-21', '05:30-15:30', staff_uuid),
  ('2025-01-22', '12:30-22:30', staff_uuid),
  ('2025-01-23', '13:15-23:15', staff_uuid),
  ('2025-01-24', '04:15-22:15', staff_uuid),
  ('2025-01-25', '05:30-15:30', staff_uuid),
  ('2025-01-26', '12:30-22:30', staff_uuid),

  -- Week 2
  ('2025-01-27', '04:15-22:15', staff_uuid),
  ('2025-01-28', '05:30-15:30', staff_uuid),
  ('2025-01-29', '12:30-22:30', staff_uuid),
  ('2025-01-30', '13:15-23:15', staff_uuid),
  ('2025-01-31', '04:15-22:15', staff_uuid),
  ('2025-02-01', '05:30-15:30', staff_uuid),
  ('2025-02-02', '12:30-22:30', staff_uuid),

  -- Week 3
  ('2025-02-03', '04:15-22:15', staff_uuid),
  ('2025-02-04', '05:30-15:30', staff_uuid),
  ('2025-02-05', '12:30-22:30', staff_uuid),
  ('2025-02-06', '13:15-23:15', staff_uuid),
  ('2025-02-07', '04:15-22:15', staff_uuid),
  ('2025-02-08', '05:30-15:30', staff_uuid),
  ('2025-02-09', '12:30-22:30', staff_uuid),

  -- Week 4
  ('2025-02-10', '04:15-22:15', staff_uuid),
  ('2025-02-11', '05:30-15:30', staff_uuid),
  ('2025-02-12', '12:30-22:30', staff_uuid),
  ('2025-02-13', '13:15-23:15', staff_uuid),
  ('2025-02-14', '04:15-22:15', staff_uuid),
  ('2025-02-15', '05:30-15:30', staff_uuid),
  ('2025-02-16', '12:30-22:30', staff_uuid)
  ON CONFLICT DO NOTHING;
END $$;

-- Verify the account was created
SELECT 
  'Test Account Created Successfully!' as status,
  s.email,
  s.staff_number,
  s.base_location,
  c.name as company_name,
  COUNT(sh.id) as total_shifts
FROM public.staff s
JOIN public.companies c ON s.company_id = c.id
LEFT JOIN public.shifts sh ON s.id = sh.staff_id
WHERE s.email = 'shaheeen.amin@ba.com'
GROUP BY s.email, s.staff_number, s.base_location, c.name;
