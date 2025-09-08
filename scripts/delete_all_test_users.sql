-- Delete all test users from the database
-- This script will remove all test accounts while preserving your main account

-- First, let's see what users we have
SELECT 
  s.id,
  s.staff_number,
  s.email,
  s.base_location,
  s.created_at
FROM public.staff s
ORDER BY s.created_at;

-- Delete all shifts for test users (this will cascade delete related data)
DELETE FROM public.shifts 
WHERE staff_id IN (
  SELECT id FROM public.staff 
  WHERE staff_number IN (
    '123001', '123002', '123003', '123004', '123005', '1234567890'
  )
);

-- Delete all swap requests for test users
DELETE FROM public.swap_requests 
WHERE requester_id IN (
  SELECT id FROM public.staff 
  WHERE staff_number IN (
    '123001', '123002', '123003', '123004', '123005', '1234567890'
  )
) OR accepter_id IN (
  SELECT id FROM public.staff 
  WHERE staff_number IN (
    '123001', '123002', '123003', '123004', '123005', '1234567890'
  )
);

-- Delete all audit logs for test users (if any exist)
DELETE FROM public.audit_logs 
WHERE user_id IN (
  SELECT id FROM public.staff 
  WHERE staff_number IN (
    '123001', '123002', '123003', '123004', '123005', '1234567890'
  )
);

-- Delete the test staff records
DELETE FROM public.staff 
WHERE staff_number IN (
  '123001', '123002', '123003', '123004', '123005', '1234567890'
);

-- Delete the test auth users
DELETE FROM auth.users 
WHERE email IN (
  'john.doe@ba.com',
  'jane.smith@ba.com', 
  'mike.jones@ba.com',
  'sarah.wilson@ba.com',
  'david.brown@ba.com',
  'shaheenamin09@ba.com'
);

-- Verify the cleanup
SELECT 
  'Remaining staff count:' as info,
  COUNT(*) as count
FROM public.staff;

SELECT 
  'Remaining shifts count:' as info,
  COUNT(*) as count
FROM public.shifts;

SELECT 
  'Remaining swap requests count:' as info,
  COUNT(*) as count
FROM public.swap_requests;

-- Show remaining staff (should only be your main account)
SELECT 
  s.id,
  s.staff_number,
  s.email,
  s.base_location,
  s.created_at
FROM public.staff s
ORDER BY s.created_at;
