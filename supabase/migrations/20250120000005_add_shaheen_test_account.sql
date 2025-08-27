-- Add test account for Shaheen Amin
-- This account will skip email verification and have random shifts

-- First, create the auth user (skip email verification)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  aud,
  role
) VALUES (
  'shaheen-amin-test-id'::uuid,
  'shaheen.amin@ba.com',
  crypt('testpassword123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"staff_number": "123456", "base_location": "Iberia CER", "can_work_doubles": true, "company_id": "ba-company-id"}'::jsonb,
  false,
  '',
  '',
  '',
  '',
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Get the British Airways company ID
DO $$
DECLARE
  ba_company_id UUID;
  shaheen_staff_id UUID;
BEGIN
  -- Get British Airways company ID
  SELECT id INTO ba_company_id 
  FROM public.companies 
  WHERE email_domain = 'ba.com';
  
  -- Create staff profile
  INSERT INTO public.staff (
    id,
    email,
    staff_number,
    base_location,
    can_work_doubles,
    company_id
  ) VALUES (
    'shaheen-amin-test-id'::uuid,
    'shaheen.amin@ba.com',
    '123456',
    'Iberia CER',
    true,
    ba_company_id
  ) ON CONFLICT (id) DO NOTHING;
  
  -- Get the staff ID for shifts
  shaheen_staff_id := 'shaheen-amin-test-id'::uuid;
  
  -- Add random shifts for the next 4 weeks (January 20 - February 16, 2025)
  INSERT INTO public.shifts (date, time, staff_id) VALUES
  -- Week 1 - Random mix of shifts
  ('2025-01-20', '04:15-22:15', shaheen_staff_id),
  ('2025-01-21', '05:30-15:30', shaheen_staff_id),
  ('2025-01-22', '12:30-22:30', shaheen_staff_id),
  ('2025-01-23', '13:15-23:15', shaheen_staff_id),
  ('2025-01-24', '04:15-22:15', shaheen_staff_id),
  ('2025-01-25', '05:30-15:30', shaheen_staff_id),
  ('2025-01-26', '12:30-22:30', shaheen_staff_id),

  -- Week 2 - Different pattern
  ('2025-01-27', '13:15-23:15', shaheen_staff_id),
  ('2025-01-28', '04:15-22:15', shaheen_staff_id),
  ('2025-01-29', '05:30-15:30', shaheen_staff_id),
  ('2025-01-30', '12:30-22:30', shaheen_staff_id),
  ('2025-01-31', '04:15-22:15', shaheen_staff_id),
  ('2025-02-01', '13:15-23:15', shaheen_staff_id),
  ('2025-02-02', '05:30-15:30', shaheen_staff_id),

  -- Week 3 - More variety
  ('2025-02-03', '12:30-22:30', shaheen_staff_id),
  ('2025-02-04', '04:15-22:15', shaheen_staff_id),
  ('2025-02-05', '13:15-23:15', shaheen_staff_id),
  ('2025-02-06', '05:30-15:30', shaheen_staff_id),
  ('2025-02-07', '12:30-22:30', shaheen_staff_id),
  ('2025-02-08', '04:15-22:15', shaheen_staff_id),
  ('2025-02-09', '13:15-23:15', shaheen_staff_id),

  -- Week 4 - Final week
  ('2025-02-10', '05:30-15:30', shaheen_staff_id),
  ('2025-02-11', '12:30-22:30', shaheen_staff_id),
  ('2025-02-12', '04:15-22:15', shaheen_staff_id),
  ('2025-02-13', '13:15-23:15', shaheen_staff_id),
  ('2025-02-14', '05:30-15:30', shaheen_staff_id),
  ('2025-02-15', '12:30-22:30', shaheen_staff_id),
  ('2025-02-16', '04:15-22:15', shaheen_staff_id)
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Successfully created test account for Shaheen Amin with 28 random shifts';
END $$;

-- Verify the account was created
SELECT 
  'Test Account Created Successfully!' as status,
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
