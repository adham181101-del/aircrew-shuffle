-- CHECK ACTUAL TABLE STRUCTURE
-- This will show us the real column names in your tables

-- Check staff table structure
SELECT 
    'staff table columns:' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'staff'
ORDER BY ordinal_position;

-- Check subscriptions table structure
SELECT 
    'subscriptions table columns:' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'subscriptions'
ORDER BY ordinal_position;

-- Check shifts table structure
SELECT 
    'shifts table columns:' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'shifts'
ORDER BY ordinal_position;

-- Check swap_requests table structure
SELECT 
    'swap_requests table columns:' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'swap_requests'
ORDER BY ordinal_position;

