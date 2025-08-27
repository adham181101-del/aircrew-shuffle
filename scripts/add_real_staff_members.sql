-- Add real staff members to the database for swap requests
-- This ensures actual staff like Shaheen show up in the swap request functionality

SELECT '=== ADDING REAL STAFF MEMBERS FOR SWAP REQUESTS ===' as info;

-- First, let's check what staff currently exist
SELECT '=== CURRENT STAFF IN DATABASE ===' as info;
SELECT 
  id,
  email,
  staff_number,
  base_location,
  can_work_doubles,
  created_at
FROM public.staff
ORDER BY email;

-- Add Shaheen Amin as a real staff member
SELECT '=== ADDING SHAHEEN AMIN ===' as info;

-- Check if Shaheen already exists
DO $$
DECLARE
  shaheen_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.staff WHERE email = 'shaheenamin09@ba.com') INTO shaheen_exists;
  
  IF NOT shaheen_exists THEN
    INSERT INTO public.staff (
      id,
      email,
      staff_number,
      base_location,
      can_work_doubles,
      company_id,
      created_at
    ) VALUES (
      gen_random_uuid(),
      'shaheenamin09@ba.com',
      '254576',
      'Iberia CER',
      true,
      (SELECT id FROM public.companies WHERE name = 'British Airways' LIMIT 1),
      NOW()
    );
    RAISE NOTICE 'Added Shaheen Amin to staff table';
  ELSE
    RAISE NOTICE 'Shaheen Amin already exists in staff table';
  END IF;
END $$;

-- Add more real staff members for testing swap requests
SELECT '=== ADDING ADDITIONAL STAFF MEMBERS ===' as info;

-- Add John Doe
DO $$
DECLARE
  john_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.staff WHERE email = 'john.doe@ba.com') INTO john_exists;
  
  IF NOT john_exists THEN
    INSERT INTO public.staff (
      id,
      email,
      staff_number,
      base_location,
      can_work_doubles,
      company_id,
      created_at
    ) VALUES (
      gen_random_uuid(),
      'john.doe@ba.com',
      '123001',
      'Iberia CER',
      true,
      (SELECT id FROM public.companies WHERE name = 'British Airways' LIMIT 1),
      NOW()
    );
    RAISE NOTICE 'Added John Doe to staff table';
  ELSE
    RAISE NOTICE 'John Doe already exists in staff table';
  END IF;
END $$;

-- Add Jane Smith
DO $$
DECLARE
  jane_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.staff WHERE email = 'jane.smith@ba.com') INTO jane_exists;
  
  IF NOT jane_exists THEN
    INSERT INTO public.staff (
      id,
      email,
      staff_number,
      base_location,
      can_work_doubles,
      company_id,
      created_at
    ) VALUES (
      gen_random_uuid(),
      'jane.smith@ba.com',
      '123002',
      'Iberia CER',
      false,
      (SELECT id FROM public.companies WHERE name = 'British Airways' LIMIT 1),
      NOW()
    );
    RAISE NOTICE 'Added Jane Smith to staff table';
  ELSE
    RAISE NOTICE 'Jane Smith already exists in staff table';
  END IF;
END $$;

-- Add Mike Jones
DO $$
DECLARE
  mike_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.staff WHERE email = 'mike.jones@ba.com') INTO mike_exists;
  
  IF NOT mike_exists THEN
    INSERT INTO public.staff (
      id,
      email,
      staff_number,
      base_location,
      can_work_doubles,
      company_id,
      created_at
    ) VALUES (
      gen_random_uuid(),
      'mike.jones@ba.com',
      '123003',
      'Iberia CER',
      true,
      (SELECT id FROM public.companies WHERE name = 'British Airways' LIMIT 1),
      NOW()
    );
    RAISE NOTICE 'Added Mike Jones to staff table';
  ELSE
    RAISE NOTICE 'Mike Jones already exists in staff table';
  END IF;
END $$;

-- Add Sarah Wilson
DO $$
DECLARE
  sarah_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.staff WHERE email = 'sarah.wilson@ba.com') INTO sarah_exists;
  
  IF NOT sarah_exists THEN
    INSERT INTO public.staff (
      id,
      email,
      staff_number,
      base_location,
      can_work_doubles,
      company_id,
      created_at
    ) VALUES (
      gen_random_uuid(),
      'sarah.wilson@ba.com',
      '123004',
      'Iberia CER',
      false,
      (SELECT id FROM public.companies WHERE name = 'British Airways' LIMIT 1),
      NOW()
    );
    RAISE NOTICE 'Added Sarah Wilson to staff table';
  ELSE
    RAISE NOTICE 'Sarah Wilson already exists in staff table';
  END IF;
END $$;

-- Add David Brown
DO $$
DECLARE
  david_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.staff WHERE email = 'david.brown@ba.com') INTO david_exists;
  
  IF NOT david_exists THEN
    INSERT INTO public.staff (
      id,
      email,
      staff_number,
      base_location,
      can_work_doubles,
      company_id,
      created_at
    ) VALUES (
      gen_random_uuid(),
      'david.brown@ba.com',
      '123005',
      'Iberia CER',
      true,
      (SELECT id FROM public.companies WHERE name = 'British Airways' LIMIT 1),
      NOW()
    );
    RAISE NOTICE 'Added David Brown to staff table';
  ELSE
    RAISE NOTICE 'David Brown already exists in staff table';
  END IF;
END $$;

-- Show updated staff list
SELECT '=== UPDATED STAFF LIST ===' as info;
SELECT 
  id,
  email,
  staff_number,
  base_location,
  can_work_doubles,
  created_at
FROM public.staff
ORDER BY email;

-- Show staff count by base location
SELECT '=== STAFF COUNT BY BASE LOCATION ===' as info;
SELECT 
  base_location,
  COUNT(*) as staff_count
FROM public.staff
GROUP BY base_location
ORDER BY staff_count DESC;

-- Show staff at Iberia CER (where swap requests will look)
SELECT '=== STAFF AT IBERIA CER ===' as info;
SELECT 
  email,
  staff_number,
  can_work_doubles,
  created_at
FROM public.staff
WHERE base_location = 'Iberia CER'
ORDER BY email;
