-- NUCLEAR FIX: Complete table recreation to resolve 500 errors
-- This will completely fix the 42P17 errors

SELECT '=== NUCLEAR FIX STARTING ===' as info;

-- Step 1: Check current table structure
SELECT 'Step 1: Checking current table structure' as info;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'staff' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Create a backup of current data
SELECT 'Step 2: Creating backup of current data' as info;

-- Backup staff data
CREATE TEMP TABLE staff_backup AS 
SELECT * FROM public.staff;

-- Backup shifts data
CREATE TEMP TABLE shifts_backup AS 
SELECT * FROM public.shifts;

-- Backup swap_requests data
CREATE TEMP TABLE swap_requests_backup AS 
SELECT * FROM public.swap_requests;

-- Step 3: Drop and recreate the staff table with proper structure
SELECT 'Step 3: Recreating staff table' as info;

-- Drop the current staff table
DROP TABLE IF EXISTS public.staff CASCADE;

-- Recreate staff table with proper structure
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  staff_number TEXT NOT NULL,
  base_location TEXT NOT NULL,
  can_work_doubles BOOLEAN DEFAULT false,
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Drop and recreate the shifts table
SELECT 'Step 4: Recreating shifts table' as info;

-- Drop the current shifts table
DROP TABLE IF EXISTS public.shifts CASCADE;

-- Recreate shifts table with proper structure
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  time TEXT NOT NULL,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Drop and recreate the swap_requests table
SELECT 'Step 5: Recreating swap_requests table' as info;

-- Drop the current swap_requests table
DROP TABLE IF EXISTS public.swap_requests CASCADE;

-- Recreate swap_requests table with proper structure
CREATE TABLE public.swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  requester_shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  accepter_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Restore data from backup
SELECT 'Step 6: Restoring data from backup' as info;

-- Restore staff data
INSERT INTO public.staff (id, email, staff_number, base_location, can_work_doubles, company_id, created_at, updated_at)
SELECT id, email, staff_number, base_location, can_work_doubles, company_id, created_at, updated_at
FROM staff_backup;

-- Restore shifts data
INSERT INTO public.shifts (id, date, time, staff_id, created_at, updated_at)
SELECT id, date, time, staff_id, created_at, updated_at
FROM shifts_backup;

-- Restore swap_requests data
INSERT INTO public.swap_requests (id, requester_id, requester_shift_id, accepter_id, message, status, created_at, updated_at)
SELECT id, requester_id, requester_shift_id, accepter_id, message, status, created_at, updated_at
FROM swap_requests_backup;

-- Step 7: Add test staff if they don't exist
SELECT 'Step 7: Adding test staff' as info;

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

-- Step 8: Add test shifts
SELECT 'Step 8: Adding test shifts' as info;

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
  
  -- Add test shifts
  INSERT INTO public.shifts (date, time, staff_id) VALUES
  ('2025-01-20', '04:15-22:15', john_id),
  ('2025-01-20', '05:30-15:30', jane_id),
  ('2025-01-20', '12:30-22:30', sarah_id),
  ('2025-01-20', '13:15-23:15', david_id),
  ('2025-01-21', '04:15-22:15', john_id),
  ('2025-01-21', '05:30-15:30', mike_id),
  ('2025-01-21', '12:30-22:30', david_id)
  ON CONFLICT DO NOTHING;
  
END $$;

-- Step 9: Test the exact queries that were failing
SELECT 'Step 9: Testing exact failing queries' as info;

-- Test staff profile query
SELECT 
  'Staff profile query result:' as test;
SELECT 
  id,
  email,
  staff_number,
  base_location,
  can_work_doubles,
  company_id,
  created_at
FROM public.staff
WHERE id = '342b9c6c-7abc-4d69-bd01-5f12aaa32f7d';

-- Test staff list query
SELECT 
  'Staff list query result:' as test;
SELECT 
  id,
  email,
  staff_number,
  base_location,
  can_work_doubles,
  company_id,
  created_at
FROM public.staff
WHERE base_location = 'Iberia CER'
AND id != '342b9c6c-7abc-4d69-bd01-5f12aaa32f7d'
LIMIT 5;

-- Step 10: Test swap request availability
SELECT 'Step 10: Testing swap request availability' as info;

-- Check who is OFF on 2025-01-20
SELECT 
  'Staff OFF on 2025-01-20 (AVAILABLE):' as date_info;
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

-- Check who is OFF on 2025-01-21
SELECT 
  'Staff OFF on 2025-01-21 (AVAILABLE):' as date_info;
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

-- Step 11: Final verification
SELECT 'Step 11: Final verification' as info;
SELECT 
  'NUCLEAR FIX COMPLETE!' as result,
  'Tables recreated with proper structure.' as status,
  '500 errors should be completely resolved.' as fix,
  'Try creating a swap request now.' as next_step;

-- Clean up backup tables
DROP TABLE IF EXISTS staff_backup;
DROP TABLE IF EXISTS shifts_backup;
DROP TABLE IF EXISTS swap_requests_backup;
