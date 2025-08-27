-- Simple test account creation for Shaheen Amin
-- This bypasses auth.users and creates the account directly

-- First, let's check if British Airways company exists
SELECT 'British Airways Company ID:' as info, id, name, email_domain 
FROM public.companies 
WHERE email_domain = 'ba.com';

-- Create staff profile directly (bypass auth.users)
INSERT INTO public.staff (
  id,
  email,
  staff_number,
  base_location,
  can_work_doubles,
  company_id
) VALUES (
  gen_random_uuid(),
  'shaheen.amin@ba.com',
  '123456',
  'Iberia CER',
  true,
  (SELECT id FROM public.companies WHERE email_domain = 'ba.com')
) ON CONFLICT (email) DO NOTHING;

-- Get the staff ID for shifts
DO $$
DECLARE
  staff_uuid UUID;
BEGIN
  SELECT id INTO staff_uuid FROM public.staff WHERE email = 'shaheen.amin@ba.com';
  
  -- Add random shifts for the next 4 weeks
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
  ('2025-01-27', '13:15-23:15', staff_uuid),
  ('2025-01-28', '04:15-22:15', staff_uuid),
  ('2025-01-29', '05:30-15:30', staff_uuid),
  ('2025-01-30', '12:30-22:30', staff_uuid),
  ('2025-01-31', '04:15-22:15', staff_uuid),
  ('2025-02-01', '13:15-23:15', staff_uuid),
  ('2025-02-02', '05:30-15:30', staff_uuid),

  -- Week 3
  ('2025-02-03', '12:30-22:30', staff_uuid),
  ('2025-02-04', '04:15-22:15', staff_uuid),
  ('2025-02-05', '13:15-23:15', staff_uuid),
  ('2025-02-06', '05:30-15:30', staff_uuid),
  ('2025-02-07', '12:30-22:30', staff_uuid),
  ('2025-02-08', '04:15-22:15', staff_uuid),
  ('2025-02-09', '13:15-23:15', staff_uuid),

  -- Week 4
  ('2025-02-10', '05:30-15:30', staff_uuid),
  ('2025-02-11', '12:30-22:30', staff_uuid),
  ('2025-02-12', '04:15-22:15', staff_uuid),
  ('2025-02-13', '13:15-23:15', staff_uuid),
  ('2025-02-14', '05:30-15:30', staff_uuid),
  ('2025-02-15', '12:30-22:30', staff_uuid),
  ('2025-02-16', '04:15-22:15', staff_uuid)
  ON CONFLICT DO NOTHING;
END $$;

-- Verify the account was created
SELECT 
  'Staff Profile Created Successfully!' as status,
  s.email,
  s.staff_number,
  s.base_location,
  c.name as company_name,
  s.can_work_doubles,
  COUNT(sh.id) as total_shifts
FROM public.staff s
JOIN public.companies c ON s.company_id = c.id
LEFT JOIN public.shifts sh ON s.id = sh.staff_id
WHERE s.email = 'shaheen.amin@ba.com'
GROUP BY s.email, s.staff_number, s.base_location, c.name, s.can_work_doubles;
