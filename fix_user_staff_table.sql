-- Fix: Add current user to staff table so shifts become visible
-- This is the root cause of the visibility issue

-- First, let's see what auth.uid() returns and check existing staff
SELECT 
    'Current auth.uid()' as description,
    auth.uid() as user_id,
    pg_typeof(auth.uid()) as user_id_type;

-- Check existing staff records
SELECT 
    'Existing staff records' as description,
    COUNT(*) as total_staff,
    MIN(id) as first_id,
    MAX(id) as last_id
FROM public.staff;

-- Check what staff records exist
SELECT 
    'Staff table contents' as description,
    id,
    email,
    staff_number,
    base_location
FROM public.staff
ORDER BY created_at DESC
LIMIT 10;

-- Add current user to staff table if they don't exist
-- We'll use a placeholder email and staff number that you can update later
INSERT INTO public.staff (
    id,
    email,
    staff_number,
    base_location,
    company_id,
    can_work_doubles
)
SELECT 
    auth.uid(),
    COALESCE(auth.email(), 'user@example.com'),
    'STAFF-' || substr(auth.uid()::text, 1, 8),
    'London',
    (SELECT id FROM public.companies LIMIT 1),
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.staff WHERE id = auth.uid()
);

-- Verify the insert worked
SELECT 
    'User added to staff table' as description,
    COUNT(*) as matching_staff
FROM public.staff st
WHERE st.id = auth.uid();

-- Now check if shifts are visible
SELECT 
    'Shifts now visible' as description,
    COUNT(*) as visible_shifts
FROM public.shifts s
WHERE s.staff_id = auth.uid();

-- Get user details
SELECT 
    'Current user details' as description,
    id,
    email,
    staff_number,
    base_location
FROM public.staff st
WHERE st.id = auth.uid();
