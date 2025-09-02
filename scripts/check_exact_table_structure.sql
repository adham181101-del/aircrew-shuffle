-- Check exact table structure to see what columns exist
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

-- Check if counter_offer_date exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'swap_requests' 
AND table_schema = 'public'
AND column_name LIKE '%counter%';

-- Show table constraints
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'swap_requests' 
AND tc.table_schema = 'public';
