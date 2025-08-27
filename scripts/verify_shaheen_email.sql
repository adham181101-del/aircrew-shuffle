-- Manually verify Shaheen's email address
-- This will allow login without email verification

-- First, check if the user exists
SELECT 'Checking if Shaheen exists:' as info;
SELECT id, email, email_confirmed_at, created_at, role
FROM auth.users 
WHERE email = 'shaheen.amin@ba.com';

-- Update the user to mark email as confirmed
UPDATE auth.users 
SET 
  email_confirmed_at = now(),
  updated_at = now(),
  aud = 'authenticated',
  role = 'authenticated'
WHERE email = 'shaheen.amin@ba.com';

-- Verify the update worked
SELECT 'After email verification:' as info;
SELECT id, email, email_confirmed_at, created_at, role, aud
FROM auth.users 
WHERE email = 'shaheen.amin@ba.com';

-- Also check if staff profile exists
SELECT 'Staff profile check:' as info;
SELECT s.email, s.staff_number, s.base_location, c.name as company_name, s.can_work_doubles
FROM public.staff s
JOIN public.companies c ON s.company_id = c.id
WHERE s.email = 'shaheen.amin@ba.com';

-- Check shifts count
SELECT 'Shifts count:' as info;
SELECT COUNT(*) as total_shifts
FROM public.shifts sh
JOIN public.staff s ON sh.staff_id = s.id
WHERE s.email = 'shaheen.amin@ba.com';

-- If user doesn't exist, create them
DO $$
DECLARE
  user_exists BOOLEAN;
  user_id UUID;
  ba_company_id UUID;
BEGIN
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'shaheen.amin@ba.com') INTO user_exists;
  
  IF NOT user_exists THEN
    RAISE NOTICE 'User does not exist, creating new user...';
    
    -- Create the auth user
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
    );
    
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
    
    RAISE NOTICE 'Successfully created and verified user for Shaheen Amin';
  ELSE
    RAISE NOTICE 'User already exists, email has been verified';
  END IF;
END $$;

-- Final verification
SELECT 'Final verification - User can now login:' as info;
SELECT 
  'Login Details:' as type,
  'Email: shaheen.amin@ba.com' as email,
  'Password: testpassword123' as password,
  'Email Verified: ' || CASE WHEN email_confirmed_at IS NOT NULL THEN 'YES' ELSE 'NO' END as verified,
  'Role: ' || role as role
FROM auth.users 
WHERE email = 'shaheen.amin@ba.com';
