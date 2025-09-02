-- Simple check for swap_requests table structure
-- Copy and paste this directly into SQL Editor

-- Check all columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'swap_requests' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check status constraint
SELECT check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'swap_requests_status_check';

-- Check current status values
SELECT DISTINCT status FROM public.swap_requests;
