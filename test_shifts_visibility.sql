-- Test script to check shifts visibility and RLS policies
-- Run this after fixing RLS policies to verify everything works

-- Check if RLS is enabled on shifts table
SELECT 
    'shifts' as table_name,
    rowsecurity as rls_enabled,
    hasrls
FROM pg_tables 
WHERE tablename = 'shifts';

-- Check all RLS policies on shifts table
SELECT 
    'shifts' as table_name,
    policyname,
    cmd as operation,
    roles,
    CASE WHEN qual IS NOT NULL THEN 'Has USING clause' ELSE 'No USING clause' END as using_clause,
    CASE WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause' ELSE 'No WITH CHECK clause' END as with_check_clause
FROM pg_policies 
WHERE tablename = 'shifts'
ORDER BY cmd, policyname;

-- Check if there are any shifts in the database (without RLS filtering)
-- Note: This will only work if run with service role key, not anon key
SELECT 
    'Total shifts in database' as description,
    COUNT(*) as count
FROM public.shifts;

-- Check shifts by user (this will be filtered by RLS)
SELECT 
    'Shifts visible to current user' as description,
    COUNT(*) as count,
    staff_id
FROM public.shifts 
GROUP BY staff_id;

-- Check recent shifts
SELECT 
    'Recent shifts' as description,
    id,
    date,
    time,
    staff_id,
    created_at
FROM public.shifts 
ORDER BY created_at DESC 
LIMIT 10;

-- Test query that simulates what the app does
SELECT 
    'App query simulation' as description,
    s.id,
    s.date,
    s.time,
    s.staff_id,
    s.is_swapped,
    s.created_at
FROM public.shifts s
WHERE s.staff_id = auth.uid()::text
ORDER BY s.date ASC
LIMIT 20;
