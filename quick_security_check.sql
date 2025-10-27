-- Quick Security Check - Verify RLS is working
-- This will show you the current security status

-- Check RLS is enabled
SELECT 
    'RLS Status' as check_type,
    tablename,
    CASE WHEN rls_enabled THEN '✅ Enabled' ELSE '❌ Disabled' END as status
FROM (
    SELECT 
        c.relname AS tablename, 
        c.relrowsecurity AS rls_enabled
    FROM pg_class c 
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' 
    AND n.nspname = 'public'
    AND c.relname IN ('companies', 'staff', 'shifts', 'swap_requests', 'subscriptions')
) t
ORDER BY tablename;

-- Check policies are secure (no public access)
SELECT 
    'Policy Security' as check_type,
    tablename,
    policyname,
    CASE 
        WHEN 'public' = ANY(roles) THEN '⚠️  PUBLIC ACCESS (RISKY)'
        WHEN 'authenticated' = ANY(roles) THEN '✅ Authenticated Only'
        WHEN 'service_role' = ANY(roles) THEN '✅ Service Role'
        ELSE '❓ Other'
    END as security_level
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

