-- Final fix for shifts visibility issue
-- This addresses potential type mismatches and RLS issues

-- First, let's see what we're working with
SELECT 
    'Data Type Check' as step,
    'shifts.staff_id type: ' || pg_typeof(staff_id) as shifts_staff_id_type,
    'staff.id type: ' || pg_typeof(id) as staff_id_type,
    'auth.uid() type: ' || pg_typeof(auth.uid()) as auth_uid_type
FROM public.shifts 
LIMIT 1;

-- Check if RLS is causing issues by temporarily disabling it
-- (This is just for testing - we'll re-enable it)
ALTER TABLE public.shifts DISABLE ROW LEVEL SECURITY;

-- Test query without RLS
SELECT 
    'Test without RLS' as test,
    COUNT(*) as total_visible_shifts
FROM public.shifts;

-- Re-enable RLS
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Create a more permissive policy for testing
DROP POLICY IF EXISTS "Users can view their own shifts" ON public.shifts;

-- Try with explicit type casting to handle any type mismatches
CREATE POLICY "Users can view their own shifts" 
ON public.shifts 
FOR SELECT 
TO authenticated 
USING (
    staff_id::text = auth.uid()::text
    OR 
    staff_id = auth.uid()::uuid
);

-- Test the policy
SELECT 
    'Test with new policy' as test,
    COUNT(*) as visible_shifts
FROM public.shifts;

-- Alternative approach: Check if we need to update the data
-- If staff_id is stored as text but should be UUID, or vice versa
SELECT 
    'Data format check' as step,
    COUNT(*) as total_shifts,
    COUNT(CASE WHEN staff_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 END) as uuid_format,
    COUNT(CASE WHEN staff_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 END) as non_uuid_format
FROM public.shifts;
