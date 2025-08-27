-- Create auth user for Shaheen Amin
-- This script creates the user in Supabase Auth

-- First, let's check if the user already exists
SELECT 'Checking existing users:' as info;
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'shaheen.amin@ba.com';

-- Create the auth user with proper Supabase Auth structure
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  last_sign_in_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'shaheen.amin@ba.com',
  crypt('testpassword123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  '',
  '{"provider": "email", "providers": ["email"]}',
  '{"staff_number": "123456", "base_location": "Iberia CER", "can_work_doubles": true}',
  false,
  now(),
  null,
  null,
  '',
  '',
  '',
  0,
  null,
  '',
  null
) ON CONFLICT (email) DO NOTHING;

-- Get the user ID we just created
DO $$
DECLARE
  user_id UUID;
  ba_company_id UUID;
BEGIN
  -- Get the user ID
  SELECT id INTO user_id 
  FROM auth.users 
  WHERE email = 'shaheen.amin@ba.com';
  
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
    user_id,
    'shaheen.amin@ba.com',
    '123456',
    'Iberia CER',
    true,
    ba_company_id
  ) ON CONFLICT (id) DO NOTHING;
  
  -- Add shifts
  INSERT INTO public.shifts (date, time, staff_id) VALUES
  ('2025-01-20', '04:15-22:15', user_id),
  ('2025-01-21', '05:30-15:30', user_id),
  ('2025-01-22', '12:30-22:30', user_id),
  ('2025-01-23', '13:15-23:15', user_id),
  ('2025-01-24', '04:15-22:15', user_id),
  ('2025-01-25', '05:30-15:30', user_id),
  ('2025-01-26', '12:30-22:30', user_id),
  ('2025-01-27', '13:15-23:15', user_id),
  ('2025-01-28', '04:15-22:15', user_id),
  ('2025-01-29', '05:30-15:30', user_id),
  ('2025-01-30', '12:30-22:30', user_id),
  ('2025-01-31', '04:15-22:15', user_id),
  ('2025-02-01', '13:15-23:15', user_id),
  ('2025-02-02', '05:30-15:30', user_id),
  ('2025-02-03', '12:30-22:30', user_id),
  ('2025-02-04', '04:15-22:15', user_id),
  ('2025-02-05', '13:15-23:15', user_id),
  ('2025-02-06', '05:30-15:30', user_id),
  ('2025-02-07', '12:30-22:30', user_id),
  ('2025-02-08', '04:15-22:15', user_id),
  ('2025-02-09', '13:15-23:15', user_id),
  ('2025-02-10', '05:30-15:30', user_id),
  ('2025-02-11', '12:30-22:30', user_id),
  ('2025-02-12', '04:15-22:15', user_id),
  ('2025-02-13', '13:15-23:15', user_id),
  ('2025-02-14', '05:30-15:30', user_id),
  ('2025-02-15', '12:30-22:30', user_id),
  ('2025-02-16', '04:15-22:15', user_id)
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Successfully created auth user and staff profile for Shaheen Amin';
END $$;

-- Verify everything was created
SELECT 'Final verification:' as info;
SELECT 
  'Auth User:' as type,
  id,
  email,
  email_confirmed_at,
  role
FROM auth.users 
WHERE email = 'shaheen.amin@ba.com';

SELECT 
  'Staff Profile:' as type,
  s.email,
  s.staff_number,
  s.base_location,
  c.name as company_name,
  s.can_work_doubles
FROM public.staff s
JOIN public.companies c ON s.company_id = c.id
WHERE s.email = 'shaheen.amin@ba.com';

SELECT 
  'Shifts Count:' as type,
  COUNT(*) as total_shifts
FROM public.shifts sh
JOIN public.staff s ON sh.staff_id = s.id
WHERE s.email = 'shaheen.amin@ba.com';
