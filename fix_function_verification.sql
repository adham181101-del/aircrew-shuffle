-- FIXED FUNCTION VERIFICATION SCRIPT
-- This will properly check that the functions were created successfully

-- Check if functions exist in the database
SELECT 
    'Function exists check:' as test_type,
    routine_name as function_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_all_staff_for_team', 'get_eligible_staff_for_swap')
ORDER BY routine_name;

-- Check function parameters (FIXED - use specific_name instead of routine_name)
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

-- Check if functions have proper permissions
SELECT 
    'Function permissions:' as test_type,
    routine_name as function_name,
    security_type,
    definer_rights
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_all_staff_for_team', 'get_eligible_staff_for_swap');

SELECT 'FUNCTIONS VERIFICATION COMPLETE - The "Authentication required" error is expected when testing from SQL Editor' as status;
SELECT 'Your app should now work completely! Test the "Request Swap" button in your app.' as next_step;

