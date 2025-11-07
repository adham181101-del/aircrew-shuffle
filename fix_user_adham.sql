-- Specific fix for user adham.fati.el.hamzaouy@ba.com
-- This will add the user to the staff table and verify shifts are visible

-- Step 1: Find the user ID for adham.fati.el.hamzaouy@ba.com
SELECT 
    'Finding user ID' as step,
    id,
    email,
    created_at
FROM auth.users
WHERE email = 'adham.fati.el.hamzaouy@ba.com';

-- Step 2: Check if this user exists in staff table
SELECT 
    'Checking if user exists in staff table' as step,
    id,
    email,
    staff_number,
    base_location
FROM public.staff
WHERE email = 'adham.fati.el.hamzaouy@ba.com';

-- Step 3: Add the specific user to staff table
INSERT INTO public.staff (
    id,
    email,
    staff_number,
    base_location,
    company_id,
    can_work_doubles
)
SELECT 
    au.id,
    au.email,
    'STAFF-ADHAM',
    'London',
    (SELECT id FROM public.companies LIMIT 1),
    true
FROM auth.users au
WHERE au.email = 'adham.fati.el.hamzaouy@ba.com'
AND NOT EXISTS (
    SELECT 1 FROM public.staff s WHERE s.id = au.id
);

-- Step 4: Verify the user was added
SELECT 
    'Verifying user was added to staff' as step,
    COUNT(*) as user_in_staff_table
FROM public.staff
WHERE email = 'adham.fati.el.hamzaouy@ba.com';

-- Step 5: Check how many shifts this user has
SELECT 
    'Checking user shifts' as step,
    COUNT(*) as total_shifts,
    MIN(date) as earliest_shift,
    MAX(date) as latest_shift
FROM public.shifts s
JOIN public.staff st ON st.id = s.staff_id
WHERE st.email = 'adham.fati.el.hamzaouy@ba.com';

-- Step 6: Show sample shifts for this user
SELECT 
    'Sample shifts for user' as step,
    s.id,
    s.date,
    s.time,
    s.staff_id,
    st.email as staff_email
FROM public.shifts s
JOIN public.staff st ON st.id = s.staff_id
WHERE st.email = 'adham.fati.el.hamzaouy@ba.com'
ORDER BY s.date DESC
LIMIT 10;

-- Step 7: Test RLS policy - this simulates what the app does
SELECT 
    'RLS Policy Test' as step,
    COUNT(*) as visible_shifts
FROM public.shifts s
WHERE s.staff_id = (SELECT id FROM public.staff WHERE email = 'adham.fati.el.hamzaouy@ba.com');
