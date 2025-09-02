-- Check constraints on swap_requests table to debug 23514 error
-- Run this in your Supabase SQL Editor

-- Check table structure and constraints
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'swap_requests' 
AND tc.table_schema = 'public';

-- Check column details
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'swap_requests' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if counter_offer_date field exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'swap_requests' 
AND table_schema = 'public'
AND column_name = 'counter_offer_date';

-- Show current swap_requests data
SELECT id, status, requester_id, accepter_id, created_at, counter_offer_date
FROM public.swap_requests
ORDER BY created_at DESC
LIMIT 5;
