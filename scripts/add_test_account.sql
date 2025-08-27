-- Add test account for Shaheeen Amin
-- Run this script in Supabase SQL Editor

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
  'shaheeen-amin-id'::uuid,
  'shaheeen.amin@ba.com',
  crypt('testpassword123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"staff_number": "254576", "base_location": "Iberia CER", "can_work_doubles": true}'::jsonb,
  false,
  '',
  '',
  '',
  '',
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Create staff profile
INSERT INTO public.staff (
  id,
  email,
  staff_number,
  base_location,
  can_work_doubles,
  company_id
) VALUES (
  'shaheeen-amin-id'::uuid,
  'shaheeen.amin@ba.com',
  '254576',
  'Iberia CER',
  true,
  (SELECT id FROM public.companies WHERE email_domain = 'ba.com')
) ON CONFLICT (id) DO NOTHING;

-- Add sample shifts for the next few weeks (only if they don't exist)
INSERT INTO public.shifts (date, time, staff_id) VALUES
-- Week 1
('2025-01-20', '04:15-22:15', 'shaheeen-amin-id'::uuid),
('2025-01-21', '05:30-15:30', 'shaheeen-amin-id'::uuid),
('2025-01-22', '12:30-22:30', 'shaheeen-amin-id'::uuid),
('2025-01-23', '13:15-23:15', 'shaheeen-amin-id'::uuid),
('2025-01-24', '04:15-22:15', 'shaheeen-amin-id'::uuid),
('2025-01-25', '05:30-15:30', 'shaheeen-amin-id'::uuid),
('2025-01-26', '12:30-22:30', 'shaheeen-amin-id'::uuid),

-- Week 2
('2025-01-27', '04:15-22:15', 'shaheeen-amin-id'::uuid),
('2025-01-28', '05:30-15:30', 'shaheeen-amin-id'::uuid),
('2025-01-29', '12:30-22:30', 'shaheeen-amin-id'::uuid),
('2025-01-30', '13:15-23:15', 'shaheeen-amin-id'::uuid),
('2025-01-31', '04:15-22:15', 'shaheeen-amin-id'::uuid),
('2025-02-01', '05:30-15:30', 'shaheeen-amin-id'::uuid),
('2025-02-02', '12:30-22:30', 'shaheeen-amin-id'::uuid),

-- Week 3
('2025-02-03', '04:15-22:15', 'shaheeen-amin-id'::uuid),
('2025-02-04', '05:30-15:30', 'shaheeen-amin-id'::uuid),
('2025-02-05', '12:30-22:30', 'shaheeen-amin-id'::uuid),
('2025-02-06', '13:15-23:15', 'shaheeen-amin-id'::uuid),
('2025-02-07', '04:15-22:15', 'shaheeen-amin-id'::uuid),
('2025-02-08', '05:30-15:30', 'shaheeen-amin-id'::uuid),
('2025-02-09', '12:30-22:30', 'shaheeen-amin-id'::uuid),

-- Week 4
('2025-02-10', '04:15-22:15', 'shaheeen-amin-id'::uuid),
('2025-02-11', '05:30-15:30', 'shaheeen-amin-id'::uuid),
('2025-02-12', '12:30-22:30', 'shaheeen-amin-id'::uuid),
('2025-02-13', '13:15-23:15', 'shaheeen-amin-id'::uuid),
('2025-02-14', '04:15-22:15', 'shaheeen-amin-id'::uuid),
('2025-02-15', '05:30-15:30', 'shaheeen-amin-id'::uuid),
('2025-02-16', '12:30-22:30', 'shaheeen-amin-id'::uuid)
ON CONFLICT DO NOTHING;

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
