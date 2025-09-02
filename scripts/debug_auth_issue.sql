-- Debug script for authentication issue
-- When logging in as adham.fati.el.hamzaouy@ba.com, it shows shaheenamin09@ba.com

-- 1. Check auth.users table for both emails
SELECT '=== AUTH.USERS TABLE ===' as info;
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    updated_at
FROM auth.users 
WHERE email IN ('adham.fati.el.hamzaouy@ba.com', 'shaheenamin09@ba.com')
ORDER BY email;

-- 2. Check public.staff table for both emails
SELECT '=== PUBLIC.STAFF TABLE ===' as info;
SELECT 
    id,
    staff_number,
    email,
    base_location,
    can_work_doubles,
    created_at
FROM public.staff 
WHERE email IN ('adham.fati.el.hamzaouy@ba.com', 'shaheenamin09@ba.com')
ORDER BY email;

-- 3. Check if there are any staff records with wrong email assignments
SELECT '=== STAFF RECORDS WITH WRONG EMAILS ===' as info;
SELECT 
    id,
    staff_number,
    email,
    base_location
FROM public.staff 
WHERE staff_number IN ('1234567890', '254575')
ORDER BY staff_number;

-- 4. Check which staff records have shifts
SELECT '=== STAFF RECORDS WITH SHIFTS ===' as info;
SELECT DISTINCT
    st.id,
    st.staff_number,
    st.email,
    COUNT(s.id) as shift_count
FROM public.staff st
LEFT JOIN public.shifts s ON st.id = s.staff_id
WHERE st.staff_number IN ('1234567890', '254575')
GROUP BY st.id, st.staff_number, st.email
ORDER BY st.staff_number;

-- 5. Check September 15th shifts
SELECT '=== SEPTEMBER 15TH SHIFTS ===' as info;
SELECT 
    s.id,
    s.staff_id,
    st.staff_number,
    st.email,
    s.date,
    s.time,
    s.is_swapped,
    s.created_at
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE s.date = '2025-09-15'
ORDER BY st.staff_number;

-- 6. Check swap requests to understand the relationship
SELECT '=== SWAP REQUESTS INVOLVING THESE STAFF ===' as info;
SELECT 
    sr.id,
    sr.status,
    sr.created_at,
    rs.staff_number as requester_staff,
    rs.email as requester_email,
    acs.staff_number as accepter_staff,
    acs.email as accepter_email,
    rshift.date as requester_shift_date,
    rshift.time as requester_shift_time
FROM public.swap_requests sr
LEFT JOIN public.staff rs ON sr.requester_id = rs.id
LEFT JOIN public.staff acs ON sr.accepter_id = acs.id
LEFT JOIN public.shifts rshift ON sr.requester_shift_id = rshift.id
WHERE (rs.staff_number IN ('1234567890', '254575') OR acs.staff_number IN ('1234567890', '254575'))
AND sr.status = 'accepted'
ORDER BY sr.created_at DESC;
