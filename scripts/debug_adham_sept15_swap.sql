-- Debug script to investigate Adham's September 15th swap issue
-- This will help us understand why the accepted swap isn't showing on his calendar

-- 1. Check Adham's user details
SELECT '=== ADHAM USER DETAILS ===' as info;
SELECT id, email, staff_number, base_location, can_work_doubles 
FROM public.staff 
WHERE email LIKE '%adham%' OR staff_number LIKE '%adham%';

-- 2. Check all swap requests involving Adham
SELECT '=== ALL SWAP REQUESTS INVOLVING ADHAM ===' as info;
SELECT 
    sr.id,
    sr.status,
    sr.created_at,
    sr.counter_offer_date,
    -- Requester details
    rs.staff_number as requester_staff_number,
    rs.email as requester_email,
    -- Accepter details  
    acs.staff_number as accepter_staff_number,
    acs.email as accepter_email,
    -- Shift details
    rshift.date as requester_shift_date,
    rshift.time as requester_shift_time,
    ashift.date as accepter_shift_date,
    ashift.time as accepter_shift_time
FROM public.swap_requests sr
LEFT JOIN public.staff rs ON sr.requester_id = rs.id
LEFT JOIN public.staff acs ON sr.accepter_id = acs.id
LEFT JOIN public.shifts rshift ON sr.requester_shift_id = rshift.id
LEFT JOIN public.shifts ashift ON sr.accepter_shift_id = ashift.id
WHERE rs.email LIKE '%adham%' OR acs.email LIKE '%adham%'
ORDER BY sr.created_at DESC;

-- 3. Check Adham's current shifts (including swapped ones)
SELECT '=== ADHAM CURRENT SHIFTS ===' as info;
SELECT 
    s.id,
    s.date,
    s.time,
    s.is_swapped,
    s.created_at
FROM public.shifts s
JOIN public.staff st ON s.staff_id = st.id
WHERE st.email LIKE '%adham%'
ORDER BY s.date ASC;

-- 4. Check specifically for September 15th shifts
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
WHERE s.date = '2024-09-15'
ORDER BY st.staff_number;

-- 5. Check accepted swap requests for September 15th
SELECT '=== ACCEPTED SWAPS FOR SEPT 15 ===' as info;
SELECT 
    sr.id,
    sr.status,
    sr.counter_offer_date,
    rs.staff_number as requester_staff,
    acs.staff_number as accepter_staff,
    rshift.date as requester_date,
    rshift.time as requester_time,
    ashift.date as accepter_date,
    ashift.time as accepter_time
FROM public.swap_requests sr
LEFT JOIN public.staff rs ON sr.requester_id = rs.id
LEFT JOIN public.staff acs ON sr.accepter_id = acs.id
LEFT JOIN public.shifts rshift ON sr.requester_shift_id = rshift.id
LEFT JOIN public.shifts ashift ON sr.accepter_shift_id = ashift.id
WHERE sr.status = 'accepted' 
AND (rshift.date = '2024-09-15' OR ashift.date = '2024-09-15' OR sr.counter_offer_date = '2024-09-15')
ORDER BY sr.created_at DESC;

-- 6. Check if there are any shifts created by the swap execution
SELECT '=== SHIFTS CREATED BY SWAP EXECUTION ===' as info;
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
WHERE s.is_swapped = true
AND s.created_at > '2024-09-01'
ORDER BY s.created_at DESC;

-- 7. Check recent swap request activity
SELECT '=== RECENT SWAP ACTIVITY ===' as info;
SELECT 
    sr.id,
    sr.status,
    sr.created_at,
    sr.counter_offer_date,
    rs.staff_number as requester,
    acs.staff_number as accepter
FROM public.swap_requests sr
LEFT JOIN public.staff rs ON sr.requester_id = rs.id
LEFT JOIN public.staff acs ON sr.accepter_id = acs.id
WHERE sr.created_at > '2024-09-01'
ORDER BY sr.created_at DESC
LIMIT 10;
