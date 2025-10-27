-- Fix: Add user to staff table using a different approach
-- Since auth.uid() returns null in SQL editor, we'll use a manual approach

-- First, let's see what users exist in the auth.users table
SELECT 
    'Auth users' as description,
    id,
    email,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Check existing staff records
SELECT 
    'Existing staff records' as description,
    id,
    email,
    staff_number,
    base_location
FROM public.staff
ORDER BY created_at DESC
LIMIT 10;

-- Check what companies exist
SELECT 
    'Available companies' as description,
    id,
    name,
    email_domain
FROM public.companies
LIMIT 5;

-- Manual approach: Find a user ID from auth.users and add them to staff
-- Replace 'USER_ID_HERE' with an actual user ID from the auth.users query above
-- This is a template - you'll need to replace the placeholder

-- Example: If your user ID is 'aa9bf55c-d223-4093-b5d7-6526583439fb', run this:
/*
INSERT INTO public.staff (
    id,
    email,
    staff_number,
    base_location,
    company_id,
    can_work_doubles
)
VALUES (
    'aa9bf55c-d223-4093-b5d7-6526583439fb',  -- Replace with your actual user ID
    'adham.fati.el.hamzaouy@ba.com',          -- Replace with your email
    'STAFF-001',                              -- Replace with your staff number
    'London',                                 -- Replace with your base location
    (SELECT id FROM public.companies LIMIT 1), -- Uses first company
    true
)
ON CONFLICT (id) DO NOTHING;
*/

-- Alternative: Add all users from auth.users to staff table
INSERT INTO public.staff (
    id,
    email,
    staff_number,
    base_location,
    company_id,
    can_work_doubles
)
SELECT 
    au.id,
    au.email,
    'STAFF-' || substr(au.id::text, 1, 8),
    'London',
    (SELECT id FROM public.companies LIMIT 1),
    true
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.staff s WHERE s.id = au.id
);

-- Verify the insert worked
SELECT 
    'Staff table after insert' as description,
    COUNT(*) as total_staff
FROM public.staff;

-- Check if any shifts are now visible for any user
SELECT 
    'Shifts visibility check' as description,
    COUNT(*) as total_shifts,
    COUNT(DISTINCT staff_id) as users_with_shifts
FROM public.shifts s
WHERE EXISTS (
    SELECT 1 FROM public.staff st WHERE st.id = s.staff_id
);
