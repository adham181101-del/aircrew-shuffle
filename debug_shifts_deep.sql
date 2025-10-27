-- Deep debugging script to identify why shifts aren't visible
-- Let's check the actual data types and user IDs

-- Check the actual data types in shifts table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'shifts' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check the actual data types in staff table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'staff' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check what auth.uid() actually returns
SELECT 
    'Current auth.uid()' as description,
    auth.uid() as user_id,
    pg_typeof(auth.uid()) as user_id_type;

-- Check a few sample shifts to see the actual staff_id format
SELECT 
    'Sample shifts data' as description,
    id,
    staff_id,
    pg_typeof(staff_id) as staff_id_type,
    date,
    time,
    created_at
FROM public.shifts 
LIMIT 5;

-- Check a few sample staff records
SELECT 
    'Sample staff data' as description,
    id,
    pg_typeof(id) as id_type,
    email,
    staff_number
FROM public.staff 
LIMIT 5;

-- Check if there are any shifts that match current user
SELECT 
    'Shifts for current user' as description,
    COUNT(*) as matching_shifts
FROM public.shifts s
WHERE s.staff_id = auth.uid();

-- Check if current user exists in staff table
SELECT 
    'Current user in staff table' as description,
    COUNT(*) as matching_staff
FROM public.staff st
WHERE st.id = auth.uid();

-- Check RLS status
SELECT 
    'RLS Status' as description,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('shifts', 'staff')
AND schemaname = 'public';

-- Check existing policies
SELECT 
    'Existing Policies' as description,
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename IN ('shifts', 'staff')
AND schemaname = 'public';
