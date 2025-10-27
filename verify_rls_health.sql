-- RLS Health Check - Verify security is working
-- This will show you the current state of your RLS policies

SELECT 
    'RLS Status Check' as check_type,
    schemaname,
    tablename,
    rls_enabled,
    CASE 
        WHEN rls_enabled THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as status
FROM (
    SELECT 
        n.nspname AS schemaname, 
        c.relname AS tablename, 
        c.relrowsecurity AS rls_enabled
    FROM pg_class c 
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' 
    AND n.nspname = 'public'
    AND c.relname IN ('companies', 'staff', 'shifts', 'swap_requests', 'subscriptions')
) t
ORDER BY tablename;

-- Check policies
SELECT 
    'Policy Check' as check_type,
    tablename,
    policyname,
    cmd as operation,
    CASE 
        WHEN roles IS NULL THEN 'All Roles'
        WHEN 'public' = ANY(roles) THEN 'Public Role (RISKY)'
        WHEN 'authenticated' = ANY(roles) THEN 'Authenticated Only (GOOD)'
        WHEN 'service_role' = ANY(roles) THEN 'Service Role (GOOD)'
        ELSE 'Other'
    END as access_level
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
