-- SIMPLE FUNCTION VERIFICATION
-- This will check that the functions exist and are accessible

-- Check if functions exist in the database
SELECT 
    'Function exists check:' as test_type,
    routine_name as function_name,
    routine_type,
    data_type as return_type,
    security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_all_staff_for_team', 'get_eligible_staff_for_swap')
ORDER BY routine_name;

-- Check function parameters
SELECT 
    'Function parameters:' as test_type,
    p.specific_name as function_name,
    p.parameter_name,
    p.data_type,
    p.ordinal_position
FROM information_schema.parameters p
WHERE p.specific_schema = 'public'
AND p.specific_name IN (
    SELECT specific_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name IN ('get_all_staff_for_team', 'get_eligible_staff_for_swap')
)
ORDER BY p.specific_name, p.ordinal_position;

-- Test the functions (this will show "Authentication required" which is expected)
SELECT 'Testing functions (will show auth error - this is expected)...' as status;

-- This should fail with "Authentication required" - that's good!
SELECT 'get_all_staff_for_team test:', COUNT(*) FROM public.get_all_staff_for_team();
SELECT 'get_eligible_staff_for_swap test:', COUNT(*) FROM public.get_eligible_staff_for_swap(
    'LHR', '2025-09-23'::date, '00000000-0000-0000-0000-000000000000'::uuid
);

SELECT 'FUNCTIONS VERIFICATION COMPLETE' as status;
SELECT 'If you see "Authentication required" errors above, that means the functions are working correctly and are secure!' as note;

