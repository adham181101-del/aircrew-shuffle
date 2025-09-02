-- Check the status constraint and full table structure
-- Run this in your Supabase SQL Editor

-- Show all columns in swap_requests table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'swap_requests' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check what the status check constraint allows
SELECT 
    cc.constraint_name,
    cc.check_clause
FROM information_schema.check_constraints cc
WHERE cc.constraint_name = 'swap_requests_status_check';

-- Check all check constraints
SELECT 
    cc.constraint_name,
    cc.check_clause
FROM information_schema.check_constraints cc
WHERE cc.constraint_name LIKE '%swap_requests%';

-- Try to see what status values are currently allowed
SELECT DISTINCT status 
FROM public.swap_requests;
